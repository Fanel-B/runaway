import { useMemo, useState } from 'react';
import { centsToInput, euros, inputToCents, plural } from '../lib/format.js';
import { Icon } from './Icon.jsx';

const SCENARIOS = [
  ['low', 'Bas'],
  ['central', 'Central'],
  ['high', 'Haut'],
];

function toDraft(lines) {
  return lines.map(line => ({
    ...line,
    low: centsToInput(line.low),
    central: centsToInput(line.central),
    high: centsToInput(line.high),
  }));
}

// Input checks only; every total comes from the Python calculator on the server.
function checkDraft(draft) {
  const errors = {};
  for (const line of draft) {
    const values = SCENARIOS.map(([key]) => inputToCents(line[key]));
    SCENARIOS.forEach(([key], i) => {
      if (Number.isNaN(values[i])) errors[`${line.key}.${key}`] = 'Montant invalide';
    });
    const known = values.filter(v => v != null && !Number.isNaN(v));
    if (known.some((v, i) => i > 0 && v < known[i - 1])) errors[line.key] = 'Bas ≤ central ≤ haut';
  }
  return errors;
}

function Conclusion({ scenario }) {
  if (scenario.within_budget === true) {
    return (
      <p className="status status-ok">
        <Icon name="check" size={16} /> Dans le plafond
      </p>
    );
  }
  if (scenario.within_budget === false) {
    return (
      <p className="status status-danger">
        <Icon name="alert" size={16} /> Au-dessus du plafond
      </p>
    );
  }
  return (
    <p className="status status-unknown">
      <Icon name="info" size={16} /> Impossible de conclure :{' '}
      {plural(scenario.missing_items.length, 'poste inconnu', 'postes inconnus')}
    </p>
  );
}

