import { afterEach, describe, expect, it, vi } from 'vitest';
import { forgetTrip, getTrip, listTrips, rememberTrip } from './storage.js';

const KEY = 'runaway.voyages';
const original = Object.getOwnPropertyDescriptor(window, 'localStorage');

function makeUnavailable() {
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    get() {
      throw new DOMException('Accès refusé', 'SecurityError');
    },
  });
}

afterEach(() => {
  if (original) Object.defineProperty(window, 'localStorage', original);
});

describe('normal use', () => {
  it('remembers, merges and forgets a trip', () => {
    rememberTrip({ id: 'a', readToken: 'r', editToken: 'e', destination: 'Lille' });
    rememberTrip({ id: 'a', readToken: 'r', destination: 'Lille centre' });
    // The organizer key survives a later visit that does not carry it.
    expect(getTrip('a')).toMatchObject({ editToken: 'e', destination: 'Lille centre' });
    forgetTrip('a');
    expect(getTrip('a')).toBeNull();
  });

  it('keeps the 20 most recent trips', () => {
    for (let i = 0; i < 25; i += 1) rememberTrip({ id: `t${i}` });
    expect(listTrips()).toHaveLength(20);
    expect(getTrip('t24')).not.toBeNull();
    expect(getTrip('t0')).toBeNull();
  });
});

describe('corrupted content never breaks the page', () => {
  it.each([['not json'], ['{"a":1}'], ['null'], ['42'], ['']])('ignores %s', raw => {
    window.localStorage.setItem(KEY, raw);
    expect(listTrips()).toEqual([]);
    expect(getTrip('a')).toBeNull();
  });

  it('drops entries that are not trips and keeps the valid ones', () => {
    window.localStorage.setItem(KEY, JSON.stringify([null, 3, 'x', {}, { id: 7 }, { id: 'ok', destination: 'Lille' }]));
    expect(listTrips().map(trip => trip.id)).toEqual(['ok']);
  });

  it('survives fields of the wrong type', () => {
    window.localStorage.setItem(
      KEY,
      JSON.stringify([
        { id: 'a', seenAt: 5, destination: { x: 1 }, start: 12, end: 'hier' },
        { id: 'b', seenAt: '2026-01-01T00:00:00Z', destination: 'Lille', start: '2027-01-01', end: '2027-01-02' },
      ]),
    );
    const [first, second] = listTrips();
    expect(first).toMatchObject({ id: 'b', destination: 'Lille', start: '2027-01-01' });
    expect(second).toEqual({ id: 'a' });
  });

  it('can write again over corrupted content', () => {
    window.localStorage.setItem(KEY, 'not json');
    expect(rememberTrip({ id: 'a' })).toBe(true);
    expect(getTrip('a')).not.toBeNull();
  });
});

describe('a full or unavailable storage never breaks the page', () => {
  it('reports a failed write when the quota is exceeded', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Plein', 'QuotaExceededError');
    });
    expect(rememberTrip({ id: 'a' })).toBe(false);
    expect(() => forgetTrip('a')).not.toThrow();
  });

  it('works as an empty list when access is refused', () => {
    makeUnavailable();
    expect(listTrips()).toEqual([]);
    expect(getTrip('a')).toBeNull();
    expect(rememberTrip({ id: 'a' })).toBe(false);
    expect(() => forgetTrip('a')).not.toThrow();
  });
});
