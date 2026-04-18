import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Chrome stub — captures the onMessage listener
// ---------------------------------------------------------------------------

type MessageListener = (
  message: unknown,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: unknown) => void,
) => boolean | undefined | void;

let capturedListener: MessageListener | undefined;

const addListenerMock = vi.fn((fn: MessageListener) => {
  capturedListener = fn;
});

vi.stubGlobal('chrome', {
  runtime: {
    onMessage: { addListener: addListenerMock },
    getURL: vi.fn(() => 'chrome-extension://abc/db.json'),
    onInstalled: { addListener: vi.fn() },
  },
  storage: {
    sync: { get: vi.fn(() => Promise.resolve({})) },
    session: { set: vi.fn(() => Promise.resolve()) },
    onChanged: { addListener: vi.fn() },
  },
  contextMenus: {
    create: vi.fn(),
    onClicked: { addListener: vi.fn() },
  },
  action: {
    openPopup: vi.fn(() => Promise.resolve()),
  },
});

// ---------------------------------------------------------------------------
// Mock fetch (for loader)
// ---------------------------------------------------------------------------

const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>();
vi.stubGlobal('fetch', fetchMock);

beforeEach(() => {
  capturedListener = undefined;
  addListenerMock.mockClear();
  fetchMock.mockReset();
  vi.resetModules();
});

/** Helper: import the background script fresh (triggers addListener). */
async function loadBackground(): Promise<void> {
  await import('../index');
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('background onMessage handler', () => {
  it('treats unknown message types as warnings (not throws) (exit criterion #7)', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await loadBackground();

    const sendResponse = vi.fn();
    const unknownMsg = { type: 'TOTALLY_UNKNOWN', requestId: '123' };

    // Should not throw
    expect(() => {
      capturedListener!(
        unknownMsg,
        {} as chrome.runtime.MessageSender,
        sendResponse,
      );
    }).not.toThrow();

    // Should have issued a warning
    expect(warnSpy).toHaveBeenCalledWith(
      'citey: unknown message in background',
      unknownMsg,
    );

    // Should NOT have called sendResponse (unknown messages are silently dropped)
    expect(sendResponse).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it('does not throw on malformed message (no type field) (exit criterion #7)', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await loadBackground();

    const sendResponse = vi.fn();
    const badMsg = { foo: 'bar' };

    expect(() => {
      capturedListener!(
        badMsg,
        {} as chrome.runtime.MessageSender,
        sendResponse,
      );
    }).not.toThrow();

    expect(warnSpy).toHaveBeenCalledWith(
      'citey: unknown message in background',
      badMsg,
    );
    expect(sendResponse).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it('replies with { kind: "miss", reason: "fallback-failed" } when DB load fails (exit criterion #6)', async () => {
    // Mock fetch to reject (simulating missing db.json file)
    fetchMock.mockRejectedValue(new Error('File not found'));

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await loadBackground();

    const sendResponse = vi.fn();
    const matchQuery = { type: 'MATCH_QUERY', requestId: 'req-001', text: 'numpy' };

    // Trigger the listener — returns true for async handling
    const returnVal = capturedListener!(
      matchQuery,
      {} as chrome.runtime.MessageSender,
      sendResponse,
    );

    expect(returnVal).toBe(true);

    // Wait for the async handler to complete
    await new Promise((r) => setTimeout(r, 50));

    expect(sendResponse).toHaveBeenCalledOnce();
    const response = sendResponse.mock.calls[0]![0] as {
      type: string;
      requestId: string;
      result: { kind: string; reason: string };
    };

    expect(response.type).toBe('MATCH_RESULT');
    expect(response.requestId).toBe('req-001');
    expect(response.result.kind).toBe('miss');
    expect(response.result.reason).toBe('fallback-failed');

    errorSpy.mockRestore();
  });
});
