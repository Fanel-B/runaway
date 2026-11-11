// Server-shaped data. Totals are deliberately unrelated to the lines: if the interface
// recalculated anything, the displayed amounts would differ from these.
export const LABELS = {
  transport: 'Transport',
  hebergement: 'Hébergement',
  repas: 'Repas',
  activites: 'Activités',
  annexes: 'Frais annexes',
};

export function line(key, low = 1000, central = 2000, high = 3000, shared = false) {
  return { key, label: LABELS[key], low, central, high, shared };
}

export function scenario(overrides = {}) {
  return {
    known_total_cents: 12345,
    group_known_total_cents: 98765,
    complete: true,
    within_budget: true,
    missing_items: [],
    ...overrides,
  };
}

export function makeTrip(overrides = {}) {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    role: 'organizer',
    revision: 3,
    editable: true,
    is_example: false,
    generator: 'fake',
    retention_months: 12,
    preferences: {
      departure: 'paris',
      destination: 'Normandie',
      start_date: '2027-06-12',
      end_date: '2027-06-13',
      travelers: 3,
      budget_cents: 45000,
      style: 'culture',
    },
    itinerary: {
      title: 'Brouillon',
      days: [
        {
          number: 1,
          title: 'Jour 1',
          stops: [
            {
              name: 'Port',
              city: 'Honfleur',
              description: 'Balade',
              category: 'visite',
              moment: 'matin',
              locked: false,
              needs_review: false,
            },
          ],
        },
        { number: 2, title: 'Jour 2', stops: [] },
      ],
    },
    budget_lines: Object.keys(LABELS).map(key => line(key)),
    budget: {
      ceiling_cents: 45000,
      group_ceiling_cents: 135000,
      margin_percent: 8,
      scenarios: { low: scenario(), central: scenario(), high: scenario() },
    },
    ...overrides,
  };
}
