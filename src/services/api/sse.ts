export type SseEvent = {
  event: string;
  data: string;
  id?: string;
};

/** Parse an SSE response body, including split CRLF, multiline data and the final unterminated frame. */
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
    const event: SseEvent = {
      event: eventName || 'message',
      data: dataLines.join('\n'),
      ...(eventId ? { id: eventId } : {}),
    };
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

  const consumeCompleteLines = function* (final = false): Generator<SseEvent> {
    // A CR at the end of a network chunk may be the first half of CRLF.
    // Hold it until the next chunk so CRLF is treated as one line ending.
    const holdTrailingCr = !final && buffer.endsWith('\r');
    const source = holdTrailingCr ? buffer.slice(0, -1) : buffer;
    const lines = source.split(/\r\n|\r|\n/);
    buffer = lines.pop() ?? '';
    if (holdTrailingCr) buffer += '\r';
    for (const line of lines) {
      const event = consumeLine(line);
      if (event) yield event;
    }
    if (final && buffer) {
      const finalLines = buffer.split(/\r\n|\r|\n/);
      buffer = '';
      for (const line of finalLines) {
        const event = consumeLine(line);
        if (event) yield event;
      }
    }
  };

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      yield* consumeCompleteLines();
    }
    buffer += decoder.decode();
    yield* consumeCompleteLines(true);
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
  if (parsed && typeof parsed === 'object' && 'citations' in parsed &&
      Array.isArray((parsed as { citations?: MessageCitation[] }).citations)) {
    return (parsed as { citations: MessageCitation[] }).citations;
  }
  if (parsed && typeof parsed === 'object') return [parsed as MessageCitation];
  return [];
}

export type NormalizedSseEvent = {
  type: string;
  data: unknown;
};

/** Accept both named SSE events and the JSON { type, data } envelope emitted by PEA. */
export function normalizeSseEvent(event: SseEvent): NormalizedSseEvent {
  let parsed: unknown;
  try {
    parsed = JSON.parse(event.data) as unknown;
  } catch {
    return { type: event.event, data: event.data };
  }
  if (parsed && typeof parsed === 'object' && 'type' in parsed &&
      typeof (parsed as { type?: unknown }).type === 'string') {
    const envelope = parsed as { type: string; data?: unknown };
    return { type: envelope.type, data: envelope.data ?? {} };
  }
  return { type: event.event, data: parsed };
}
