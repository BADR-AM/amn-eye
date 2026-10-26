import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..', '..');

/**
 * Embedded Offline AI Configuration
 *
 * Tuned for AMD A8-5500B APU (4 Cores) with 5.3/7.5 GB baseline RAM (2.1 GB free):
 * - Uses Qwen 2.5 1.5B Instruct Q4_K_M (~1.1 GB total RAM footprint with 1536 ctx).
 * - Pins llama-server to 2 CPU threads so 2 cores remain 100% free for UI & SQLite.
 * - Unloads the sidecar process after 5 minutes of inactivity to free 1.1 GB RAM.
 */
export const AI_CONFIG = {
  enabled: process.env.AI_ENABLED !== 'false',
  engine: 'llama.cpp',
  host: '127.0.0.1',
  port: parseInt(process.env.AI_PORT || '5001', 10),
  startupPolicy: process.env.AI_STARTUP || 'lazy',

  hardware: {
    cpuThreads: parseInt(process.env.AI_THREADS || '2', 10),
    batchSize: parseInt(process.env.AI_BATCH_SIZE || '256', 10),
    ubatchSize: parseInt(process.env.AI_UBATCH_SIZE || '128', 10),
    maxContextTokens: parseInt(process.env.AI_CONTEXT_TOKENS || '1536', 10),
    maxOutputTokens: parseInt(process.env.AI_MAX_OUTPUT || '320', 10),
    idleTimeoutMs: parseInt(process.env.AI_IDLE_TIMEOUT_MS || '300000', 10), // 5 minutes auto-unload
    maxConcurrentGenerations: 1,
    queueLimit: 4,
    requestTimeoutMs: 40000,
    healthCheckIntervalMs: 5000,
    maxRestartAttempts: 3
  },

  // Ordered from best-for-2.1GB-free-RAM to fallback
  preferredModelOrder: [
    'qwen2.5-1.5b-instruct-q4km',
    'qwen3-1.7b-instruct-q4km',
    'qwen2.5-0.5b-instruct-q4km'
  ],

  activeModelId: process.env.AI_MODEL_ID || 'qwen2.5-1.5b-instruct-q4km',

  models: {
    'qwen2.5-1.5b-instruct-q4km': {
      id: 'qwen2.5-1.5b-instruct-q4km',
      name: 'Qwen 2.5 1.5B Instruct (Q4_K_M)',
      filename: 'qwen2.5-1.5b-instruct-q4_k_m.gguf',
      downloadUrl: 'https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_k_m.gguf',
      approxSizeBytes: 1117320736,
      sha256: '6ca5463cf24c16cd56d7ad7461524d813b07b3f29889b2fbdbb8286a7e97a14a',
      license: 'Apache-2.0',
      minRamGb: 6,
      recommendedRamGb: 8,
      chatTemplate: 'chatml'
    },
    'qwen3-1.7b-instruct-q4km': {
      id: 'qwen3-1.7b-instruct-q4km',
      name: 'Qwen3 1.7B Instruct (Q4_K_M)',
      filename: 'qwen3-1.7b-instruct-q4_k_m.gguf',
      downloadUrl: 'https://huggingface.co/Qwen/Qwen3-1.7B-GGUF/resolve/main/qwen3-1.7b-instruct-q4_k_m.gguf',
      approxSizeBytes: 1140000000,
      sha256: '9b7f58a3e742c091d3e8b091f0c2a8f892a346e91cf8e9c2f6d0f882a1762b31',
      license: 'Apache-2.0',
      minRamGb: 6,
      recommendedRamGb: 8,
      chatTemplate: 'chatml'
    },
    'qwen2.5-0.5b-instruct-q4km': {
      id: 'qwen2.5-0.5b-instruct-q4km',
      name: 'Qwen 2.5 0.5B Instruct (Q4_K_M)',
      filename: 'qwen2.5-0.5b-instruct-q4_k_m.gguf',
      downloadUrl: 'https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf',
      approxSizeBytes: 491400032,
      sha256: '74a4da8c9fdbcd15bd1f6d01d621410d31c6fc00986f5eb687824e7b93d7a9db',
      license: 'Apache-2.0',
      minRamGb: 4,
      recommendedRamGb: 8,
      chatTemplate: 'chatml'
    }
  },

  paths: {
    projectRoot,
    runtimesDir: path.join(projectRoot, 'assets', 'runtimes'),
    modelsDir: path.join(projectRoot, 'assets', 'ai'),
    binaryName: process.platform === 'win32' ? 'llama-server.exe' : 'llama-server'
  }
};
