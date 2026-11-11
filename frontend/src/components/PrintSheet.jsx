import { CATEGORIES, DEPARTURES, MOMENTS, dateRange, dayDate, euros } from '../lib/format.js';

const MOMENT_LABELS = Object.fromEntries(MOMENTS);
const SCENARIOS = [
  ['low', 'Bas'],
  ['central', 'Central'],
  ['high', 'Haut'],
];

// Hidden on screen; the print stylesheet shows only this sheet.
export function PrintSheet({ trip }) {
  const { preferences: p, budget } = trip;
  return (
    <div className="print-sheet" aria-hidden="true">
      <p className="print-brand">Runaway · carnet de voyage{trip.is_example ? ' · EXEMPLE FICTIF' : ''}</p>
      <h1>{p.destination}</h1>
      <p>
        {dateRange(p.start_date, p.end_date)} · {p.travelers} voyageurs · départ {DEPARTURES[p.departure]} · plafond{' '}
        {euros(p.budget_cents)} / personne
      </p>
      <p className="print-note">
        Programme simulé : aucun lieu, horaire ni tarif vérifié. Révision n° {trip.revision}.
      </p>
      {trip.itinerary.days.map(day => (
        <section key={day.number} className="print-day">
          <h2>
            Jour {day.number} · {dayDate(p.start_date, day.number)} · {day.title}
          </h2>
          <ul>
            {day.stops.map((stop, i) => (
              <li key={i}>
                <strong>
                  {stop.moment ? `${MOMENT_LABELS[stop.moment]} · ` : ''}
                  {stop.name}
                </strong>{' '}
                ({CATEGORIES[stop.category]}, {stop.city}){stop.locked ? ' (on garde)' : ''}
                {stop.needs_review ? ' (coûts et trajets à revoir)' : ''}
                <br />
                {stop.description}
              </li>
            ))}
          </ul>
        </section>
      ))}
      <section className="print-day">
        <h2>Budget par personne (marge 8 % incluse)</h2>
        <ul>
          {SCENARIOS.map(([key, label]) => {
            const s = budget.scenarios[key];
            return (
              <li key={key}>
                {label} : sous-total connu {euros(s.known_total_cents)} ·{' '}
                {s.complete
                  ? s.within_budget
                    ? 'dans le plafond'
                    : 'au-dessus du plafond'
                  : `incomplet (manque : ${s.missing_items.join(', ')})`}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
