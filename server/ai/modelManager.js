import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import http from 'http';
import os from 'os';
import { AI_CONFIG } from './aiConfig.js';

class ModelManager {
  constructor() {
    this.process = null;
    this.state = 'unavailable'; // 'ready' | 'loading' | 'busy' | 'unavailable' | 'deterministic_only'
    this.restartAttempts = 0;
    this.activeGenerations = 0;
    this.queueLength = 0;
    this.binaryPath = null;
    this.modelPath = null;
    this.hasAssets = false;
    this.idleTimer = null;

    this.resolveAssetPaths();
    this.registerExitHooks();
  }

  resolveAssetPaths() {
    const { runtimesDir, modelsDir, binaryName } = AI_CONFIG.paths;
    const candidateBinary = path.join(runtimesDir, binaryName);
    const binaryExists = fs.existsSync(candidateBinary);

    const searchOrder = [
      AI_CONFIG.activeModelId,
      ...(AI_CONFIG.preferredModelOrder || [])
    ].filter((v, i, a) => v && a.indexOf(v) === i);

    let selectedProfile = null;
    let selectedModelPath = null;

    for (const modelId of searchOrder) {
      const profile = AI_CONFIG.models[modelId];
      if (!profile) continue;
      const candidatePath = path.join(modelsDir, profile.filename);
      if (fs.existsSync(candidatePath)) {
        selectedProfile = profile;
        selectedModelPath = candidatePath;
        AI_CONFIG.activeModelId = modelId;
        break;
      }
    }

    if (binaryExists && selectedProfile && selectedModelPath) {
      this.binaryPath = candidateBinary;
      this.modelPath = selectedModelPath;
      this.hasAssets = true;
      this.state = 'unavailable';
      console.log(`[AI ModelManager] Selected AI model: ${selectedProfile.name} (${selectedProfile.filename})`);
    } else {
      this.hasAssets = false;
      this.state = 'deterministic_only';
      console.log(`[AI ModelManager] Offline AI assets not detected (Binary: ${binaryExists}, Model: ${Boolean(selectedModelPath)}). Operating in deterministic-only mode.`);
    }
  }

  touchActivity() {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
    const timeoutMs = AI_CONFIG.hardware.idleTimeoutMs || 300000;
    if (timeoutMs > 0) {
      this.idleTimer = setTimeout(() => {
        if (this.process && this.activeGenerations === 0 && this.state === 'ready') {
          console.log('[AI ModelManager] Unloading idle AI sidecar process to free ~1.1 GB RAM...');
          this.stopProcessSync();
        }
      }, timeoutMs);
      if (typeof this.idleTimer.unref === 'function') {
        this.idleTimer.unref();
      }
    }
  }

  registerExitHooks() {
    const cleanup = () => {
      this.stopProcessSync();
    };
    process.on('exit', cleanup);
    process.on('SIGINT', () => {
      cleanup();
      process.exit(0);
    });
    process.on('SIGTERM', () => {
      cleanup();
      process.exit(0);
    });
  }

