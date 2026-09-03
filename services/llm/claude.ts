import type { ProviderResult, ProviderName, PatientContext } from '@/types';
import { LLMProvider, buildUserPrompt, SYSTEM_PROMPT, parseLLMResponse, emptyProviderResult } from './base';
import { LLM_TIMEOUT_MS } from '@/lib/config';

export class ClaudeProvider implements LLMProvider {
  name: ProviderName = 'claude';

  async execute(context: PatientContext): Promise<ProviderResult> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return { ...emptyProviderResult('claude'), errorCode: 'NO_API_KEY' };
    }

    const startTime = Date.now();
    const model = 'claude-3-5-sonnet-20241022';
    const url = 'https://api.anthropic.com/v1/messages';

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          max_tokens: 2048,
          system: SYSTEM_PROMPT,
          messages: [
            { role: 'user', content: buildUserPrompt(context) },
          ],
        }),
      });

      clearTimeout(timeoutId);
      const latencyMs = Date.now() - startTime;

      if (!response.ok) {
        return {
          ...emptyProviderResult('claude'),
          latencyMs,
          errorCode: `HTTP_${response.status}`,
        };
      }

      const data = await response.json();
      const text = data?.content
        ?.map((block: { type: string; text?: string }) =>
          block.type === 'text' ? block.text : ''
        )
        .join('') || '';

      const candidates = parseLLMResponse(text);
      const inputTokens = data?.usage?.input_tokens ?? null;
      const outputTokens = data?.usage?.output_tokens ?? null;

      if (candidates.length === 0) {
        return {
          ...emptyProviderResult('claude'),
          latencyMs,
          inputTokens,
          outputTokens,
          errorCode: 'NO_CANDIDATES',
        };
      }

      return {
        provider: 'claude',
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
        ...emptyProviderResult('claude'),
        latencyMs,
        errorCode: isTimeout ? 'TIMEOUT' : 'REQUEST_FAILED',
      };
    }
  }
}
