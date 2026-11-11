export const DEPARTURES = { paris: 'Paris', toulouse: 'Toulouse' };

export const STYLES = {
  equilibre: { label: 'Un peu de tout', hint: 'Villages, nature et terrasses' },
  nature: { label: 'Grands espaces', hint: 'Sentiers, sommets, ciel ouvert' },
  culture: { label: 'Ville et culture', hint: 'Ruelles, musées, marchés' },
  plage: { label: 'Au bord de l’eau', hint: 'Baignades, criques, sable' },
};

export const CATEGORIES = {
  visite: 'Visite', activite: 'Activité', temps_libre: 'Temps libre', repas: 'Repas', trajet: 'Trajet',
};

export const MOMENTS = [
  ['matin', 'Matin'], ['midi', 'Midi'], ['apres_midi', 'Après-midi'], ['soir', 'Soir'],
];

const euroFormats = {
  0: new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }),
  2: new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }),
};

export function euros(cents) {
  if (cents == null) return '—';
  return euroFormats[cents % 100 === 0 ? 0 : 2].format(cents / 100);
}

export function centsToInput(cents) {
  if (cents == null) return '';
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2).replace('.', ',');
}

// '' means unknown (null); '0' is an explicit zero; anything else unparsable is NaN.
export function inputToCents(value) {
  const text = String(value).replace(/\s/g, '').replace(',', '.');
  if (text === '') return null;
  if (!/^\d{1,6}(\.\d{1,2})?$/.test(text)) return Number.NaN;
  return Math.round(Number(text) * 100);
}

function utcDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

const dayFormat = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'long', timeZone: 'UTC' });
const fullFormat = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const shortFormat = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', timeZone: 'UTC' });

export function dateRange(start, end) {
  if (!start || !end) return '';
  if (start === end) return fullFormat.format(utcDate(start));
  return `${shortFormat.format(utcDate(start))} → ${fullFormat.format(utcDate(end))}`;
}

export function dayDate(start, number) {
  const date = utcDate(start);
  date.setUTCDate(date.getUTCDate() + number - 1);
  return dayFormat.format(date);
}

export function dayCount(start, end) {
  if (!start || !end) return null;
  return Math.round((utcDate(end) - utcDate(start)) / 86_400_000) + 1;
}

export function plural(count, word, many = `${word}s`) {
  return `${count} ${count > 1 ? many : word}`;
}
