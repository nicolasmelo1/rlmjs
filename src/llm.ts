import type { HeadersInit } from "bun";

export type LlmClientOptions = {
  baseApi: string;
  apiKey?: string;
  model?: string;
  modelUrl?: string;
  fetch?: typeof fetch;
};

export type LlmClient = {
  baseApi: string;
  model?: string;
  modelUrl?: string;
  resolveModel: () => Promise<string>;
  resolveModelUrl: () => Promise<string>;
  request: (payload?: unknown, init?: RequestInit) => Promise<Response>;
};

type ModelsPayload = {
  object: "list";
  data: Array<{
    id: string;
    object: "model";
    created: number;
    owned_by: string;
  }>;
};

/**
 * Creates a new SUPER SIMPLE LLM client.
 *
 * @param options - Options for the LLM client
 * @param options.baseApi - The base API URL for the LLM
 * @param options.apiKey - The API key for the LLM
 * @param options.model - The model to use for the LLM
 * @param options.modelUrl - The URL of the model to use for the LLM
 * @param options.fetch - The fetch function to use for making requests
 *
 * @returns The LLM client
 */
export function llmClient(options: LlmClientOptions) {
  async function resolveModel(options: LlmClientOptions): Promise<string> {
    if (options.model) return options.model;

    const headers = new Headers();
    if (options.apiKey)
      headers.append("Authorization", `Bearer ${options.apiKey}`);

    const response = await fetch(`${options.baseApi}/models`, {
      headers,
    });

    if (!response.ok)
      throw new Error(
        `Failed to fetch models: ${response.status} ${response.statusText}`,
      );

    const payload = (await response.json()) as ModelsPayload;
    const model = payload.data?.[0]?.id;

    if (!model)
      throw new Error("Unable to resolve model from /models response");

    options.model = model;
    return model;
  }

  return async (
    messages: {
      role: "user" | "system";
      content: string;
    }[],
    completionOptions: {
      model?: string;
      temperature?: number;
      max_tokens?: number;
    } = {},
  ): Promise<string> => {
    if (!completionOptions?.model)
      completionOptions.model = await resolveModel(options);
    const model = completionOptions.model;
    const temperature = completionOptions.temperature ?? 0.7;
    const max_tokens = completionOptions.max_tokens ?? 1024;
    const url = `${options.baseApi}/chat/completions`;

    const headersToMerge: HeadersInit = {
      "content-type": "application/json",
    };
    if (options.apiKey)
      headersToMerge["Authorization"] = `Bearer ${options.apiKey}`;

    const headers = new Headers(headersToMerge);

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens,
      }),
    });

    if (!response.ok)
      throw new Error(
        `Failed to fetch completions: ${response.status} ${response.statusText}`,
      );

    const payload = (await response.json()) as {
      object: "chat.completion.chunk";
      choices: {
        message: {
          content: string;
        };
      }[];
    };

    const result = payload.choices?.[0]?.message.content;
    if (!result) throw new Error("No result found in completion response");
    return result;
  };
}
