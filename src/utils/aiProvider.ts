/** Configuración y llamadas a proveedores de IA (Anthropic, OpenAI-compatible: Ollama, LM Studio, etc.). */

export const AI_SETTINGS_STORAGE_KEY = "finpro_ai_settings";

export type AiProviderId = "anthropic" | "openai_compatible";

export type AiSettings = {
  provider: AiProviderId;
  /** URL base o completa del endpoint. Vacío = valores por defecto del proveedor. */
  baseUrl: string;
  apiKey: string;
  model: string;
  maxTokens: number;
  /** Header `anthropic-version` (solo Anthropic). */
  anthropicVersion: string;
};

export function defaultAiSettings(): AiSettings {
  return {
    provider: "openai_compatible",
    baseUrl: "",
    apiKey: "",
    model: "gpt-4o-mini",
    maxTokens: 600,
    anthropicVersion: "2023-06-01",
  };
}

export function parseAiSettings(raw: unknown): AiSettings | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const base = defaultAiSettings();
  const provider =
    o.provider === "anthropic" || o.provider === "openai_compatible"
      ? o.provider
      : base.provider;
  return {
    provider,
    baseUrl: typeof o.baseUrl === "string" ? o.baseUrl : base.baseUrl,
    apiKey: typeof o.apiKey === "string" ? o.apiKey : base.apiKey,
    model: typeof o.model === "string" && o.model.trim() ? o.model : base.model,
    maxTokens:
      typeof o.maxTokens === "number" && o.maxTokens > 0
        ? Math.min(8192, Math.floor(o.maxTokens))
        : base.maxTokens,
    anthropicVersion:
      typeof o.anthropicVersion === "string" && o.anthropicVersion.trim()
        ? o.anthropicVersion
        : base.anthropicVersion,
  };
}

function normalizeOpenAiChatUrl(url: string): string {
  const u = url.trim().replace(/\/$/, "");
  if (!u) return "https://api.openai.com/v1/chat/completions";
  if (u.includes("/chat/completions")) return u;
  if (u.endsWith("/v1")) return `${u}/chat/completions`;
  return `${u}/v1/chat/completions`;
}

function normalizeAnthropicMessagesUrl(url: string): string {
  const u = url.trim().replace(/\/$/, "");
  if (!u) return "https://api.anthropic.com/v1/messages";
  if (u.includes("/v1/messages")) return u;
  if (u.endsWith("/v1")) return `${u}/messages`;
  return `${u}/v1/messages`;
}

function buildAnthropicUserContent(
  text: string,
  image: { data: string; type: string } | null,
): unknown {
  if (!image) return text;
  return [
    {
      type: "image",
      source: {
        type: "base64",
        media_type: image.type,
        data: image.data,
      },
    },
    { type: "text", text: text || " " },
  ];
}

function buildOpenAiUserContent(
  text: string,
  image: { data: string; type: string } | null,
): string | object[] {
  if (!image) return text;
  return [
    { type: "text", text: text || " " },
    {
      type: "image_url",
      image_url: {
        url: `data:${image.type};base64,${image.data}`,
      },
    },
  ];
}

export type AiCallOptions = {
  system: string;
  userText: string;
  image: { data: string; type: string } | null;
};

export async function callAiComplete(
  settings: AiSettings,
  opts: AiCallOptions,
): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  const maxTok = Math.max(64, Math.min(8192, settings.maxTokens || 600));

  if (settings.provider === "anthropic") {
    const url = normalizeAnthropicMessagesUrl(settings.baseUrl || "");
    const key = (settings.apiKey || "").trim();
    if (!key)
      return { ok: false, error: "missing_api_key" };

    const body = {
      model: settings.model.trim() || "claude-sonnet-4-20250514",
      max_tokens: maxTok,
      system: opts.system,
      messages: [
        {
          role: "user",
          content: buildAnthropicUserContent(opts.userText, opts.image),
        },
      ],
    };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": settings.anthropicVersion || "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err =
        (data?.error?.message as string) ||
        (typeof data?.error === "string" ? data.error : null) ||
        `HTTP ${res.status}`;
      return { ok: false, error: err };
    }
    const text =
      data?.content?.[0]?.text ??
      (typeof data?.content === "string" ? data.content : null);
    if (text == null || String(text).trim() === "")
      return { ok: false, error: "empty_response" };
    return { ok: true, text: String(text) };
  }

  /* openai_compatible */
  const url = normalizeOpenAiChatUrl(settings.baseUrl || "");
  const key = (settings.apiKey || "").trim();
  /** Ollama/LM Studio suelen aceptar Bearer vacío o "ollama" — si no hay key, enviamos solo si la URL es local. */
  const isProbablyLocal =
    /localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|^\//i.test(
      url,
    ) || url.includes(":11434");
  if (!key && !isProbablyLocal)
    return { ok: false, error: "missing_api_key" };

  const userContent = buildOpenAiUserContent(opts.userText, opts.image);
  const body = {
    model: settings.model.trim() || "gpt-4o-mini",
    max_tokens: maxTok,
    messages: [
      { role: "system", content: opts.system },
      { role: "user", content: userContent },
    ],
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (key) headers.Authorization = `Bearer ${key}`;

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err =
      data?.error?.message ||
      data?.message ||
      (typeof data?.error === "string" ? data.error : null) ||
      `HTTP ${res.status}`;
    return { ok: false, error: String(err) };
  }

  const choice = data?.choices?.[0];
  let text: string | null = null;
  const msg = choice?.message;
  if (typeof msg?.content === "string") text = msg.content;
  else if (Array.isArray(msg?.content)) {
    text = msg.content
      .filter((x: { type?: string }) => x?.type === "text")
      .map((x: { text?: string }) => x?.text || "")
      .join("");
  }
  if (text == null || String(text).trim() === "")
    return { ok: false, error: "empty_response" };
  return { ok: true, text: String(text) };
}
