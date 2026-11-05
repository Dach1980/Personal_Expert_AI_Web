import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSseEvent, parseCitationPayload, parseSseStream } from '../src/services/api/sse';

function streamOf(...chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
}

test('parses CRLF frames and multiline data fields', async () => {
  const events = [];
  for await (const event of parseSseStream(streamOf('event: text_delta\r\ndata: {"delta":"one"}\r\ndata: {"delta":"two"}\r\n\r\n'))) {
    events.push(event);
  }
  assert.deepEqual(events, [{ event: 'text_delta', data: '{"delta":"one"}\n{"delta":"two"}' }]);
});

test('dispatches a final frame without a trailing blank line', async () => {
  const events = [];
  for await (const event of parseSseStream(streamOf('event: message_end\ndata: {"finish_reason":"stop"}'))) {
    events.push(event);
  }
  assert.deepEqual(events, [{ event: 'message_end', data: '{"finish_reason":"stop"}' }]);
});

test('preserves event id and ignores SSE comments', async () => {
  const events = [];
  for await (const event of parseSseStream(streamOf(': keepalive\nid: 42\nevent: citation\ndata: {"title":"Spec"}\n\n'))) {
    events.push(event);
  }
  assert.deepEqual(events, [{ event: 'citation', data: '{"title":"Spec"}', id: '42' }]);
});

test('handles CRLF split across network chunks without dispatching early', async () => {
  const events = [];
  for await (const event of parseSseStream(streamOf('event: citation\r', '\ndata: {"title":"Spec"}\r', '\n\r', '\n'))) {
    events.push(event);
  }
  assert.deepEqual(events, [{ event: 'citation', data: '{"title":"Spec"}' }]);
});

test('normalizes single, array and wrapped citation payloads', () => {
  assert.deepEqual(parseCitationPayload('{"title":"A"}'), [{ title: 'A' }]);
  assert.deepEqual(parseCitationPayload('[{"title":"A"},{"title":"B"}]'), [{ title: 'A' }, { title: 'B' }]);
  assert.deepEqual(parseCitationPayload('{"citations":[{"title":"A"}]}'), [{ title: 'A' }]);
  assert.deepEqual(parseCitationPayload('null'), []);
});

test('normalizes the JSON envelope used by the PEA streaming API', () => {
  assert.deepEqual(
    normalizeSseEvent({
      event: 'message',
      data: '{"type":"text_delta","data":{"delta":"hello"}}',
    }),
    { type: 'text_delta', data: { delta: 'hello' } },
  );
  assert.deepEqual(
    normalizeSseEvent({
      event: 'message',
      data: '{"type":"done","data":{}}',
    }),
    { type: 'done', data: {} },
  );
});
