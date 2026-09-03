import type { ProviderResult, ProviderName, PatientContext } from '@/types';
import { LLMProvider, buildUserPrompt, SYSTEM_PROMPT, parseLLMResponse, emptyProviderResult } from './base';
import { LLM_TIMEOUT_MS } from '@/lib/config';

export class GeminiProvider implements LLMProvider {
  name: ProviderName = 'gemini';

  async execute(context: PatientContext): Promise<ProviderResult> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return { ...emptyProviderResult('gemini'), errorCode: 'NO_API_KEY' };
    }

    const startTime = Date.now();
    const model = 'gemini-1.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                { text: SYSTEM_PROMPT },
                { text: buildUserPrompt(context) },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2048,
            responseMimeType: 'application/json',
          },
        }),
      });

      clearTimeout(timeoutId);
      const latencyMs = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        return {
          ...emptyProviderResult('gemini'),
          latencyMs,
          errorCode: `HTTP_${response.status}`,
        };
      }

      const data = await response.json();
      const text =
        data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text).join('') ||
        '';

      const candidates = parseLLMResponse(text);

      const inputTokens = data?.usageMetadata?.promptTokenCount ?? null;
      const outputTokens = data?.usageMetadata?.candidatesTokenCount ?? null;

      if (candidates.length === 0) {
        return {
          ...emptyProviderResult('gemini'),
          latencyMs,
          inputTokens,
          outputTokens,
          errorCode: 'NO_CANDIDATES',
        };
      }

      return {
        provider: 'gemini',
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
        ...emptyProviderResult('gemini'),
        latencyMs,
        errorCode: isTimeout ? 'TIMEOUT' : 'REQUEST_FAILED',
      };
    }
  }
}
