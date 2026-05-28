import { AI_PROMPTS } from '../constants';

export function useAI(claudeKey) {
  const run = async (action, content) => {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
        ...(claudeKey ? { 'x-api-key': claudeKey } : {}),
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        messages: [{ role: 'user', content: AI_PROMPTS[action](content) }],
      }),
    });
    if (!r.ok) throw new Error(await r.text());
    const data = await r.json();
    return data.content?.[0]?.text || '';
  };

  return { run };
}
