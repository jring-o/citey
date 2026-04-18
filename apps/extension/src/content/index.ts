import { isGetSelection } from '../shared/messages';
import type { SelectionResultMessage } from '../shared/messages';

chrome.runtime.onMessage.addListener(
  (
    message: unknown,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: SelectionResultMessage) => void,
  ): boolean | undefined => {
    if (isGetSelection(message)) {
      const text = window.getSelection()?.toString().trim() ?? '';
      sendResponse({
        type: 'SELECTION_RESULT',
        requestId: message.requestId,
        text,
      });
      return; // synchronous response — no need to return true
    }

    // Unknown message: warn but do not throw
    console.warn('citey: unknown message', message);
    return;
  },
);
