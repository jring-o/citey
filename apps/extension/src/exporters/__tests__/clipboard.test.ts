import { describe, it, expect, vi, beforeEach } from 'vitest';
import { copyToClipboard } from '../clipboard';

// ---------------------------------------------------------------------------
// Clipboard tests
// ---------------------------------------------------------------------------

describe('copyToClipboard', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns { ok: true } when navigator.clipboard.writeText succeeds', async () => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });

    const result = await copyToClipboard('hello');
    expect(result).toEqual({ ok: true });
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('hello');
  });

  it('falls back to execCommand("copy") when writeText rejects', async () => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockRejectedValue(new Error('denied')),
      },
    });

    const execCommandMock = vi.fn().mockReturnValue(true);
    document.execCommand = execCommandMock;

    const result = await copyToClipboard('fallback text');
    expect(result).toEqual({ ok: true });
    expect(execCommandMock).toHaveBeenCalledWith('copy');
  });

  it('returns { ok: false } when both writeText and execCommand fail', async () => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockRejectedValue(new Error('denied')),
      },
    });

    const execCommandMock = vi.fn().mockReturnValue(false);
    document.execCommand = execCommandMock;

    const result = await copyToClipboard('fail text');
    expect(result).toEqual({
      ok: false,
      reason: "Couldn't copy. Use Export .bib instead.",
    });
  });

  it('returns { ok: false } when both writeText throws and execCommand throws', async () => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockRejectedValue(new Error('denied')),
      },
    });

    const execCommandMock = vi.fn().mockImplementation(() => {
      throw new Error('execCommand not supported');
    });
    document.execCommand = execCommandMock;

    const result = await copyToClipboard('error text');
    expect(result).toEqual({
      ok: false,
      reason: "Couldn't copy. Use Export .bib instead.",
    });
  });
});
