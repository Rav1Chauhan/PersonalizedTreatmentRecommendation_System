import type { ProviderResult, ProviderName, PatientContext } from '@/types';
import { LLMProvider, buildUserPrompt, SYSTEM_PROMPT, parseLLMResponse, emptyProviderResult } from './base';
import { LLM_TIMEOUT_MS } from '@/lib/config';

export class OpenAIProvider implements LLMProvider {
  name: ProviderName = 'openai';

  async execute(context: PatientContext): Promise<ProviderResult> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return { ...emptyProviderResult('openai'), errorCode: 'NO_API_KEY' };
    }

    const startTime = Date.now();
    const model = 'gpt-4o-mini';
    const url = 'https://api.openai.com/v1/chat/completions';

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: buildUserPrompt(context) },
          ],
          temperature: 0.3,
          max_tokens: 2048,
          response_format: { type: 'json_object' },
        }),
      });

      clearTimeout(timeoutId);
      const latencyMs = Date.now() - startTime;

      if (!response.ok) {
        return {
          ...emptyProviderResult('openai'),
          latencyMs,
          errorCode: `HTTP_${response.status}`,
        };
      }

      const data = await response.json();
      const text = data?.choices?.[0]?.message?.content || '';

      const candidates = parseLLMResponse(text);
      const inputTokens = data?.usage?.prompt_tokens ?? null;
      const outputTokens = data?.usage?.completion_tokens ?? null;

      if (candidates.length === 0) {
        return {
          ...emptyProviderResult('openai'),
          latencyMs,
          inputTokens,
          outputTokens,
          errorCode: 'NO_CANDIDATES',
        };
      }

      return {
        provider: 'openai',
        status: 'success',
        latencyMs,
        inputTokens,
        outputTokens,
        errorCode: null,
        candidates,
      };
    } catch (err) {
      const latencyMs = Date.now() - startTime;
      const isTimeout = err instanceof DOMException && err.name === 'AbortError';
      return {
        ...emptyProviderResult('openai'),
        latencyMs,
        errorCode: isTimeout ? 'TIMEOUT' : 'REQUEST_FAILED',
      };
    }
  }
}
