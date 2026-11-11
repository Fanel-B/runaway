import { describe, expect, it } from 'vitest';
import { centsToInput, dateRange, dayCount, dayDate, euros, inputToCents, plural } from './format.js';

// Intl separates digits and currency with non-breaking spaces.
const plain = text => text.replace(/\s/g, ' ');

describe('euros', () => {
  it('formats whole and decimal amounts', () => {
    expect(plain(euros(45000))).toBe('450 €');
    expect(plain(euros(35640))).toBe('356,40 €');
    expect(plain(euros(123456789))).toBe('1 234 567,89 €');
  });

  it('shows an explicit zero as zero', () => {
    expect(plain(euros(0))).toBe('0 €');
  });

  it.each([null, undefined])('never shows an unknown amount (%s) as zero', value => {
    expect(euros(value)).toBe('inconnu');
    expect(euros(value)).not.toContain('0');
  });
});

describe('amount inputs keep unknown and zero apart', () => {
  it('reads an empty field as unknown, and 0 as a real zero', () => {
    expect(inputToCents('')).toBeNull();
    expect(inputToCents('   ')).toBeNull();
    expect(inputToCents('0')).toBe(0);
  });

  it('writes unknown as empty, and zero as 0', () => {
    expect(centsToInput(null)).toBe('');
    expect(centsToInput(undefined)).toBe('');
    expect(centsToInput(0)).toBe('0');
  });

  it('accepts French decimals and exact cents', () => {
    expect(inputToCents('12,50')).toBe(1250);
    expect(inputToCents('1 200')).toBe(120000);
    expect(inputToCents('19.99')).toBe(1999);
    expect(centsToInput(1250)).toBe('12,50');
    expect(centsToInput(120000)).toBe('1200');
  });

  it.each(['abc', '-5', '1,234', '1.2.3'])('refuses %s instead of guessing', value => {
    expect(inputToCents(value)).toBeNaN();
  });
});

describe('plural', () => {
  it.each([
    [0, 'jour', '0 jour'],
    [1, 'jour', '1 jour'],
    [2, 'jour', '2 jours'],
  ])('%i %s', (count, word, expected) => {
    expect(plural(count, word)).toBe(expected);
  });

  it('uses an irregular plural when given', () => {
    expect(plural(2, 'poste inconnu', 'postes inconnus')).toBe('2 postes inconnus');
  });
});

describe('dates', () => {
  it('shows a range and a single day', () => {
    expect(dateRange('2027-05-14', '2027-05-16')).toBe('14 mai → 16 mai 2027');
    expect(dateRange('2027-05-14', '2027-05-14')).toBe('14 mai 2027');
  });

  it('stays empty without both dates', () => {
    expect(dateRange('', '2027-05-16')).toBe('');
    expect(dateRange('2027-05-14', null)).toBe('');
  });

  it('counts days inclusively, across months and leap years', () => {
    expect(dayCount('2027-05-14', '2027-05-14')).toBe(1);
    expect(dayCount('2027-01-30', '2027-02-02')).toBe(4);
    expect(dayCount('2028-02-28', '2028-03-01')).toBe(3);
    expect(dayCount('', '2027-05-14')).toBeNull();
  });

  it('gives the date of a numbered day', () => {
    expect(dayDate('2027-05-31', 2)).toBe('mar. 1 juin');
  });
});
