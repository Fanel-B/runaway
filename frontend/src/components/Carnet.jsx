import { useState } from 'react';
import { api } from '../lib/api.js';
import { CATEGORIES, dayDate } from '../lib/format.js';
import { tripHash } from '../lib/route.js';
import { rememberTrip } from '../lib/storage.js';
import { Icon } from './Icon.jsx';

function downloadJson(trip) {
  // Explicit allow-list: no read or edit secret can end up in the export.
  const data = {
    format: 'runaway-export', version: 1, exported_at: new Date().toISOString(),
    trip: {
      id: trip.id, is_example: trip.is_example, revision: trip.revision, generator: trip.generator,
      created_at: trip.created_at, updated_at: trip.updated_at, preferences: trip.preferences,
      itinerary: trip.itinerary, budget_lines: trip.budget_lines, budget: trip.budget,
    },
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `runaway-${trip.preferences.destination.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-')}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function OrganizerKey({ trip, editToken, onUnlocked }) {
  const [shown, setShown] = useState(false);
  const [copied, setCopied] = useState('');
  const [candidate, setCandidate] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!trip.editable) {
    return <p className="muted">Ce voyage a été créé avant l’arrivée de l’édition. Il garde son lien de lecture mais n’a pas de clé organisateur : il reste en lecture seule.</p>;
  }

  if (editToken) {
    return (
      <>
        <p className="muted">
          La clé organisateur est conservée <strong>uniquement dans ce navigateur</strong> (stockage local), jamais dans le lien partagé.
          Elle disparaît si vous videz les données du site ou naviguez en privé, elle n’est pas synchronisée entre appareils,
          et toute personne qui utilise ce profil de navigateur peut modifier le voyage.
        </p>
        {shown ? (
          <div className="key-box">
            <label htmlFor="organizer-key">Clé organisateur</label>
            <input id="organizer-key" readOnly value={editToken} onFocus={e => e.target.select()} />
            <div className="inline-actions">
              <button type="button" className="btn btn-small btn-ghost" onClick={async () => setCopied(await copy(editToken) ? 'Clé copiée.' : 'Copie impossible : sélectionnez la clé.')}>
                <Icon name="copy" size={16} /> Copier la clé
              </button>
              <button type="button" className="btn btn-small btn-quiet" onClick={() => setShown(false)}>Masquer</button>
            </div>
            <p className="fine">À garder pour vous ou un co-organisateur de confiance : elle permet de tout modifier.</p>
          </div>
        ) : (
          <button type="button" className="btn btn-small btn-ghost" onClick={() => setShown(true)}><Icon name="key" size={16} /> Afficher la clé pour la sauvegarder</button>
        )}
        <p className="fine" role="status">{copied}</p>
      </>
    );
  }

  async function unlock(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const result = await api(`/trips/${trip.id}`, { token: candidate.trim() });
      if (result.role !== 'organizer') throw new Error('Cette clé ne donne qu’un accès en lecture.');
      rememberTrip({ id: trip.id, editToken: candidate.trim() });
      onUnlocked();
    } catch (e) {
      setError(e.status === 404 ? 'Clé incorrecte pour ce voyage.' : e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={unlock} className="key-box" noValidate>
      <p className="muted">Vous organisez ce voyage depuis un autre appareil ? Collez la clé organisateur sauvegardée. Elle restera dans ce navigateur.</p>
      <label htmlFor="paste-key">Clé organisateur</label>
      <input id="paste-key" value={candidate} onChange={e => setCandidate(e.target.value)} autoComplete="off" spellCheck="false"
        aria-invalid={!!error} aria-describedby={error ? 'paste-key-error' : undefined} />
      {error && <p className="field-error" id="paste-key-error"><Icon name="alert" size={16} /> {error}</p>}
      <button type="submit" className="btn btn-small btn-ghost" disabled={busy || !candidate.trim()}>{busy ? 'Vérification…' : 'Activer l’édition'}</button>
    </form>
  );
}

export function Carnet({ trip, readToken, editToken, onJournal, onUnlocked, onPrint }) {
  const [copied, setCopied] = useState('');
  const shareUrl = `${window.location.origin}${window.location.pathname}${tripHash(trip.id, readToken, true)}`;
  const decisions = trip.itinerary.days.flatMap(day => day.stops.filter(stop => stop.locked).map(stop => ({ day, stop })));
  const reviews = trip.itinerary.days.flatMap(day => day.stops.filter(stop => stop.needs_review).map(stop => ({ day, stop })));

  return (
    <div className="carnet">
      <section className="carnet-share" aria-labelledby="share-title">
        <p className="eyebrow">Pour les amis</p>
        <h3 id="share-title" className="display-xs">Tout le monde sur la même page.</h3>
        <p>Ce lien donne <strong>uniquement</strong> un accès en lecture : programme, budget et plafond. Il ne contient pas la clé organisateur.</p>
        <label htmlFor="share-link" className="sr-only">Lien de lecture seule</label>
        <input id="share-link" readOnly value={shareUrl} onFocus={e => e.target.select()} />
        <div className="inline-actions">
          <button type="button" className="btn btn-sun" onClick={async () => setCopied(await copy(shareUrl) ? 'Lien copié.' : 'Copie impossible : sélectionnez le lien.')}>
            <Icon name="copy" size={16} /> Copier le lien de lecture
          </button>
          <a className="btn btn-on-dark" href={tripHash(trip.id, readToken, true)} target="_blank" rel="noopener noreferrer">
            <Icon name="eye" size={16} /> Voir comme un ami
          </a>
        </div>
        <p className="fine" role="status">{copied}</p>
        <p className="fine">En local, le lien ne fonctionne que sur cette machine. Le partage à distance demandera un déploiement.</p>
      </section>

      <section className="carnet-decisions ruled" aria-labelledby="decisions-title">
        <p className="eyebrow">Résumé</p>
        <h3 id="decisions-title" className="display-xs">Ce qu’on garde</h3>
        {decisions.length ? (
          <ul className="decision-list">
            {decisions.map(({ day, stop }) => (
              <li key={`${day.number}-${stop.name}`}>
                <Icon name="lock" size={16} />
                <span><strong>J{day.number}</strong> · {stop.name} <span className="fine">({CATEGORIES[stop.category]}, {dayDate(trip.preferences.start_date, day.number)})</span></span>
              </li>
            ))}
          </ul>
        ) : <p className="muted">Aucune décision verrouillée pour l’instant. Utilisez « On garde » dans le programme.</p>}
        {reviews.length > 0 && (
          <>
            <h4 className="subhead">À revoir</h4>
            <ul className="decision-list">
              {reviews.map(({ day, stop }) => (
                <li key={`r-${day.number}-${stop.name}`}><Icon name="alert" size={16} /><span><strong>J{day.number}</strong> · {stop.name} : coûts et trajets associés</span></li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="carnet-export" aria-labelledby="export-title">
        <p className="eyebrow">Emporter</p>
        <h3 id="export-title" className="display-xs">Exporter ou imprimer</h3>
        <p className="muted">L’export JSON contient le voyage sans aucun secret. L’impression met en page le programme complet et le budget.</p>
        <div className="inline-actions">
          <button type="button" className="btn btn-ink" onClick={() => downloadJson(trip)}><Icon name="download" size={16} /> Export JSON</button>
          <button type="button" className="btn btn-ghost" onClick={onPrint}><Icon name="print" size={16} /> Imprimer le programme</button>
        </div>
      </section>

      <section className="carnet-key" aria-labelledby="key-title">
        <p className="eyebrow">Droits</p>
        <h3 id="key-title" className="display-xs">Clé organisateur</h3>
        <OrganizerKey trip={trip} editToken={editToken} onUnlocked={onUnlocked} />
      </section>

      <section className="carnet-info" aria-labelledby="info-title">
        <p className="eyebrow">Fiche technique</p>
        <h3 id="info-title" className="display-xs">Coulisses</h3>
        <dl className="facts">
          <div><dt>Révision</dt><dd>n° {trip.revision}</dd></div>
          <div><dt>Générateur</dt><dd>{trip.generator === 'exemple' ? 'Jeu d’exemple fictif' : `${trip.generator} (simulé)`}</dd></div>
          <div><dt>Lieux</dt><dd>Non vérifiés, aucune carte</dd></div>
          <div><dt>Votre accès</dt><dd>{editToken ? 'Organisateur' : 'Lecture seule'}</dd></div>
        </dl>
        <button type="button" className="btn btn-small btn-ghost" onClick={onJournal}><Icon name="book" size={16} /> Ouvrir le journal du projet</button>
      </section>
    </div>
  );
}
