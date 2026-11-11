// Trips known by this browser. The organizer key lives only here, never in a shared URL.
const KEY = 'runaway.voyages';

function readAll() {
  try {
    const value = JSON.parse(window.localStorage.getItem(KEY) || '[]');
    return Array.isArray(value) ? value.filter(entry => entry && entry.id) : [];
  } catch {
    return [];
  }
}

function writeAll(entries) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(entries));
    return true;
  } catch {
    return false;
  }
}

export function listTrips() {
  return readAll().sort((a, b) => (b.seenAt || '').localeCompare(a.seenAt || ''));
}

export function getTrip(id) {
  return readAll().find(entry => entry.id === id) || null;
}

export function rememberTrip(entry) {
  const entries = readAll();
  const previous = entries.find(item => item.id === entry.id) || {};
  const merged = {
    ...previous,
    ...Object.fromEntries(Object.entries(entry).filter(([, v]) => v != null)),
    seenAt: new Date().toISOString(),
  };
  return writeAll([merged, ...entries.filter(item => item.id !== entry.id)].slice(0, 20));
}

export function forgetTrip(id) {
  writeAll(readAll().filter(entry => entry.id !== id));
}