export function Budget({ trip, canEdit, mutate, announce }) {
  const { budget } = trip;
  const linesKey = JSON.stringify(trip.budget_lines);
  const [draft, setDraft] = useState(() => toDraft(trip.budget_lines));
  const [view, setView] = useState('person');
  const [errors, setErrors] = useState({});
  const [failure, setFailure] = useState('');
  const [busy, setBusy] = useState(false);

  // Reset only when the saved lines change, so locking a stop never wipes unsaved amounts.
  // Adjusted during render (React's pattern for state derived from a changed prop), not in an effect.
  const [draftFor, setDraftFor] = useState(linesKey);
  if (draftFor !== linesKey) {
    setDraftFor(linesKey);
    setDraft(toDraft(JSON.parse(linesKey)));
    setErrors({});
  }

  const dirty = useMemo(
    () => JSON.stringify(toDraft(JSON.parse(linesKey))) !== JSON.stringify(draft),
    [draft, linesKey],
  );
  const perPerson = view === 'person';
  const ceiling = perPerson ? budget.ceiling_cents : budget.group_ceiling_cents;
  const amount = scenario => (perPerson ? scenario.known_total_cents : scenario.group_known_total_cents);

  function update(index, key, value) {
    setDraft(current => current.map((line, i) => (i === index ? { ...line, [key]: value } : line)));
  }

  async function save(event) {
    event.preventDefault();
    const found = checkDraft(draft);
    setErrors(found);
    setFailure('');
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      await mutate('/budget', 'PUT', {
        lines: draft.map(line => ({
          key: line.key,
          shared: line.shared,
          ...Object.fromEntries(SCENARIOS.map(([key]) => [key, inputToCents(line[key])])),
        })),
      });
      announce('Budget enregistré et recalculé par le serveur.');
    } catch (e) {
      setFailure(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="budget">
      <div className="budget-top">
        <div className="ceiling-block">
          <p className="eyebrow">
            Plafond {perPerson ? 'par personne' : `du groupe · ${trip.preferences.travelers} voyageurs`}
          </p>
          <p className="figure">{euros(ceiling)}</p>
          <p className="fine">Ce que le groupe accepte de dépenser pour tout le séjour, pas une estimation.</p>
        </div>
        <fieldset className="view-toggle">
          <legend>Afficher les montants</legend>
          <div className="segmented">
            <label className="segment">
              <input type="radio" name="budget-view" checked={perPerson} onChange={() => setView('person')} />
              <span>Par personne</span>
            </label>
            <label className="segment">
              <input type="radio" name="budget-view" checked={!perPerson} onChange={() => setView('group')} />
              <span>Pour le groupe</span>
            </label>
          </div>
        </fieldset>
      </div>

      {trip.is_example && (
        <p className="notice notice-info">
          <Icon name="info" /> Montants fictifs de démonstration : aucun tarif n’a été consulté ni vérifié.
        </p>
      )}
      {dirty && (
        <p className="notice notice-warn">
          <Icon name="alert" /> Montants modifiés mais pas encore enregistrés : le résumé ci-dessous correspond à la
          dernière version sauvegardée.
        </p>
      )}

      <div className="scenarios">
        {SCENARIOS.map(([key, label]) => {
          const scenario = budget.scenarios[key];
          return (
            <section key={key} className={`scenario scenario-${key}`} aria-labelledby={`scenario-${key}`}>
              <h3 id={`scenario-${key}`} className="scenario-title">
                Scénario {label.toLowerCase()}
              </h3>
              <dl>
                <div>
                  <dt>Sous-total connu</dt>
                  <dd className="figure-sm">{euros(amount(scenario))}</dd>
                </div>
                <div>
                  <dt>Total complet</dt>
                  <dd className="figure-sm">
                    {scenario.complete ? euros(amount(scenario)) : <span className="unknown">Inconnu</span>}
                  </dd>
                </div>
              </dl>
              <Conclusion scenario={scenario} />
              {scenario.missing_items.length > 0 && (
                <p className="fine">Manque : {scenario.missing_items.join(', ')}.</p>
              )}
            </section>
          );
        })}
      </div>
      <p className="fine method">
        Calcul côté serveur : frais communs divisés entre {plural(trip.preferences.travelers, 'voyageur')}, marge de{' '}
        {budget.margin_percent} % appliquée une seule fois, arrondi à la fin. Les sous-totaux incluent la marge. Les
        scénarios ne sont pas des probabilités.
      </p>

      <form onSubmit={save} className="budget-form" noValidate>
        <h3 className="display-xs">Les cinq postes, pour tout le séjour</h3>
        <p className="muted">Laissez vide ce que vous ne savez pas encore. Saisissez 0 pour un coût nul assumé.</p>
        <div className="table-scroll" tabIndex={0} role="region" aria-label="Tableau des postes de budget, défilable">
          <table className="budget-table">
            <thead>
              <tr>
                <th scope="col">Poste</th>
                {SCENARIOS.map(([key, label]) => (
                  <th scope="col" key={key}>
                    {label} (€)
                  </th>
                ))}
                <th scope="col">Montant saisi pour</th>
              </tr>
            </thead>
            <tbody>
              {draft.map((line, index) => (
                <tr key={line.key} className={errors[line.key] ? 'row-invalid' : ''}>
                  <th scope="row">
                    {line.label}
                    {errors[line.key] && (
                      <span className="cell-error">
                        <Icon name="alert" size={14} /> {errors[line.key]}
                      </span>
                    )}
                  </th>
                  {SCENARIOS.map(([key, label]) => {
                    const cellError = errors[`${line.key}.${key}`];
                    return (
                      <td key={key}>
                        {canEdit ? (
                          <>
                            <input
                              inputMode="decimal"
                              value={line[key]}
                              placeholder="?"
                              onChange={e => update(index, key, e.target.value)}
                              aria-label={`${line.label}, scénario ${label.toLowerCase()}, en euros`}
                              aria-invalid={!!cellError}
                            />
                            {cellError && (
                              <span className="cell-error">
                                <Icon name="alert" size={14} /> {cellError}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className={line[key] === '' ? 'unknown' : ''}>
                            {line[key] === '' ? 'Inconnu' : `${line[key]} €`}
                          </span>
                        )}
                      </td>
                    );
                  })}
                  <td>
                    {canEdit ? (
                      <select
                        value={line.shared ? 'group' : 'person'}
                        aria-label={`${line.label} : montant saisi pour`}
                        onChange={e => update(index, 'shared', e.target.value === 'group')}
                      >
                        <option value="person">chaque personne</option>
                        <option value="group">tout le groupe (partagé)</option>
                      </select>
                    ) : line.shared ? (
                      'tout le groupe'
                    ) : (
                      'chaque personne'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {failure && (
          <p className="notice notice-danger" role="alert">
            <Icon name="alert" /> {failure} Vos montants sont conservés.
          </p>
        )}
        {canEdit ? (
          <div className="form-actions">
            <button
              type="button"
              className="btn btn-quiet"
              disabled={!dirty || busy}
              onClick={() => {
                setDraft(toDraft(trip.budget_lines));
                setErrors({});
              }}
            >
              Annuler les modifications
            </button>
            <button type="submit" className="btn btn-primary" disabled={!dirty || busy} aria-busy={busy}>
              {busy ? 'Enregistrement…' : 'Enregistrer le budget'}
            </button>
          </div>
        ) : (
          <p className="fine">Lecture seule : seul l’organisateur peut modifier les montants.</p>
        )}
      </form>
    </div>
  );
}
