import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api.js';
import { DEPARTURES, STYLES, dateRange, dayCount, euros, plural } from '../lib/format.js';
import { getTrip, rememberTrip } from '../lib/storage.js';
import { AMBIENCE_LABELS, Ambience, ambienceFor, useAmbiencePaused } from './Ambience.jsx';
import { Budget } from './Budget.jsx';
import { Carnet } from './Carnet.jsx';
import { Icon } from './Icon.jsx';
import { Landscape } from './Landscape.jsx';
import { PrintSheet } from './PrintSheet.jsx';
import { Programme } from './Programme.jsx';

const TABS = [
  ['programme', 'Programme'],
  ['budget', 'Budget'],
  ['carnet', 'Carnet'],
];
const MISSING_KEY = 'Ce lien est incomplet : la clé de lecture manque.';

function resolveTokens(route) {
  const local = getTrip(route.id);
  return {
    readToken: route.key || local?.readToken || null,
    // The reader view ignores a locally known organizer key on purpose.
    editToken: route.readerView ? null : local?.editToken || null,
  };
}

async function fetchTrip(route) {
  const current = resolveTokens(route);
  const token = current.editToken || current.readToken;
  if (!token) return { current };
  try {
    return { current, result: await api(`/trips/${route.id}`, { token }) };
  } catch (failure) {
    return { current, failure };
  }
}

function Cover({ trip, canEdit, mood, paused, onTogglePause }) {
  const p = trip.preferences;
  const days = dayCount(p.start_date, p.end_date);
  return (
    <section className="cover" aria-labelledby="trip-title">
      <div className="cover-text">
        <p className="eyebrow">Carnet de voyage · {STYLES[p.style]?.label}</p>
        <h1 id="trip-title" className="display cover-title">
          {p.destination}
        </h1>
        <ul className="cover-tickets">
          <li>
            <span>Dates</span>
            {dateRange(p.start_date, p.end_date)}
          </li>
          <li>
            <span>Durée</span>
            {plural(days, 'jour')}
          </li>
          <li>
            <span>Groupe</span>
            {plural(p.travelers, 'voyageur')} · départ {DEPARTURES[p.departure]}
          </li>
          <li>
            <span>Plafond</span>
            {euros(p.budget_cents)} / personne
          </li>
        </ul>
        <p className="tags">
          {trip.is_example && <span className="tag tag-example">Exemple fictif</span>}
          <span className="tag">{canEdit ? 'Vous organisez' : 'Lecture seule'}</span>
          <span className="tag tag-quiet">Révision n° {trip.revision}</span>
        </p>
        <button type="button" className="ambience-toggle" onClick={onTogglePause}>
          <span className={`ambience-dot ambience-dot-${mood}`} aria-hidden="true" />
          {paused ? 'Relancer' : 'Mettre en pause'} l’ambiance « {AMBIENCE_LABELS[mood].toLowerCase()} »
        </button>
      </div>
      <figure className="cover-art">
        <div className={`cover-frame sky-${p.style}`}>
          <Landscape variant={p.style} />
        </div>
        <figcaption className="annotation">illustration originale, pas une photo du lieu</figcaption>
        {trip.is_example && (
          <p className="stamp" aria-hidden="true">
            Exemple
            <br />
            fictif
          </p>
        )}
      </figure>
    </section>
  );
}

