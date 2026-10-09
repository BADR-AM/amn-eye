import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import http from 'http';
import { AI_CONFIG } from './aiConfig.js';

/**
 * Embedded AI Sidecar Process Manager
 *
 * Supervises the local llama-server executable:
 * - Binds STRICTLY to 127.0.0.1 (loopback only)
 * - Restricts memory and threads to match 8GB RAM Intel CPU constraints
 * - Handles health checks, crashes, graceful termination, and lazy startup
 * - Seamless fallback: if binary/model is not installed, system operates in 'deterministic_only' mode.
 */

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

    this.resolveAssetPaths();
    this.registerExitHooks();
  }

  resolveAssetPaths() {
    const { paths, activeModelId, models } = AI_CONFIG;
    const modelProfile = models[activeModelId] || models['qwen3-1.7b-instruct-q4km'];

    // Support development path, Electron extraResources path, and userData path
    const appDataDir = process.env.APP_DATA_DIR;
    const resourcesPath = process.resourcesPath;

    const candidateBinaries = [
      path.join(paths.runtimesDir, paths.binaryName),
      resourcesPath ? path.join(resourcesPath, 'assets', 'runtimes', paths.binaryName) : null,
      path.join(paths.projectRoot, paths.binaryName),
      appDataDir ? path.join(appDataDir, 'runtimes', paths.binaryName) : null
    ].filter(Boolean);

    for (const b of candidateBinaries) {
      if (fs.existsSync(b)) {
        this.binaryPath = b;
        break;
      }
    }

    const candidateModels = [
      path.join(paths.modelsDir, modelProfile.filename),
      resourcesPath ? path.join(resourcesPath, 'assets', 'ai', modelProfile.filename) : null,
      path.join(paths.projectRoot, modelProfile.filename),
      appDataDir ? path.join(appDataDir, 'models', modelProfile.filename) : null
    ].filter(Boolean);

    for (const m of candidateModels) {
      if (fs.existsSync(m)) {
        this.modelPath = m;
        break;
      }
    }

    // Dynamic fallback: if exact model profile filename is not found, discover any valid .gguf in modelsDir
    if (!this.modelPath) {
      const searchDirs = [
        paths.modelsDir,
        resourcesPath ? path.join(resourcesPath, 'assets', 'ai') : null,
        appDataDir ? path.join(appDataDir, 'models') : null
      ].filter(Boolean);

      for (const d of searchDirs) {
        if (fs.existsSync(d)) {
          try {
            const files = fs.readdirSync(d);
            const ggufFile = files.find(f => f.toLowerCase().endsWith('.gguf'));
            if (ggufFile) {
              this.modelPath = path.join(d, ggufFile);
              break;
            }
          } catch (e) {}
        }
      }
    }

    this.hasAssets = !!(this.binaryPath && this.modelPath);
    if (!this.hasAssets) {
      this.state = 'deterministic_only';
    }
  }

  registerExitHooks() {
    const cleanExit = () => {
      this.stop();
    };

    process.on('exit', cleanExit);
    process.on('SIGINT', () => { cleanExit(); process.exit(0); });
    process.on('SIGTERM', () => { cleanExit(); process.exit(0); });
  }

  async checkHealth() {
    if (!this.process || this.process.killed) {
      return false;
    }

    return new Promise((resolve) => {
      const req = http.get(
        `http://${AI_CONFIG.host}:${AI_CONFIG.port}/health`,
        { timeout: 2000 },
        (res) => {
          resolve(res.statusCode === 200);
        }
      );

      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
    });
  }

  async start() {
    if (!AI_CONFIG.enabled) {
      this.state = 'deterministic_only';
      return false;
    }

    this.resolveAssetPaths();
    if (!this.hasAssets) {
      this.state = 'deterministic_only';
      return false;
    }

    if (this.process && !this.process.killed) {
      const healthy = await this.checkHealth();
      if (healthy) {
        this.state = 'ready';
        return true;
      }
    }

    this.state = 'loading';
    console.log(`🧠 بدء تشغيل محرك الذكاء الاصطناعي المحلي (llama-server) على 127.0.0.1:${AI_CONFIG.port}...`);

    const args = [
      '-m', this.modelPath,
      '--host', AI_CONFIG.host,
      '--port', String(AI_CONFIG.port),
      '-c', String(AI_CONFIG.hardware.maxContextTokens),
      '-t', String(AI_CONFIG.hardware.cpuThreads),
      '--n-predict', String(AI_CONFIG.hardware.maxOutputTokens)
    ];

    try {
      this.process = spawn(this.binaryPath, args, {
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      const onOutput = (data) => {
        const text = data.toString();
        if (text.includes('listening on') || text.includes('model loaded') || text.includes('HTTP server listening')) {
          this.state = 'ready';
          this.restartAttempts = 0;
          console.log(`✅ محرك الذكاء الاصطناعي جاهز للعمل على 127.0.0.1:${AI_CONFIG.port}`);
        }
      };

      this.process.stdout.on('data', onOutput);
      this.process.stderr.on('data', onOutput);

      this.process.on('close', (code) => {
        console.log(`🛑 توقف محرك الذكاء الاصطناعي (كود الخروج: ${code})`);
        this.process = null;
        this.state = this.hasAssets ? 'unavailable' : 'deterministic_only';
      });

      // Poll health until ready or timeout (up to 15s)
      for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 500));
        if (await this.checkHealth()) {
          this.state = 'ready';
          this.restartAttempts = 0;
          return true;
        }
      }

      this.state = 'unavailable';
      return false;
    } catch (err) {
      console.error('❌ تعذر تشغيل محرك الذكاء الاصطناعي المحلي:', err.message);
      this.state = 'deterministic_only';
      return false;
    }
  }

  stop() {
    if (this.process) {
      try {
        console.log('🛑 إيقاف محرك الذكاء الاصطناعي المحلي...');
        this.process.kill('SIGTERM');
        setTimeout(() => {
          if (this.process && !this.process.killed) {
            this.process.kill('SIGKILL');
          }
        }, 1500);
      } catch (e) {}
      this.process = null;
    }
    this.state = this.hasAssets ? 'unavailable' : 'deterministic_only';
  }

  async ensureRunning() {
    if (this.state === 'ready') {
      return true;
    }
    if (!this.hasAssets) {
      this.state = 'deterministic_only';
      return false;
    }
    return await this.start();
  }

  getStatus() {
    return {
      enabled: AI_CONFIG.enabled,
      engine: AI_CONFIG.engine,
      state: this.state,
      activeModel: AI_CONFIG.activeModelId,
      hasAssets: this.hasAssets,
      binaryPath: this.binaryPath,
      modelPath: this.modelPath,
      loopbackOnly: true,
      port: AI_CONFIG.port,
      hardwareLimits: {
        threads: AI_CONFIG.hardware.cpuThreads,
        contextTokens: AI_CONFIG.hardware.maxContextTokens,
        maxOutputTokens: AI_CONFIG.hardware.maxOutputTokens
      },
      queueLength: this.queueLength,
      activeGenerations: this.activeGenerations
    };
  }
}

export const modelManager = new ModelManager();
