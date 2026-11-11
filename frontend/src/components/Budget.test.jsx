import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { makeTrip, scenario } from '../test/fixtures.js';
import { Budget } from './Budget.jsx';

const plain = text => text.replace(/\s/g, ' ');
const INCOMPLETE = scenario({
  known_total_cents: 5000,
  group_known_total_cents: 15000,
  complete: false,
  within_budget: null,
  missing_items: ['Repas', 'Transport'],
});

function tripWith(central) {
  const trip = makeTrip();
  trip.budget.scenarios.central = central;
  return trip;
}

function renderBudget(trip = makeTrip(), props = {}) {
  return render(<Budget trip={trip} canEdit mutate={vi.fn()} announce={vi.fn()} {...props} />);
}

function card(name) {
  return within(screen.getByRole('region', { name }));
}

function row(name, region) {
  const label = region.getByText(name);
  return plain(label.parentElement.querySelector('dd').textContent);
}

describe('amounts come from the server', () => {
  it('displays the server totals, unrelated to the entered lines', () => {
    renderBudget();
    const central = card('Scénario central');
    expect(row('Sous-total connu', central)).toBe('123,45 €');
    expect(row('Total complet', central)).toBe('123,45 €');
    expect(plain(screen.getByText(/^450/).textContent)).toBe('450 €');
  });

  it('switches to the server group totals without multiplying', async () => {
    const user = userEvent.setup();
    renderBudget();
    await user.click(screen.getByRole('radio', { name: 'Pour le groupe' }));
    // 98765 is not 12345 multiplied by 3 travelers: only the server value can show this.
    expect(row('Sous-total connu', card('Scénario central'))).toBe('987,65 €');
    expect(plain(screen.getByText(/^1\s350/).textContent)).toBe('1 350 €');
  });

  it('does not change a total while amounts are being typed', async () => {
    const user = userEvent.setup();
    renderBudget();
    await user.clear(screen.getByLabelText('Transport, scénario central, en euros'));
    await user.type(screen.getByLabelText('Transport, scénario central, en euros'), '900');
    expect(row('Sous-total connu', card('Scénario central'))).toBe('123,45 €');
    expect(screen.getByText(/pas encore enregistrés/)).toBeInTheDocument();
  });

  it('sends the entered amounts only, and an empty field as unknown', async () => {
    const user = userEvent.setup();
    const mutate = vi.fn().mockResolvedValue({});
    renderBudget(makeTrip(), { mutate });
    await user.clear(screen.getByLabelText('Repas, scénario haut, en euros'));
    await user.click(screen.getByRole('button', { name: 'Enregistrer le budget' }));
    const [path, method, body] = mutate.mock.calls[0];
    expect([path, method]).toEqual(['/budget', 'PUT']);
    expect(body.lines.find(item => item.key === 'repas')).toEqual({
      key: 'repas',
      shared: false,
      low: 1000,
      central: 2000,
      high: null,
    });
    expect(JSON.stringify(body)).not.toMatch(/total|within/);
  });

  it('shows the new server totals after a save', () => {
    const { rerender } = renderBudget();
    const updated = tripWith(scenario({ known_total_cents: 777 }));
    rerender(<Budget trip={updated} canEdit mutate={vi.fn()} announce={vi.fn()} />);
    expect(row('Sous-total connu', card('Scénario central'))).toBe('7,77 €');
  });
});

describe('an incomplete budget never looks complete', () => {
  it('shows the subtotal as a subtotal and the total as unknown', () => {
    renderBudget(tripWith(INCOMPLETE));
    const central = card('Scénario central');
    expect(row('Sous-total connu', central)).toBe('50 €');
    expect(row('Total complet', central)).toBe('Inconnu');
    expect(central.getByText(/Manque : Repas, Transport/)).toBeInTheDocument();
  });

  it('refuses to conclude', () => {
    renderBudget(tripWith(INCOMPLETE));
    const central = card('Scénario central');
    expect(central.getByText(/Impossible de conclure/)).toHaveTextContent('2 postes inconnus');
    expect(central.queryByText(/Dans le plafond/)).toBeNull();
    expect(central.queryByText(/Au-dessus du plafond/)).toBeNull();
  });

  it('stays unknown in the group view', async () => {
    const user = userEvent.setup();
    renderBudget(tripWith(INCOMPLETE));
    await user.click(screen.getByRole('radio', { name: 'Pour le groupe' }));
    const central = card('Scénario central');
    expect(row('Sous-total connu', central)).toBe('150 €');
    expect(row('Total complet', central)).toBe('Inconnu');
  });

  it('never says within budget for an incomplete scenario, even if told so', () => {
    renderBudget(tripWith({ ...INCOMPLETE, within_budget: true }));
    expect(card('Scénario central').queryByText(/Dans le plafond/)).toBeNull();
  });

  it('gives a verdict only for a complete scenario', () => {
    renderBudget(tripWith(scenario({ within_budget: false })));
    expect(card('Scénario central').getByText(/Au-dessus du plafond/)).toBeInTheDocument();
    expect(card('Scénario bas').getByText(/Dans le plafond/)).toBeInTheDocument();
  });
});

describe('unknown is not zero', () => {
  function readOnlyWith(central) {
    const trip = makeTrip();
    trip.budget_lines[2] = { ...trip.budget_lines[2], central };
    return trip;
  }

  it('shows an unknown amount as unknown to a reader', () => {
    renderBudget(readOnlyWith(null), { canEdit: false });
    const repas = screen.getByRole('rowheader', { name: 'Repas' }).closest('tr');
    expect(within(repas).getByText('Inconnu')).toBeInTheDocument();
  });

  it('shows an explicit zero as zero to a reader', () => {
    renderBudget(readOnlyWith(0), { canEdit: false });
    const repas = screen.getByRole('rowheader', { name: 'Repas' }).closest('tr');
    expect(within(repas).queryByText('Inconnu')).toBeNull();
    expect(within(repas).getByText('0 €')).toBeInTheDocument();
  });

  it('keeps an unknown field empty and a zero visible for the organizer', () => {
    const trip = readOnlyWith(null);
    trip.budget_lines[3] = { ...trip.budget_lines[3], central: 0 };
    renderBudget(trip);
    expect(screen.getByLabelText('Repas, scénario central, en euros')).toHaveValue('');
    expect(screen.getByLabelText('Activités, scénario central, en euros')).toHaveValue('0');
  });
});

describe('input checks', () => {
  it('flags a low amount above the central one without sending anything', async () => {
    const user = userEvent.setup();
    const mutate = vi.fn();
    renderBudget(makeTrip(), { mutate });
    await user.clear(screen.getByLabelText('Repas, scénario bas, en euros'));
    await user.type(screen.getByLabelText('Repas, scénario bas, en euros'), '500');
    await user.click(screen.getByRole('button', { name: 'Enregistrer le budget' }));
    expect(screen.getByText('Bas ≤ central ≤ haut')).toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
  });

  it('offers no field and no save to a reader', () => {
    renderBudget(makeTrip(), { canEdit: false });
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Enregistrer le budget' })).toBeNull();
  });
});
