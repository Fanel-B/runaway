import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { EditStopDialog } from './EditStopDialog.jsx';

const stop = { name: 'Port', city: 'Honfleur', description: 'Balade', category: 'visite' };
const target = { day: 2, index: 0, stop };

function renderDialog(value, props = {}) {
  return render(<EditStopDialog target={value} onClose={vi.fn()} mutate={vi.fn()} announce={vi.fn()} {...props} />);
}

// Same life cycle as the page: applying closes the dialog by clearing the target.
function Harness({ mutate }) {
  const [current, setCurrent] = useState(target);
  return (
    <>
      <p>page encore là</p>
      <EditStopDialog target={current} onClose={() => setCurrent(null)} mutate={mutate} announce={vi.fn()} />
    </>
  );
}

describe('while the activity is not ready', () => {
  it('displays nothing and does not crash', () => {
    const { container } = renderDialog(null);
    expect(container.querySelector('dialog')).not.toHaveAttribute('open');
    expect(container.querySelector('form')).toBeNull();
    expect(container.querySelector('input, textarea, select')).toBeNull();
  });

  it('fills the form once the activity arrives', () => {
    const { rerender } = renderDialog(null);
    rerender(<EditStopDialog target={target} onClose={vi.fn()} mutate={vi.fn()} announce={vi.fn()} />);
    expect(screen.getByLabelText('Nom')).toHaveValue('Port');
    expect(screen.getByLabelText('Ville ou lieu')).toHaveValue('Honfleur');
  });
});

describe('the blank page regression', () => {
  it('survives the target disappearing while the form is open', () => {
    const { container, rerender } = renderDialog(target);
    expect(screen.getByLabelText('Nom')).toBeInTheDocument();
    expect(() =>
      rerender(<EditStopDialog target={null} onClose={vi.fn()} mutate={vi.fn()} announce={vi.fn()} />),
    ).not.toThrow();
    expect(container.querySelector('form')).toBeNull();
  });

  it('keeps the page after edit, compare and apply', async () => {
    const user = userEvent.setup();
    const mutate = vi.fn().mockResolvedValue({});
    render(<Harness mutate={mutate} />);

    await user.clear(screen.getByLabelText('Nom'));
    await user.type(screen.getByLabelText('Nom'), 'Phare');
    await user.click(screen.getByRole('button', { name: 'Comparer les changements' }));
    expect(screen.getByRole('table', { name: 'Avant et après' })).toHaveTextContent('Phare');
    await user.click(screen.getByRole('button', { name: 'Appliquer' }));

    expect(mutate).toHaveBeenCalledWith('/days/2/stops/0', 'PATCH', { name: 'Phare' });
    expect(screen.getByText('page encore là')).toBeInTheDocument();
    expect(screen.queryByRole('table', { name: 'Avant et après' })).toBeNull();
  });
});

describe('editing', () => {
  it('refuses to compare without a change', () => {
    renderDialog(target);
    expect(screen.getByRole('button', { name: 'Aucun changement' })).toBeDisabled();
  });

  it('reports an emptied field where it happened', async () => {
    const user = userEvent.setup();
    renderDialog(target);
    await user.clear(screen.getByLabelText('Nom'));
    await user.click(screen.getByRole('button', { name: 'Comparer les changements' }));
    expect(screen.getByText(/Nom : ce champ ne peut pas être vide/)).toBeInTheDocument();
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('keeps what was typed when the server refuses', async () => {
    const user = userEvent.setup();
    const failure = Object.assign(new Error('Le voyage a changé.'), { code: 'revision_conflict' });
    const onClose = vi.fn();
    renderDialog(target, { mutate: vi.fn().mockRejectedValue(failure), onClose });
    await user.type(screen.getByLabelText('Nom'), ' sud');
    await user.click(screen.getByRole('button', { name: 'Comparer les changements' }));
    await user.click(screen.getByRole('button', { name: 'Appliquer' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Votre saisie est conservée');
    expect(onClose).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Revenir à la saisie' }));
    expect(screen.getByLabelText('Nom')).toHaveValue('Port sud');
  });
});
