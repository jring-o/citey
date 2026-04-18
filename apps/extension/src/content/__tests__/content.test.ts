import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Stub chrome.runtime.onMessage before importing the content script
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

// Build a minimal chrome stub
const chromeStub = {
  runtime: {
    onMessage: {
      addListener: addListenerMock,
    },
  },
};

// Assign to globalThis so the content script finds `chrome` at import time
vi.stubGlobal('chrome', chromeStub);

beforeEach(() => {
  capturedListener = undefined;
  addListenerMock.mockClear();
  vi.resetModules();
});

/** Helper: import the content script fresh (triggers addListener). */
async function loadContentScript(): Promise<void> {
  await import('../../content/index');
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('content script', () => {
  it('registers a chrome.runtime.onMessage listener on load', async () => {
    await loadContentScript();
    expect(addListenerMock).toHaveBeenCalledOnce();
    expect(typeof capturedListener).toBe('function');
  });

  it('replies to GET_SELECTION with the trimmed selection and same requestId', async () => {
    // Stub window.getSelection
    const selectionStub = { toString: () => '  Hello World  ' };
    vi.stubGlobal('getSelection', () => selectionStub);

    await loadContentScript();

    const sendResponse = vi.fn();
    capturedListener!(
      { type: 'GET_SELECTION', requestId: 'req-001' },
      {} as chrome.runtime.MessageSender,
      sendResponse,
    );

    expect(sendResponse).toHaveBeenCalledOnce();
    expect(sendResponse).toHaveBeenCalledWith({
      type: 'SELECTION_RESULT',
      requestId: 'req-001',
      text: 'Hello World',
    });

    vi.unstubAllGlobals();
    vi.stubGlobal('chrome', chromeStub);
  });

  it('replies with empty string when nothing is selected', async () => {
    vi.stubGlobal('getSelection', () => null);

    await loadContentScript();

    const sendResponse = vi.fn();
    capturedListener!(
      { type: 'GET_SELECTION', requestId: 'req-002' },
      {} as chrome.runtime.MessageSender,
      sendResponse,
    );

    expect(sendResponse).toHaveBeenCalledWith({
      type: 'SELECTION_RESULT',
      requestId: 'req-002',
      text: '',
    });

    vi.unstubAllGlobals();
    vi.stubGlobal('chrome', chromeStub);
  });

  it('warns on unknown message and does not throw', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await loadContentScript();

    const sendResponse = vi.fn();
    const unknownMsg = { type: 'UNKNOWN_TYPE', requestId: '123' };

    // Should not throw
    expect(() => {
      capturedListener!(
        unknownMsg,
        {} as chrome.runtime.MessageSender,
        sendResponse,
      );
    }).not.toThrow();

    expect(warnSpy).toHaveBeenCalledWith('citey: unknown message', unknownMsg);
    expect(sendResponse).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it('warns on malformed message (no type) and does not throw', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await loadContentScript();

    const sendResponse = vi.fn();
    const badMsg = { foo: 'bar' };

    expect(() => {
      capturedListener!(
        badMsg,
        {} as chrome.runtime.MessageSender,
        sendResponse,
      );
    }).not.toThrow();

    expect(warnSpy).toHaveBeenCalledWith('citey: unknown message', badMsg);
    expect(sendResponse).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });
});
