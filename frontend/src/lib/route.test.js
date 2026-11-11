import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { api } from './api.js';
import { tripHash, useHashRoute } from './route.js';

const ID = '11111111-1111-1111-1111-111111111111';
const SECRET = 'cle-de-lecture-tres-secrete';

function routeFor(hash) {
  window.history.replaceState(null, '', hash || '/');
  return renderHook(() => useHashRoute()).result.current;
}

describe('reading the fragment', () => {
  it('opens the home page by default', () => {
    expect(routeFor('')).toEqual({ page: 'home' });
    expect(routeFor('#inconnu')).toEqual({ page: 'home' });
  });

  it('opens the form and the privacy page', () => {
    expect(routeFor('#nouveau')).toEqual({ page: 'new' });
    expect(routeFor('#confidentialite')).toEqual({ page: 'privacy' });
  });

  it('accepts a link without key', () => {
    expect(routeFor(`#trip=${ID}`)).toEqual({ page: 'trip', id: ID, key: null, readerView: false });
  });

  it('reads a full link', () => {
    expect(routeFor(`#trip=${ID}&key=${SECRET}`)).toEqual({ page: 'trip', id: ID, key: SECRET, readerView: false });
  });

  it('reads a read-only link', () => {
    expect(routeFor(`#trip=${ID}&key=${SECRET}&vue=lecture`).readerView).toBe(true);
  });

  it('follows later changes of the fragment', () => {
    const { result } = renderHook(() => useHashRoute());
    act(() => {
      window.location.hash = '#nouveau';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    expect(result.current.page).toBe('new');
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
  });
});

describe('the key stays in the fragment', () => {
  it('builds links whose key is only in the fragment', () => {
    const url = new URL(`https://runaway.example/${tripHash(ID, SECRET)}`);
    expect(url.hash).toContain(SECRET);
    // What a browser sends in its request line: path and query string, never the fragment.
    expect(url.pathname + url.search).toBe('/');
  });

  it('marks read-only links and escapes the key', () => {
    expect(tripHash(ID, SECRET, true)).toContain('vue=lecture');
    expect(tripHash(ID, SECRET)).not.toContain('vue=');
    expect(tripHash(ID, 'a&b=c')).toBe(`#trip=${ID}&key=a%26b%3Dc`);
  });

  it('sends the key to the API in a header, never in the address', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await api(`/trips/${ID}`, { token: SECRET });
    const [address, options] = fetchMock.mock.calls[0];
    expect(address).toBe(`/api/trips/${ID}`);
    expect(address).not.toContain(SECRET);
    expect(options.headers.Authorization).toBe(`Bearer ${SECRET}`);
  });
});
