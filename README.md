# EdgeMind — AI Query Router on Cloudflare Workers

> A serverless AI gateway deployed at the edge. Routes prompts to Cloudflare Workers AI or Groq based on request complexity, with Cloudflare KV caching that reduces repeated query latency from **2.1 seconds to 44 milliseconds (~48× improvement)**.

## Architecture

```text
Client Request
      │
      ▼
Cloudflare Workers (Edge)
      │
      ├─► KV Cache Check ──► HIT → Return Cached Response (~44ms)
      │
      └─► MISS → Route Decision
                │
                ├─► Workers AI (LLaMA 3.8B)
                │
                └─► Groq (LLaMA 3.3 70B)
                          │
                          ▼
                    Store in KV Cache (TTL: 1hr)
                          │
                          ▼
                    Return Response + source + latency_ms
```

## Live API

**Base URL**

```text
https://edgemind.mknsvarun.workers.dev
```

### Health Check

```bash
curl https://edgemind.mknsvarun.workers.dev/health
```

Example Response:

```json
{
  "status": "ok",
  "region": "SIN"
}
```

### Query

```bash
curl -X POST https://edgemind.mknsvarun.workers.dev/query \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Explain DNS in one sentence"}'
```

Example Response:

```json
{
  "response": "DNS translates human-readable domain names into IP addresses.",
  "source": "workers_ai",
  "latency_ms": 834
}
```

### Cache Hit

Submitting the same prompt again:

```bash
curl -X POST https://edgemind.mknsvarun.workers.dev/query \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Explain DNS in one sentence"}'
```

Example Response:

```json
{
  "response": "DNS translates human-readable domain names into IP addresses.",
  "source": "cache",
  "latency_ms": 44
}
```

### Force Groq

```bash
curl -X POST https://edgemind.mknsvarun.workers.dev/query \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Write a detailed essay on BGP","force_groq":true}'
```

## Real Benchmark Results

Measured on the deployed production endpoint:

| Request Type      | Latency     |
| ----------------- | ----------- |
| Cache Miss        | 2113 ms     |
| Cache Hit         | 44 ms       |
| Improvement       | ~48× Faster |
| Latency Reduction | 97.9%       |

Benchmark command:

```bash
time curl -X POST https://edgemind.mknsvarun.workers.dev/query \
  -H "Content-Type: application/json" \
  -d '{"prompt":"What is BGP?"}'
```

Results:

```text
First Request  (Cache Miss): 2113 ms
Second Request (Cache Hit):    44 ms
```

## API Reference

### POST /query

| Field      | Type    | Default  | Description            |
| ---------- | ------- | -------- | ---------------------- |
| prompt     | string  | required | User query             |
| max_tokens | number  | 256      | Token budget           |
| force_groq | boolean | false    | Route directly to Groq |

### GET /health

Returns:

```json
{
  "status": "ok",
  "region": "SIN"
}
```

### DELETE /cache

```http
DELETE /cache?prompt=<query>
```

Removes a cached response.

## Routing Logic

```python
if force_groq or max_tokens > 500:
    route_to_groq()
else:
    route_to_workers_ai()

if workers_ai_fails:
    route_to_groq()
```

## Local Development

```bash
git clone https://github.com/MKN-Sai-Varun/EdgeMind.git

cd EdgeMind

npm install

npx wrangler secret put GROQ_API_KEY

npx wrangler dev

npx wrangler deploy
```

## Tech Stack

* Runtime: Cloudflare Workers
* Framework: Hono
* Primary Model: @cf/meta/llama-3-8b-instruct
* Fallback Model: Groq llama-3.3-70b-versatile
* Cache Layer: Cloudflare KV
* Language: TypeScript

## Key Achievements

* Built a globally distributed edge AI gateway using Cloudflare Workers.
* Implemented intelligent model routing between Workers AI and Groq.
* Reduced repeated query latency from **2.1s to 44ms** using KV caching.
* Achieved **97.9% latency reduction** and **48× faster responses** for cached requests.
* Eliminated unnecessary LLM inference for repeated queries, reducing response cost and improving user experience.

## Why EdgeMind?

Traditional LLM applications perform full inference on every request, introducing significant latency and cost. EdgeMind moves AI inference closer to users through Cloudflare's edge network and aggressively caches responses, allowing repeat queries to be served in tens of milliseconds instead of seconds.
