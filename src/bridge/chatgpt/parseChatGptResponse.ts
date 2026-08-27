export function stripMarkdownJsonFence(raw: string): string {
  let text = raw.trim();
  const fenceMatch = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(text);
  if (fenceMatch) {
    return fenceMatch[1]!.trim();
  }

  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  }

  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1);
  }

  return text;
}

export function parseChatGptResponseRaw(raw: string): { ok: true; value: unknown } | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, error: 'Ответ пустой.' };
  }

  try {
    const jsonText = stripMarkdownJsonFence(trimmed);
    return { ok: true, value: JSON.parse(jsonText) as unknown };
  } catch {
    return { ok: false, error: 'Не удалось разобрать JSON. Убедитесь, что ChatGPT вернул только JSON.' };
  }
}
