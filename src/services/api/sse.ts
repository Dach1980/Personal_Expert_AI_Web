export type SseEvent = {
  event: string;
  data: string;
  id?: string;
};

/** Parse an SSE response body, including CRLF, multiline data and the final unterminated frame. */
export async function* parseSseStream(
  stream: ReadableStream<Uint8Array>,
): AsyncGenerator<SseEvent> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let eventName = 'message';
  let eventId: string | undefined;
  let dataLines: string[] = [];

  const dispatch = (): SseEvent | null => {
    if (!dataLines.length) {
      eventName = 'message';
      return null;
    }
    const event: SseEvent = { event: eventName || 'message', data: dataLines.join('\n'), ...(eventId ? { id: eventId } : {}) };
    eventName = 'message';
    dataLines = [];
    return event;
  };

  const consumeLine = (line: string): SseEvent | null => {
    if (line === '') return dispatch();
    if (line.startsWith(':')) return null;
    const separator = line.indexOf(':');
    const field = separator === -1 ? line : line.slice(0, separator);
    let value = separator === -1 ? '' : line.slice(separator + 1);
    if (value.startsWith(' ')) value = value.slice(1);
    if (field === 'event') eventName = value;
    else if (field === 'data') dataLines.push(value);
    else if (field === 'id' && !value.includes('\0')) eventId = value;
    return null;
  };

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r\n|\r|\n/);
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        const event = consumeLine(line);
        if (event) yield event;
      }
    }
    buffer += decoder.decode();
    if (buffer) {
      const lines = buffer.split(/\r\n|\r|\n/);
      for (const line of lines) {
        const event = consumeLine(line);
        if (event) yield event;
      }
    }
    const finalEvent = dispatch();
    if (finalEvent) yield finalEvent;
  } finally {
    reader.releaseLock();
  }
}

export type MessageCitation = {
  id?: string;
  title?: string;
  document_title?: string;
  source_fragment_id?: string;
  document_version_id?: string;
  page?: number;
  sheet?: string;
  excerpt?: string;
  url?: string;
  locator?: Record<string, unknown>;
};

export function parseCitationPayload(data: string): MessageCitation[] {
  const parsed = JSON.parse(data) as MessageCitation | MessageCitation[] | { citations?: MessageCitation[] };
  if (Array.isArray(parsed)) return parsed;
  if ('citations' in parsed && Array.isArray(parsed.citations)) return parsed.citations;
  return [parsed as MessageCitation];
}
