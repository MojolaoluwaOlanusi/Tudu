/**
 * Turns a task title into a list of sub-task suggestions.
 *
 * The provider is chosen with AI_PROVIDER so the app can run against whichever
 * free tier the user has access to. All three speak plain HTTP, so no vendor
 * SDK is needed.
 */

export type AiProvider = 'gemini' | 'groq' | 'ollama';

export const MIN_SUBTASKS = 3;
export const MAX_SUBTASKS = 8;
const REQUEST_TIMEOUT_MS = 30_000;

/** Thrown for problems the user can actually act on. */
export class AiError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode = 502) {
    super(message);
    this.name = 'AiError';
    this.statusCode = statusCode;
  }
}

interface ProviderConfig {
  provider: AiProvider;
  apiKey?: string;
  model: string;
  baseUrl: string;
}

/** Resolved lazily so env changes are always picked up, even after import. */
const providerDefaults = (provider: AiProvider): { model: string; baseUrl: string } => {
  if (provider === 'groq') {
    return {
      model: process.env.AI_MODEL || 'openai/gpt-oss-20b',
      // Overridable for a proxy or gateway in front of the provider.
      baseUrl: process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1',
    };
  }
  if (provider === 'ollama') {
    return {
      model: process.env.AI_MODEL || 'llama3.2',
      baseUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
    };
  }
  return {
    model: process.env.AI_MODEL || 'gemini-2.5-flash',
    baseUrl:
      process.env.GEMINI_BASE_URL ||
      'https://generativelanguage.googleapis.com/v1beta',
  };
};

export const getProviderName = (): AiProvider => {
  const requested = (process.env.AI_PROVIDER || 'gemini').toLowerCase().trim();
  return requested === 'groq' || requested === 'ollama' ? requested : 'gemini';
};

/**
 * Resolve the active provider. Throws a clear, actionable error rather than
 * failing deep inside an HTTP call when the credentials are missing.
 */
export const getProviderConfig = (): ProviderConfig => {
  const provider = getProviderName();
  const defaults = providerDefaults(provider);

  const apiKey =
    provider === 'gemini'
      ? process.env.GEMINI_API_KEY
      : provider === 'groq'
        ? process.env.GROQ_API_KEY
        : undefined;

  // Ollama is local, so it deliberately needs no key.
  if (provider !== 'ollama' && !apiKey) {
    const envVar = provider === 'gemini' ? 'GEMINI_API_KEY' : 'GROQ_API_KEY';
    throw new AiError(
      `AI provider "${provider}" is selected but ${envVar} is not set. ` +
        `Add it to backend/.env (free keys: Google AI Studio for Gemini, console.groq.com for Groq).`,
      503
    );
  }

  return { provider, apiKey, model: defaults.model, baseUrl: defaults.baseUrl };
};

/** The prompt. Kept explicit so the output shape is unambiguous. */
const buildPrompt = (taskTitle: string, count: number): string =>
  [
    `Break the following task into ${count} actionable sub-tasks.`,
    '',
    `Task: "${taskTitle}"`,
    '',
    'Rules:',
    '- Each sub-task must be a short imperative phrase a person could tick off.',
    '- Start with a verb. Do not number them and do not add explanations.',
    '- Cover the distinct steps, not variations of the same step.',
    '- Return ONLY a JSON array of strings, with no markdown fences or commentary.',
    '',
    'Example response:',
    '["Draft the outline", "Collect reference material", "Write the first section"]',
  ].join('\n');

/**
 * Pull a JSON array of strings out of a model response.
 *
 * Models like to wrap JSON in ```json fences or add a sentence of preamble, so
 * this is deliberately forgiving before falling back to a line-based parse.
 */
