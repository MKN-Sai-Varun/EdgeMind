import { Hono } from "hono";
import { cors } from "hono/cors";
import { Env, QueryRequest, QueryResponse } from "./types";
import { getCache, setCache } from "./cache";
import { routeQuery } from "./router";

const app = new Hono<{ Bindings: Env }>();

app.use("*", cors());

app.get("/health", (c) => {
  return c.json({ status: "ok", region: c.req.raw.cf?.colo ?? "unknown" });
});

app.post("/query", async (c) => {
  const start = Date.now();

  let body: QueryRequest;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const { prompt, max_tokens = 256, force_groq = false } = body;

  if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
    return c.json({ error: "prompt is required" }, 400);
  }


  const cached = await getCache(prompt, c.env);
  if (cached) {
    const response: QueryResponse = {
      response: cached,
      source: "cache",
      latency_ms: Date.now() - start,
    };
    return c.json(response);
  }
  console.log("ENV KEYS:", Object.keys(c.env));

  const { text, source } = await routeQuery(
    prompt,
    max_tokens,
    force_groq,
    c.env
  );

  await setCache(prompt, text, c.env);

  const response: QueryResponse = {
    response: text,
    source,
    latency_ms: Date.now() - start,
  };

  return c.json(response);
});

app.delete("/cache", async (c) => {
  const prompt = c.req.query("prompt");
  if (!prompt) return c.json({ error: "prompt query param required" }, 400);
  const key = prompt.toLowerCase().trim().slice(0, 32);
  await c.env.CACHE.delete(key);
  return c.json({ cleared: true });
});

export default app;