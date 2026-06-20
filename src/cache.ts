import { Env } from "./types";

async function hashPrompt(prompt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(prompt.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

export async function getCache(
  prompt: string,
  env: Env
): Promise<string | null> {
  const key = await hashPrompt(prompt);
  return await env.CACHE.get(key);
}

export async function setCache(
  prompt: string,
  response: string,
  env: Env
): Promise<void> {
  const key = await hashPrompt(prompt);
  await env.CACHE.put(key, response, { expirationTtl: 3600 });
}