export function TripView({ route, onJournal, onDeleted }) {
  const [tokens, setTokens] = useState(() => resolveTokens(route));
  const [trip, setTrip] = useState(null);
  const [error, setError] = useState(null);
  const [conflict, setConflict] = useState(false);
  const [tab, setTab] = useState('programme');
  const [message, setMessage] = useState('');
  const [ambiencePaused, setAmbiencePaused] = useAmbiencePaused();
  const tabRefs = useRef({});

  // State is only updated once the request has answered (in the promise callback).
  const show = useCallback(({ current, result, failure }) => {
    // Without any key there is nothing to fetch: the page shows MISSING_KEY from the tokens state.
    if (!result && !failure) return;
    if (failure) {
      setTokens(current);
      setError(
        failure.status === 404
          ? 'Voyage introuvable : le lien est peut-être incomplet, la clé incorrecte, ou le voyage a été supprimé.'
          : failure.message,
      );
      return;
    }
    setTokens(result.role !== 'organizer' && current.editToken ? { ...current, editToken: null } : current);
    setTrip(result);
    setError(null);
    setConflict(false);
    rememberTrip({
      id: result.id,
      readToken: current.readToken,
      destination: result.preferences.destination,
      start: result.preferences.start_date,
      end: result.preferences.end_date,
      example: result.is_example,
    });
  }, []);

  const load = useCallback(() => fetchTrip(route).then(show), [route, show]);

  // Another route shows another trip: clear the previous one during render, then fetch.
  const [shownRoute, setShownRoute] = useState(route);
  if (shownRoute !== route) {
    setShownRoute(route);
    setTokens(resolveTokens(route));
    setTrip(null);
    setError(null);
  }
  useEffect(() => {
    fetchTrip(route).then(show);
  }, [route, show]);

  const announce = useCallback(text => setMessage(text), []);
  useEffect(() => {
    if (!message) return undefined;
    const timer = setTimeout(() => setMessage(''), 4500);
    return () => clearTimeout(timer);
  }, [message]);
  const canEdit = !!(trip && trip.role === 'organizer' && tokens.editToken);

  const mutate = useCallback(
    async (path, method, body) => {
      try {
        const updated = await api(`/trips/${trip.id}${path}`, {
          method,
          token: tokens.editToken,
          body: { ...body, expected_revision: trip.revision },
        });
        setTrip(updated);
        setConflict(false);
        return updated;
      } catch (e) {
        if (e.code === 'revision_conflict') setConflict(true);
        throw e;
      }
    },
    [trip, tokens.editToken],
  );

  function onTabKey(event, index) {
    const offset = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
    if (!offset) return;
    event.preventDefault();
    const next = TABS[(index + offset + TABS.length) % TABS.length][0];
    setTab(next);
    tabRefs.current[next]?.focus();
  }

  const shownError = error || (!tokens.editToken && !tokens.readToken ? MISSING_KEY : null);
  if (shownError) {
    return (
      <section className="state-page">
        <p className="eyebrow">Carnet introuvable</p>
        <h1 className="display-sm">{shownError}</h1>
        <p className="muted">Vérifiez le lien complet reçu, ou revenez à l’accueil pour ouvrir un voyage récent.</p>
        <div className="inline-actions">
          <button type="button" className="btn btn-ghost" onClick={load}>
            <Icon name="refresh" /> Réessayer
          </button>
          <a className="btn btn-primary" href="#">
            Retour à l’accueil
          </a>
        </div>
      </section>
    );
  }
  if (!trip) {
    return (
      <section className="state-page" aria-busy="true">
        <p className="eyebrow">Ouverture du carnet…</p>
        <div className="skeleton" />
      </section>
    );
  }

  const mood = ambienceFor(trip.preferences);

  return (
    <>
      <Ambience mood={mood} paused={ambiencePaused} />
      <Cover
        trip={trip}
        canEdit={canEdit}
        mood={mood}
        paused={ambiencePaused}
        onTogglePause={() => setAmbiencePaused(value => !value)}
      />
      {trip.is_example && (
        <p className="notice notice-info band">
          <Icon name="info" />{' '}
          <span>
            <strong>Exemple fictif.</strong> Activités et montants illustratifs : aucune disponibilité, réservation ni
            tarif n’est réel ou vérifié. Cette copie vous appartient, vos modifications n’affectent aucun autre voyage.
          </span>
        </p>
      )}
      {conflict && (
        <div className="notice notice-danger band" role="alert">
          <Icon name="alert" />{' '}
          <span>Ce voyage a été modifié ailleurs (autre onglet ou appareil). Rien n’a été écrasé.</span>
          <button type="button" className="btn btn-small btn-ink" onClick={load}>
            <Icon name="refresh" size={16} /> Recharger la dernière version
          </button>
        </div>
      )}

      <nav className="tabs" aria-label="Sections du carnet">
        <div className="tabs-inner" role="tablist">
          {TABS.map(([key, label], index) => (
            <button
              key={key}
              type="button"
              role="tab"
              id={`tab-${key}`}
              aria-controls={`panel-${key}`}
              aria-selected={tab === key}
              tabIndex={tab === key ? 0 : -1}
              ref={node => {
                tabRefs.current[key] = node;
              }}
              onClick={() => setTab(key)}
              onKeyDown={event => onTabKey(event, index)}
              className="tab"
            >
              <span className="tab-number" aria-hidden="true">
                0{index + 1}
              </span>
              {label}
            </button>
          ))}
        </div>
      </nav>

      <p className="sr-only" role="status" aria-live="polite">
        {message}
      </p>
      {message && (
        <p className="toast" aria-hidden="true">
          <Icon name="check" size={16} /> {message}
        </p>
      )}

      <div className="tab-panels">
        <section id="panel-programme" role="tabpanel" aria-labelledby="tab-programme" hidden={tab !== 'programme'}>
          <Programme trip={trip} canEdit={canEdit} mutate={mutate} announce={announce} />
        </section>
        <section id="panel-budget" role="tabpanel" aria-labelledby="tab-budget" hidden={tab !== 'budget'}>
          <Budget trip={trip} canEdit={canEdit} mutate={mutate} announce={announce} />
        </section>
        <section id="panel-carnet" role="tabpanel" aria-labelledby="tab-carnet" hidden={tab !== 'carnet'}>
          <Carnet
            trip={trip}
            readToken={tokens.readToken}
            editToken={canEdit ? tokens.editToken : null}
            onJournal={onJournal}
            onUnlocked={load}
            onPrint={() => window.print()}
            onDeleted={onDeleted}
          />
        </section>
      </div>
      <PrintSheet trip={trip} />
    </>
  );
}
