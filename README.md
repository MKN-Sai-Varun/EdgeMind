# EdgeMind — AI Query Router on Cloudflare Workers

> A serverless AI gateway deployed at the edge. Routes prompts to Workers AI (LLaMA) or Groq based on token budget, with KV-based semantic caching for sub-millisecond repeat lookups.

## Architecture

```
Client Request
      │
      ▼
Cloudflare Workers (Edge)
      │
      ├─► KV Cache Check ──► HIT → return cached response (~2ms)
      │
      └─► MISS → Route Decision
                │
                ├─► Workers AI (LLaMA 3.8B) — short prompts / low token budget
                │
                └─► Groq (LLaMA 3.3 70B)   — long prompts / force_groq flag / fallback
                          │
                          ▼
                    Store in KV Cache (TTL: 1hr)
                          │
                          ▼
                    Return Response + source + latency_ms
```

## Live API

**Base URL:** `https://edgemind.your-subdomain.workers.dev`

### Health Check
```bash
curl https://edgemind.your-subdomain.workers.dev/health
```
```json
{ "status": "ok", "region": "SIN" }
```

### Query
```bash
curl -X POST https://edgemind.your-subdomain.workers.dev/query \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Explain DNS in one sentence"}'
```
```json
{
  "response": "DNS is a distributed system that translates human-readable domain names into IP addresses...",
  "source": "workers_ai",
  "latency_ms": 834
}
```

### Cache Hit (same prompt again)
```bash
curl -X POST https://edgemind.your-subdomain.workers.dev/query \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Explain DNS in one sentence"}'
```
```json
{
  "response": "DNS is a distributed system...",
  "source": "cache",
  "latency_ms": 3
}
```

### Force Groq (70B model)
```bash
curl -X POST https://edgemind.your-subdomain.workers.dev/query \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Write a detailed essay on BGP", "force_groq": true}'
```

## Latency Benchmarks

| Source | Avg Latency | Notes |
|--------|-------------|-------|
| Cache (KV hit) | ~2–5ms | Edge KV lookup |
| Workers AI | ~700–900ms | LLaMA 3.8B at edge |
| Groq | ~1000–1400ms | LLaMA 3.3 70B |

## API Reference

### `POST /query`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `prompt` | string | required | The input prompt |
| `max_tokens` | number | 256 | Tokens > 500 auto-routes to Groq |
| `force_groq` | boolean | false | Skip Workers AI, use Groq 70B |

### `GET /health`
Returns `{ status, region }` — region is the Cloudflare colo serving the request.

### `DELETE /cache?prompt=...`
Clears a cached response for a given prompt.

## Routing Logic

```
if force_groq OR max_tokens > 500:
    → Groq (LLaMA 3.3 70B)
else:
    → Workers AI (LLaMA 3.8B)
    → on failure: fallback to Groq
```

## Local Development

```bash
git clone https://github.com/MKN-Sai-Varun/EdgeMind
cd edgemind
npm install

# Add your Groq key
npx wrangler secret put GROQ_API_KEY

# Run locally
npx wrangler dev

# Deploy
npx wrangler deploy
```

## Stack

- **Runtime:** Cloudflare Workers (V8 isolates)
- **Router:** Hono
- **Primary LLM:** Cloudflare Workers AI — `@cf/meta/llama-3-8b-instruct`
- **Fallback LLM:** Groq — `llama-3.3-70b-versatile`
- **Cache:** Cloudflare KV (TTL: 1 hour)
- **Language:** TypeScript

## Why This Exists

Standard LLM APIs add 500ms–2s of latency on every call. By deploying the router at Cloudflare's edge and caching responses in KV, repeated or similar queries resolve in single-digit milliseconds — without hitting the model at all. The dual-model routing also lets you balance cost and quality per request.