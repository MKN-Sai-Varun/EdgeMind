import { Env } from "./types";


const TOKEN_THRESHOLD = 500; 

export async function runWorkersAI(
  prompt: string,
  max_tokens: number,
  env: Env
): Promise<string> {
  const response = await env.AI.run("@cf/meta/llama-3-8b-instruct", {
    prompt,
    max_tokens,
  });
  return (response as any).response ?? JSON.stringify(response);
}

export async function runGroq(
  prompt: string,
  max_tokens: number,
  apiKey: string
): Promise<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      max_tokens,
    }),
  });
  const data = await res.json() as any;

    console.log("Groq Status:", res.status);
    console.log("Groq Response:", JSON.stringify(data, null, 2));

    return data.choices[0].message.content;
  
  
}

export async function routeQuery(
  prompt: string,
  max_tokens: number,
  force_groq: boolean,
  env: Env
): Promise<{ text: string; source: "workers_ai" | "groq" }> {
  // Force Groq, or use Groq for large token requests
  console.log("API Key Present:", !!env.GROQ_API_KEY);
  console.log("API Key Length:", env.GROQ_API_KEY?.length);
  console.log("API Key Prefix:", env.GROQ_API_KEY?.slice(0, 6));
  if (force_groq || max_tokens > TOKEN_THRESHOLD) {
    const text = await runGroq(prompt, max_tokens, env.GROQ_API_KEY);
    return { text, source: "groq" };
  }

  try {
    const text = await runWorkersAI(prompt, max_tokens, env);
    return { text, source: "workers_ai" };
  } catch {
    // Fallback to Groq if Workers AI fails
    const text = await runGroq(prompt, max_tokens, env.GROQ_API_KEY);
    return { text, source: "groq" };
  }
}