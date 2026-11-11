import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

// jsdom has no layout and no modal dialog: the smallest stand-ins the components need.
HTMLDialogElement.prototype.showModal = function showModal() {
  this.setAttribute('open', '');
};
HTMLDialogElement.prototype.close = function close() {
  this.removeAttribute('open');
};

beforeEach(() => {
  window.scrollTo = vi.fn();
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  // Not location.hash: its late hashchange event would land in the next test.
  window.history.replaceState(null, '', '/');
});
