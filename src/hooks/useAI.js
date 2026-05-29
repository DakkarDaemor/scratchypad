import { AI_PROMPTS } from '../constants';

async function callOpenAI(url, apiKey, model, prompt) {
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!r.ok) throw new Error(await r.text());
  const data = await r.json();
  return data.choices?.[0]?.message?.content || '';
}

async function callClaude(apiKey, prompt) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
      ...(apiKey ? { 'x-api-key': apiKey } : {}),
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!r.ok) throw new Error(await r.text());
  const data = await r.json();
  return data.content?.[0]?.text || '';
}

async function callGemini(apiKey, model, prompt) {
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    }
  );
  if (!r.ok) throw new Error(await r.text());
  const data = await r.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

export function useAI(config) {
  const run = async (action, content) => {
    const prompt = AI_PROMPTS[action](content);
    const { provider = 'claude', claudeKey, openrouterKey, openrouterModel, groqKey, groqModel, openaiKey, openaiModel, geminiKey, geminiModel } = config || {};

    if (provider === 'openrouter') {
      return callOpenAI('https://openrouter.ai/api/v1/chat/completions', openrouterKey, openrouterModel, prompt);
    }
    if (provider === 'groq') {
      return callOpenAI('https://api.groq.com/openai/v1/chat/completions', groqKey, groqModel, prompt);
    }
    if (provider === 'openai') {
      return callOpenAI('https://api.openai.com/v1/chat/completions', openaiKey, openaiModel, prompt);
    }
    if (provider === 'gemini') {
      return callGemini(geminiKey, geminiModel, prompt);
    }
    return callClaude(claudeKey, prompt);
  };

  return { run };
}
