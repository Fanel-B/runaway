import { useState } from 'react';
import { api } from '../lib/api.js';
import { DEPARTURES, STYLES, dateRange } from '../lib/format.js';
import { go, tripHash } from '../lib/route.js';
import { forgetTrip, listTrips, rememberTrip } from '../lib/storage.js';
import { INSPIRATIONS } from '../data/inspirations.js';
import { Icon } from './Icon.jsx';
import { Landscape } from './Landscape.jsx';

const CHAPTERS = [
  ['01', 'Programme', 'Des journées racontées du matin au soir. On modifie, on compare avant d’appliquer, et « on garde » ce qui est décidé.', 'chapter-sun'],
  ['02', 'Budget', 'Trois scénarios, cinq postes. Un champ vide reste inconnu : impossible de conclure tant qu’il manque un poste.', 'chapter-rose'],
  ['03', 'Carnet', 'Un lien de lecture pour les amis, l’export, l’impression et le résumé de ce qui est verrouillé.', 'chapter-sage'],
];

export function Home({ onInspiration }) {
  const [recent, setRecent] = useState(listTrips);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function openExample() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const created = await api('/trips/example', { method: 'POST' });
      rememberTrip({ id: created.id, readToken: created.read_token, editToken: created.edit_token, example: true, destination: 'Côte basque (exemple)' });
      go(tripHash(created.id, created.read_token));
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }

  function forget(id) {
    forgetTrip(id);
    setRecent(listTrips());
  }

  return (
    <>
      <section className="hero sky-equilibre" aria-labelledby="hero-title">
        <div className="hero-text">
          <p className="eyebrow">Carnet d’escapades entre amis · départ de Paris ou Toulouse</p>
          <h1 id="hero-title" className="display">Des envies en vrac.<br /><em>Un départ ensemble.</em></h1>
          <p className="lead">Posez les contraintes du groupe, racontez chaque journée et gardez un budget honnête, qui montre aussi ce qu’on ne sait pas encore.</p>
          <div className="hero-actions">
            <a className="btn btn-primary" href="#nouveau">Préparer notre voyage <Icon name="arrow" /></a>
            <button type="button" className="btn btn-ghost" onClick={openExample} disabled={busy} aria-busy={busy}>
              {busy ? 'Ouverture de l’exemple…' : 'Explorer un exemple'}
            </button>
          </div>
          {error && <p className="notice notice-danger" role="alert"><Icon name="alert" /> {error}</p>}
          <p className="demo-note"><Icon name="info" /> Mode démonstration : programmes simulés, aucun prix ni lieu vérifié. L’exemple est une copie fictive, modifiable sans toucher à vos voyages.</p>
          <p className="annotation hero-annotation" aria-hidden="true">3 amis, 1 plafond, 0 tableur ↘</p>
        </div>
        <Landscape variant="equilibre" className="hero-landscape" />
      </section>

      <section className="postcards" aria-labelledby="ideas-title">
        <div className="section-head">
          <p className="eyebrow">Des idées pour démarrer</p>
          <h2 id="ideas-title" className="display-sm">Choisissez une carte, on préremplit le brief.</h2>
          <p className="muted">Rien n’est réservé ni vérifié : ce sont des points de départ à discuter.</p>
        </div>
        <ul className="postcard-row">
          {INSPIRATIONS.map(idea => (
            <li key={idea.id} style={{ '--tilt': `${idea.tilt}deg` }}>
              <button type="button" className="postcard" onClick={() => onInspiration(idea)}>
                <span className={`postcard-art sky-${idea.style}`}><Landscape variant={idea.style} /></span>
                <span className="postcard-label">{STYLES[idea.style].label}</span>
                <span className="postcard-title">{idea.destination}</span>
                <span className="postcard-meta">{idea.note} · depuis {DEPARTURES[idea.departure]}</span>
                <span className="postcard-cta">Préremplir <Icon name="arrow" size={16} /></span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="chapters" aria-label="Les trois chapitres d’un voyage">
        {CHAPTERS.map(([number, title, text, tone]) => (
          <article key={number} className={`chapter-card ${tone}`}>
            <span className="chapter-number" aria-hidden="true">{number}</span>
            <h2 className="display-sm">{title}</h2>
            <p>{text}</p>
          </article>
        ))}
      </section>

      <section className="recent" aria-labelledby="recent-title">
        <div className="section-head">
          <p className="eyebrow">Sur ce navigateur</p>
          <h2 id="recent-title" className="display-sm">Vos voyages récents</h2>
          <p className="muted">Mémorisés uniquement dans ce navigateur, avec la clé organisateur quand vous l’avez créé ici.</p>
        </div>
        {recent.length === 0 ? (
          <p className="empty">Aucun voyage pour l’instant. Préparez le premier, ou ouvrez l’exemple pour voir à quoi ressemble un carnet rempli.</p>
        ) : (
          <ul className="ticket-list">
            {recent.map(trip => (
              <li key={trip.id} className="ticket">
                <div className="ticket-main">
                  <p className="ticket-title">{trip.destination || 'Voyage sans titre'}</p>
                  <p className="ticket-meta">{dateRange(trip.start, trip.end) || 'Dates à charger'}</p>
                  <p className="tags">
                    <span className="tag">{trip.editToken ? 'Organisateur' : 'Lecture seule'}</span>
                    {trip.example && <span className="tag tag-example">Exemple fictif</span>}
                  </p>
                </div>
                <div className="ticket-stub">
                  <a className="btn btn-small btn-primary" href={tripHash(trip.id, trip.readToken)}>Ouvrir</a>
                  <button type="button" className="btn btn-small btn-quiet" onClick={() => forget(trip.id)}
                    aria-label={`Oublier ${trip.destination || 'ce voyage'} sur ce navigateur`}>
                    Oublier
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
