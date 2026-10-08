import http from 'http';
import { AI_CONFIG } from './aiConfig.js';
import { ALLOWED_INTENT_IDS } from './intentSchema.js';
import { modelManager } from './modelManager.js';

/**
 * Local Model Adapter for llama-server
 *
 * Implements:
 * - Single-generation concurrency + bounded queue (max 4)
 * - Strict loopback communication (127.0.0.1 only)
 * - Request timeouts and error handling
 * - Structured JSON parsing and repair for intent extraction
 */

class ModelAdapter {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
  }

  async planIntent(userPrompt) {
    // If queue is full, reject immediately to protect server RAM
    if (this.queue.length >= AI_CONFIG.hardware.queueLimit) {
      throw new Error('قائمة انتظار المعالجة الذكية ممتلئة حالياً');
    }

    return new Promise((resolve, reject) => {
      this.queue.push({ userPrompt, resolve, reject, timestamp: Date.now() });
      modelManager.queueLength = this.queue.length;
      this.processNext();
    });
  }

  async processNext() {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;
    modelManager.activeGenerations = 1;
    const task = this.queue.shift();
    modelManager.queueLength = this.queue.length;

    try {
      const result = await this.executeInference(task.userPrompt);
      task.resolve(result);
    } catch (err) {
      task.reject(err);
    } finally {
      this.isProcessing = false;
      modelManager.activeGenerations = 0;
      setImmediate(() => this.processNext());
    }
  }

  async executeInference(userPrompt) {
    const systemPrompt = `You are an intent classifier for an Egyptian security & recruit records system.
Allowed intents: ${ALLOWED_INTENT_IDS.join(', ')}.
You MUST respond with valid JSON only in this format:
{"intent": "intent_name", "params": {"query": "search_term"}, "explanation": "Arabic explanation"}
Do not output markdown codeblocks. Output pure JSON.`;

    const payload = JSON.stringify({
      prompt: `<|im_start|>system\n${systemPrompt}<|im_end|>\n<|im_start|>user\n${userPrompt}<|im_end|>\n<|im_start|>assistant\n`,
      n_predict: AI_CONFIG.hardware.maxOutputTokens,
      temperature: 0.1,
      stop: ['<|im_end|>', '\n\n\n']
    });

    return new Promise((resolve, reject) => {
      const req = http.request(
        {
          hostname: AI_CONFIG.host,
          port: AI_CONFIG.port,
          path: '/completion',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
          },
          timeout: AI_CONFIG.hardware.requestTimeoutMs
        },
        (res) => {
          let body = '';
          res.on('data', (chunk) => { body += chunk; });
          res.on('end', () => {
            try {
              const parsed = JSON.parse(body);
              const content = (parsed.content || '').trim();

              // Extract JSON object from response
              const jsonMatch = content.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                const intentObj = JSON.parse(jsonMatch[0]);
                resolve(intentObj);
              } else {
                reject(new Error('النموذج لم يرجع استجابة بتنسيق JSON صحيح'));
              }
            } catch (e) {
              reject(new Error('فشل تحليل مخرجات النموذج الذكي'));
            }
          });
        }
      );

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('انتهت مهلة استجابة النموذج الذكي'));
      });

      req.on('error', (err) => {
        reject(err);
      });

      req.write(payload);
      req.end();
    });
  }
}

export const modelAdapter = new ModelAdapter();
