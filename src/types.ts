export interface Env {
  CACHE: KVNamespace;
  AI: Ai;
  GROQ_API_KEY: string;
}

export interface QueryRequest {
  prompt: string;
  max_tokens?: number;
  force_groq?: boolean;
}

export interface QueryResponse {
  response: string;
  source: "workers_ai" | "groq" | "cache";
  latency_ms: number;
}