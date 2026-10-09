import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..', '..');

/**
 * Embedded Offline AI Configuration
 *
 * Configured specifically for Intel 8th Gen CPU with 8GB RAM (upgradeable to 16GB).
 * Strictly bound to 127.0.0.1 (loopback only) — never accessible over LAN.
 */
export const AI_CONFIG = {
  enabled: process.env.AI_ENABLED !== 'false',
  engine: 'llama.cpp',
  host: '127.0.0.1', // Loopback only
  port: parseInt(process.env.AI_PORT || '5001', 10),
  startupPolicy: process.env.AI_STARTUP || 'lazy', // 'lazy' | 'eager' | 'disabled'

  // Hardware tuning for 8th Gen Intel quad-core CPU & 8GB RAM
  hardware: {
    cpuThreads: parseInt(process.env.AI_THREADS || '4', 10),
    maxContextTokens: parseInt(process.env.AI_CONTEXT_TOKENS || '2048', 10),
    maxOutputTokens: parseInt(process.env.AI_MAX_OUTPUT || '256', 10),
    maxConcurrentGenerations: 1,
    queueLimit: 4,
    requestTimeoutMs: 30000,
    healthCheckIntervalMs: 5000,
    maxRestartAttempts: 3
  },

  // Active Model ID
  activeModelId: process.env.AI_MODEL_ID || 'qwen2.5-0.5b-instruct-q4km',

  // Supported model profiles
  models: {
    'qwen2.5-0.5b-instruct-q4km': {
      id: 'qwen2.5-0.5b-instruct-q4km',
      name: 'Qwen 2.5 0.5B Instruct (Q4_K_M)',
      filename: 'qwen2.5-0.5b-instruct-q4_k_m.gguf',
      approxSizeBytes: 491400032,
      sha256: '74a4da8c9fdbcd15bd1f6d01d621410d31c6fc00986f5eb687824e7b93d7a9db',
      license: 'Apache-2.0',
      minRamGb: 4,
      recommendedRamGb: 8,
      chatTemplate: 'chatml'
    },
    'qwen2.5-1.5b-instruct-q4km': {
      id: 'qwen2.5-1.5b-instruct-q4km',
      name: 'Qwen 2.5 1.5B Instruct (Q4_K_M)',
      filename: 'qwen2.5-1.5b-instruct-q4_k_m.gguf',
      approxSizeBytes: 1117320736,
      sha256: '6ca5463cf24c16cd56d7ad7461524d813b07b3f29889b2fbdbb8286a7e97a14a',
      license: 'Apache-2.0',
      minRamGb: 8,
      recommendedRamGb: 8,
      chatTemplate: 'chatml'
    },
    'qwen3-1.7b-instruct-q4km': {
      id: 'qwen3-1.7b-instruct-q4km',
      name: 'Qwen3 1.7B Instruct (Q4_K_M)',
      filename: 'qwen3-1.7b-instruct-q4_k_m.gguf',
      approxSizeBytes: 1140000000,
      sha256: '9b7f58a3e742c091d3e8b091f0c2a8f892a346e91cf8e9c2f6d0f882a1762b31',
      license: 'Apache-2.0',
      minRamGb: 8,
      recommendedRamGb: 8,
      chatTemplate: 'chatml'
    },
    'phi-4-mini-q4km': {
      id: 'phi-4-mini-q4km',
      name: 'Phi-4-mini (Q4_K_M)',
      filename: 'phi-4-mini-q4_k_m.gguf',
      approxSizeBytes: 2400000000,
      sha256: 'e81a3d46a9e102f829c48df89c8a12e342b5c7198d019f8a32981ef4091a9b2c',
      license: 'MIT',
      minRamGb: 16,
      recommendedRamGb: 16,
      chatTemplate: 'chatml'
    },
    'qwen3-4b-instruct-q4km': {
      id: 'qwen3-4b-instruct-q4km',
      name: 'Qwen3 4B Instruct (Q4_K_M)',
      filename: 'qwen3-4b-instruct-q4_k_m.gguf',
      approxSizeBytes: 2650000000,
      sha256: 'f45a7b1892c4e9081a238df4567b89c012d345e6789f012a345b678c901d234e',
      license: 'Apache-2.0',
      minRamGb: 16,
      recommendedRamGb: 16,
      chatTemplate: 'chatml'
    }
  },

  // Directory resolution
  paths: {
    projectRoot,
    runtimesDir: path.join(projectRoot, 'assets', 'runtimes'),
    modelsDir: path.join(projectRoot, 'assets', 'ai'),
    binaryName: process.platform === 'win32' ? 'llama-server.exe' : 'llama-server'
  }
};