export const extractSubtaskArray = (raw: string): string[] => {
  const cleaned = raw.trim();

  const candidates = [
    cleaned,
    // Strip a ```json ... ``` fence if present.
    cleaned.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim(),
  ];

  for (const candidate of candidates) {
    const start = candidate.indexOf('[');
    const end = candidate.lastIndexOf(']');
    if (start === -1 || end === -1 || end <= start) continue;

    try {
      const parsed = JSON.parse(candidate.slice(start, end + 1));
      if (Array.isArray(parsed)) {
        const asStrings = parsed
          .map((item) =>
            typeof item === 'string' ? item : (item?.title ?? item?.text)
          )
          .filter((item): item is string => typeof item === 'string');
        if (asStrings.length > 0) return asStrings;
      }
    } catch {
      // Fall through to the next strategy.
    }
  }

  // Last resort: one item per line. Models often prefix a sentence such as
  // "Here are the steps:" before the list, so lines that read as a preamble
  // (ending in a colon, or far too long to be a tick-off item) are dropped.
  const lines = cleaned
    .split('\n')
    .map((line) =>
      line
        .replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '')
        .replace(/^["'\[]|["'\],]$/g, '')
        .trim()
    )
    .filter(
      (line) => line.length > 2 && line.length <= 120 && !/[:,]\s*$/.test(line)
    );

  // A single surviving line is almost certainly a sentence of prose (a refusal,
  // or "Sure, I can help with that!") rather than a list, so report no result
  // and let the caller raise a proper error.
  return lines.length >= 2 ? lines : [];
};

/** Normalise, de-duplicate and bound the suggestions. */
export const normaliseSubtasks = (
  items: string[],
  limit = MAX_SUBTASKS
): string[] => {
  const seen = new Set<string>();

  return items
    .map((item) =>
      item
        .replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '')
        .replace(/\s+/g, ' ')
        .replace(/[.\s]+$/, '')
        .trim()
    )
    .filter((item) => item.length > 0)
    .filter((item) => {
      const key = item.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
};

/* --------------------------- HTTP --------------------------- */

interface ProviderHttpError extends Error {
  status?: number;
  providerMessage?: string;
  cause?: { code?: string };
}

/**
 * Minimal JSON POST with a hard timeout. Uses the platform fetch so no HTTP
 * client dependency is needed for three small calls.
 */
const postJson = async (
  url: string,
  body: unknown,
  headers: Record<string, string>
): Promise<any> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const text = await response.text();
    let data: any = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }

    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}`) as ProviderHttpError;
      error.status = response.status;
      error.providerMessage = data?.error?.message;
      throw error;
    }

    return data;
  } finally {
    clearTimeout(timer);
  }
};

/* --------------------------- Providers --------------------------- */

/** Google Gemini, via the REST endpoint (no SDK needed). */
const callGemini = async (
  config: ProviderConfig,
  prompt: string
): Promise<string> => {
  const data = await postJson(
    `${config.baseUrl}/models/${config.model}:generateContent`,
    {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 1024,
        responseMimeType: 'application/json',
      },
    },
    { 'x-goog-api-key': config.apiKey as string }
  );

  const text = data?.candidates?.[0]?.content?.parts
    ?.map((part: { text?: string }) => part.text ?? '')
    .join('');

  if (!text) {
    const reason = data?.promptFeedback?.blockReason;
    throw new AiError(
      reason
        ? `Gemini declined to answer (${reason}). Try rephrasing the task.`
        : 'Gemini returned an empty response.'
    );
  }

  return text;
};

/** Groq, over its OpenAI-compatible chat completions API. */
const callGroq = async (
  config: ProviderConfig,
  prompt: string
): Promise<string> => {
  const data = await postJson(
    `${config.baseUrl}/chat/completions`,
    {
      model: config.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
      max_tokens: 512,
    },
    { Authorization: `Bearer ${config.apiKey}` }
  );

  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new AiError('Groq returned an empty response.');
  return text;
};

/** A local Ollama server - free, private, and needs no API key. */
const callOllama = async (
  config: ProviderConfig,
  prompt: string
): Promise<string> => {
  const data = await postJson(
    `${config.baseUrl}/api/generate`,
    {
      model: config.model,
      prompt,
      stream: false,
      options: { temperature: 0.4 },
    },
    {}
  );

  const text = data?.response;
  if (!text) {
    throw new AiError(
      `Ollama returned nothing. Check the model is pulled: ollama pull ${config.model}`
    );
  }
  return text;
};
/**
 * Ask the configured provider to break a task down.
 *
 * @returns de-duplicated sub-task titles, in the order suggested
 * @throws {AiError} with a user-facing message on any provider problem
 */
export const generateSubtasks = async (
  taskTitle: string,
  count = 6
): Promise<string[]> => {
  const title = taskTitle.trim();

  if (title.length < 3) {
    throw new AiError('Give the task a slightly longer title first.', 400);
  }

  const config = getProviderConfig();
  const bounded = Math.min(Math.max(count, MIN_SUBTASKS), MAX_SUBTASKS);
  const prompt = buildPrompt(title, bounded);

  let raw: string;
  try {
    if (config.provider === 'gemini') raw = await callGemini(config, prompt);
    else if (config.provider === 'groq') raw = await callGroq(config, prompt);
    else raw = await callOllama(config, prompt);
  } catch (error) {
    const upstream = error as ProviderHttpError & { name?: string };

    if (error instanceof AiError) throw error;

    const status = upstream.status;
    const upstreamMessage = upstream.providerMessage;
    const isAbort = upstream.name === 'AbortError';
    const connectionRefused = upstream.cause?.code === 'ECONNREFUSED';

    if (isAbort) {
      throw new AiError('The AI provider took too long to respond. Try again.', 504);
    }
    if (status === 429) {
      throw new AiError(
        'Free tier rate limit reached. Wait a moment and try again.',
        429
      );
    }
    if (status === 401 || status === 403) {
      throw new AiError(
        `${config.provider} rejected the API key. Check the matching *_API_KEY in backend/.env.`,
        502
      );
    }
    if (connectionRefused && config.provider === 'ollama') {
      throw new AiError(
        'Could not reach Ollama. Is it running? Start it with: ollama serve',
        503
      );
    }

    throw new AiError(
      upstreamMessage
        ? `AI provider error: ${upstreamMessage}`
        : 'Could not reach the AI provider. Check your connection and try again.'
    );
  }

  const subtasks = normaliseSubtasks(extractSubtaskArray(raw));

  if (subtasks.length === 0) {
    throw new AiError('The AI did not return usable sub-tasks. Try rephrasing the task.');
  }

  return subtasks;
};