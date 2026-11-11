import { useState } from 'react';
import { CATEGORIES, MOMENTS, dayDate } from '../lib/format.js';
import { EditStopDialog } from './EditStopDialog.jsx';
import { Icon } from './Icon.jsx';

const DAY_TONES = ['day-sun', 'day-rose', 'day-sage', 'day-sky', 'day-peach'];
const NUMBERS = [
  'un',
  'deux',
  'trois',
  'quatre',
  'cinq',
  'six',
  'sept',
  'huit',
  'neuf',
  'dix',
  'onze',
  'douze',
  'treize',
  'quatorze',
];

// Group by moment only when the data says so; no hour is ever invented.
function groupByMoment(stops) {
  const indexed = stops.map((stop, index) => ({ stop, index }));
  if (!indexed.some(({ stop }) => stop.moment)) return [[null, indexed]];
  const groups = MOMENTS.map(([key, label]) => [label, indexed.filter(({ stop }) => stop.moment === key)]);
  const loose = indexed.filter(({ stop }) => !stop.moment);
  if (loose.length) groups.push(['Au fil de la journée', loose]);
  return groups.filter(([, items]) => items.length);
}

function StopEntry({ stop, canEdit, busy, onEdit, onLock, onReviewed }) {
  return (
    <li className={`stop ${stop.locked ? 'stop-locked' : ''}`}>
      <span className="stop-node" aria-hidden="true" />
      <div className="stop-body">
        <p className="stop-meta">
          <span className="stop-category">{CATEGORIES[stop.category]}</span> · {stop.city}
        </p>
        <h4 className="stop-name">{stop.name}</h4>
        <p className="stop-notes">{stop.description}</p>
        <p className="tags">
          {stop.locked && (
            <span className="tag tag-locked">
              <Icon name="lock" size={14} /> On garde
            </span>
          )}
          {stop.needs_review && (
            <span className="tag tag-review">
              <Icon name="alert" size={14} /> Coûts et trajets associés à revoir
            </span>
          )}
          <span className="tag tag-quiet">Lieu non vérifié</span>
        </p>
        {canEdit && (
          <div className="stop-actions">
            {!stop.locked && (
              <button type="button" className="btn btn-small btn-ghost" onClick={onEdit} disabled={busy}>
                <Icon name="edit" size={16} /> Modifier
              </button>
            )}
            <button
              type="button"
              className={`btn btn-small ${stop.locked ? 'btn-quiet' : 'btn-ink'}`}
              onClick={onLock}
              disabled={busy}
              aria-pressed={stop.locked}
            >
              <Icon name={stop.locked ? 'unlock' : 'lock'} size={16} /> {stop.locked ? 'Déverrouiller' : 'On garde'}
            </button>
            {stop.needs_review && (
              <button type="button" className="btn btn-small btn-quiet" onClick={onReviewed} disabled={busy}>
                <Icon name="check" size={16} /> C’est revu
              </button>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

export function Programme({ trip, canEdit, mutate, announce }) {
  const [filter, setFilter] = useState('all');
  const [editing, setEditing] = useState(null);
  const [busyKey, setBusyKey] = useState(null);
  const [error, setError] = useState(null);
  const days = trip.itinerary.days;
  const shown = filter === 'all' ? days : days.filter(day => day.number === filter);

  async function run(key, path, method, body, message) {
    setBusyKey(key);
    setError(null);
    try {
      await mutate(path, method, body);
      announce(message);
    } catch (e) {
      setError({ key, message: e.message });
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div className="programme">
      <div className="filters" role="group" aria-label="Afficher les journées">
        <button type="button" className="chip" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>
          Tout le voyage
        </button>
        {days.map(day => (
          <button
            key={day.number}
            type="button"
            className="chip"
            aria-pressed={filter === day.number}
            onClick={() => setFilter(day.number)}
          >
            J{day.number}
          </button>
        ))}
      </div>
      {!canEdit && (
        <p className="notice notice-info">
          <Icon name="eye" /> Lecture seule : seul l’organisateur peut modifier ou verrouiller.
        </p>
      )}

      {shown.map(day => (
        <article
          key={day.number}
          className={`day-chapter ${DAY_TONES[(day.number - 1) % DAY_TONES.length]}`}
          aria-labelledby={`day-${day.number}`}
        >
          <header className="day-head">
            <p className="day-label">Chapitre {NUMBERS[day.number - 1]}</p>
            <p className="day-number" aria-hidden="true">
              {String(day.number).padStart(2, '0')}
            </p>
            <h3 id={`day-${day.number}`} className="day-title">
              <span className="sr-only">Jour {day.number} : </span>
              {day.title}
            </h3>
            <p className="day-date">{dayDate(trip.preferences.start_date, day.number)}</p>
          </header>
          <div className="day-moments">
            {groupByMoment(day.stops).map(([label, items]) => (
              <section key={label || 'all'} className="moment">
                {label && <h4 className="moment-label">{label}</h4>}
                <ol className="route">
                  {items.map(({ stop, index }) => {
                    const key = `${day.number}-${index}`;
                    const base = `/days/${day.number}/stops/${index}`;
                    return (
                      <StopEntry
                        key={key}
                        stop={stop}
                        canEdit={canEdit}
                        busy={busyKey === key}
                        onEdit={() => setEditing({ day: day.number, index, stop })}
                        onLock={() =>
                          run(
                            key,
                            `${base}/lock`,
                            'PUT',
                            { locked: !stop.locked },
                            stop.locked
                              ? `« ${stop.name} » est déverrouillé.`
                              : `« ${stop.name} » est gardé et verrouillé.`,
                          )
                        }
                        onReviewed={() =>
                          run(key, base, 'PATCH', { review_done: true }, `« ${stop.name} » est marqué comme revu.`)
                        }
                      />
                    );
                  })}
                </ol>
                {error && items.some(({ index }) => error.key === `${day.number}-${index}`) && (
                  <p className="notice notice-danger" role="alert">
                    <Icon name="alert" /> {error.message}
                  </p>
                )}
              </section>
            ))}
          </div>
        </article>
      ))}

      <EditStopDialog target={editing} onClose={() => setEditing(null)} mutate={mutate} announce={announce} />
    </div>
  );
}