  async ensureStarted() {
    this.resolveAssetPaths();
    if (!AI_CONFIG.enabled || !this.hasAssets || this.state === 'deterministic_only') {
      return false;
    }

    if (this.state === 'ready' || this.state === 'busy') {
      this.touchActivity();
      return true;
    }

    if (this.state === 'loading') {
      return this.waitForReady();
    }

    this.state = 'loading';
    console.log('[AI ModelManager] Launching embedded AI sidecar process (2 threads, low priority)...');

    const args = [
      '--model', this.modelPath,
      '--host', AI_CONFIG.host,
      '--port', AI_CONFIG.port.toString(),
      '--threads', AI_CONFIG.hardware.cpuThreads.toString(),
      '--threads-batch', AI_CONFIG.hardware.cpuThreads.toString(),
      '--batch-size', (AI_CONFIG.hardware.batchSize || 256).toString(),
      '--ubatch-size', (AI_CONFIG.hardware.ubatchSize || 128).toString(),
      '--ctx-size', AI_CONFIG.hardware.maxContextTokens.toString(),
      '--n-predict', AI_CONFIG.hardware.maxOutputTokens.toString(),
      '--log-disable'
    ];

    try {
      this.process = spawn(this.binaryPath, args, {
        cwd: AI_CONFIG.paths.runtimesDir,
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false
      });

      if (this.process.pid) {
        try {
          os.setPriority(this.process.pid, os.constants.priority.PRIORITY_BELOW_NORMAL);
        } catch (_) {}
      }

      this.process.stderr.on('data', (chunk) => {
        const msg = chunk.toString();
        if (msg.includes('error') || msg.includes('FAIL')) {
          console.error('[AI Sidecar Stderr]:', msg.trim());
        }
      });

      this.process.on('exit', (code, signal) => {
        const wasIntentional = this.process === null;
        this.process = null;
        this.state = this.hasAssets ? 'unavailable' : 'deterministic_only';
        if (!wasIntentional && signal !== 'SIGKILL' && signal !== 'SIGTERM') {
          console.warn(`[AI ModelManager] Sidecar exited unexpectedly (code ${code}, signal ${signal})`);
          this.handleUnexpectedExit();
        }
      });

      const isHealthy = await this.pollHealthCheck(20000);
      if (isHealthy) {
        this.state = 'ready';
        this.restartAttempts = 0;
        this.touchActivity();
        console.log(`[AI ModelManager] Sidecar ready at http://${AI_CONFIG.host}:${AI_CONFIG.port}`);
        return true;
      } else {
        throw new Error('Sidecar process health check timed out during boot.');
      }
    } catch (err) {
      console.error('[AI ModelManager] Failed to start sidecar:', err.message);
      this.stopProcessSync();
      this.state = 'deterministic_only';
      return false;
    }
  }

  async pollHealthCheck(timeoutMs) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      const healthy = await this.checkHealth();
      if (healthy) return true;
      await new Promise((res) => setTimeout(res, 500));
    }
    return false;
  }

  checkHealth() {
    return new Promise((resolve) => {
      const req = http.request(
        {
          host: AI_CONFIG.host,
          port: AI_CONFIG.port,
          path: '/health',
          method: 'GET',
          timeout: 2000
        },
        (res) => {
          resolve(res.statusCode === 200);
        }
      );
      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
      req.end();
    });
  }

  async waitForReady() {
    let attempts = 0;
    while (this.state === 'loading' && attempts < 40) {
      await new Promise((res) => setTimeout(res, 500));
      attempts++;
    }
    return this.state === 'ready';
  }

  async handleUnexpectedExit() {
    if (this.restartAttempts < AI_CONFIG.hardware.maxRestartAttempts && this.hasAssets) {
      this.restartAttempts++;
      await new Promise((res) => setTimeout(res, 2000));
      this.ensureStarted();
    } else {
      this.state = 'deterministic_only';
    }
  }

  stopProcessSync() {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
    if (this.process) {
      const proc = this.process;
      this.process = null;
      try {
        proc.kill('SIGKILL');
      } catch (_) {}
    }
    this.state = this.hasAssets ? 'unavailable' : 'deterministic_only';
  }

  getStatus() {
    return {
      enabled: AI_CONFIG.enabled,
      engine: AI_CONFIG.engine || 'llama.cpp',
      loopbackOnly: AI_CONFIG.host === '127.0.0.1' || AI_CONFIG.host === 'localhost',
      hardwareLimits: {
        threads: AI_CONFIG.hardware.cpuThreads,
        contextTokens: AI_CONFIG.hardware.maxContextTokens
      },
      state: this.state,
      activeModel: AI_CONFIG.activeModelId,
      hasAssets: this.hasAssets,
      activeGenerations: this.activeGenerations,
      queueLength: this.queueLength,
      endpoint: `http://${AI_CONFIG.host}:${AI_CONFIG.port}`
    };
  }
}

export const modelManager = new ModelManager();
