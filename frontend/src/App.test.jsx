import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import { rememberTrip } from './lib/storage.js';
import { makeTrip } from './test/fixtures.js';

const ID = '11111111-1111-1111-1111-111111111111';
const READ = 'cle-de-lecture';
const EDIT = 'cle-organisateur';
const STORE = 'runaway.voyages';

function answer(body, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

let fetchMock;

beforeEach(() => {
  fetchMock = vi.fn().mockImplementation(() => Promise.resolve(answer(makeTrip())));
  vi.stubGlobal('fetch', fetchMock);
});

function open(hash) {
  // replaceState fires no late hashchange event that would reload the page mid-test.
  window.history.replaceState(null, '', hash || '/');
  return render(<App />);
}

describe('no page is blank', () => {
  it('renders the home page', () => {
    open('');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Un départ ensemble');
    expect(screen.getByRole('link', { name: /Préparer notre voyage/ })).toHaveAttribute('href', '#nouveau');
  });

  it('renders the form', () => {
    open('#nouveau');
    expect(screen.getByLabelText(/Destination/)).toBeInTheDocument();
  });

  it('renders the privacy page, reachable from the footer', () => {
    open('#confidentialite');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Ce que Runaway garde');
    expect(screen.getByRole('link', { name: 'Confidentialité' })).toHaveAttribute('href', '#confidentialite');
  });

  it('renders a trip with its three tabs', async () => {
    open(`#trip=${ID}&key=${READ}`);
    expect(await screen.findByRole('heading', { level: 1, name: 'Normandie' })).toBeInTheDocument();
    expect(screen.getAllByRole('tab').map(tab => tab.textContent)).toEqual(['01Programme', '02Budget', '03Carnet']);
  });

  it('explains a link without key instead of showing nothing', () => {
    open(`#trip=${ID}`);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('la clé de lecture manque');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('explains an unknown trip', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(answer({ detail: 'Voyage introuvable.' }, 404)));
    open(`#trip=${ID}&key=${READ}`);
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Voyage introuvable');
  });

  it('shows a message when a screen crashes', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    function Broken() {
      throw new Error('panne');
    }
    render(
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(document.body.textContent.trim()).not.toBe('');
  });
});

describe('focus on load', () => {
  it('leaves the first Tab to the skip link, even in StrictMode', () => {
    window.history.replaceState(null, '', '/');
    render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
    expect(document.activeElement).toBe(document.body);
  });
});

describe('a damaged browser storage does not take the page down', () => {
  it.each([
    ['invalid JSON', 'not json'],
    ['the wrong shape', '{"a":1}'],
    ['bad fields', JSON.stringify([{ id: 'a', seenAt: 5, destination: { x: 1 }, start: 12, end: 'hier' }])],
  ])('renders the home page with %s', (_name, raw) => {
    window.localStorage.setItem(STORE, raw);
    open('');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Un départ ensemble');
  });

  it('renders a trip when writing to the storage fails', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Plein', 'QuotaExceededError');
    });
    open(`#trip=${ID}&key=${READ}`);
    expect(await screen.findByRole('heading', { level: 1, name: 'Normandie' })).toBeInTheDocument();
  });
});

describe('secrets and roles in the page', () => {
  it('never puts a key in an API address', async () => {
    open(`#trip=${ID}&key=${READ}`);
    await screen.findByRole('heading', { level: 1, name: 'Normandie' });
    const [address, options] = fetchMock.mock.calls[0];
    expect(address).toBe(`/api/trips/${ID}`);
    expect(options.headers.Authorization).toBe(`Bearer ${READ}`);
  });

  it('uses the local organizer key on a normal visit', async () => {
    rememberTrip({ id: ID, readToken: READ, editToken: EDIT });
    open(`#trip=${ID}&key=${READ}`);
    await screen.findByRole('heading', { level: 1, name: 'Normandie' });
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe(`Bearer ${EDIT}`);
  });

  it('ignores the organizer key in the reader view', async () => {
    rememberTrip({ id: ID, readToken: READ, editToken: EDIT });
    fetchMock.mockImplementation(() => Promise.resolve(answer(makeTrip({ role: 'reader' }))));
    open(`#trip=${ID}&key=${READ}&vue=lecture`);
    await screen.findByRole('heading', { level: 1, name: 'Normandie' });
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe(`Bearer ${READ}`);
    expect(screen.getAllByText('Lecture seule').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /Modifier/ })).toBeNull();
  });

  it('shares a link without the organizer key', async () => {
    const user = userEvent.setup();
    rememberTrip({ id: ID, readToken: READ, editToken: EDIT });
    open(`#trip=${ID}&key=${READ}`);
    await screen.findByRole('heading', { level: 1, name: 'Normandie' });
    await user.click(screen.getByRole('tab', { name: /Carnet/ }));
    const link = screen.getByLabelText('Lien de lecture seule').value;
    expect(link).toContain(READ);
    expect(link).toContain('vue=lecture');
    expect(link).not.toContain(EDIT);
  });

  it('offers deletion to the organizer only', async () => {
    const user = userEvent.setup();
    fetchMock.mockImplementation(() => Promise.resolve(answer(makeTrip({ role: 'reader' }))));
    open(`#trip=${ID}&key=${READ}`);
    await screen.findByRole('heading', { level: 1, name: 'Normandie' });
    await user.click(screen.getByRole('tab', { name: /Carnet/ }));
    expect(within(screen.getByRole('tabpanel', { name: /Carnet/ })).queryByText('Supprimer ce voyage')).toBeNull();
  });
});
