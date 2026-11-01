import { useRef, useState } from 'react';
import { api } from '../lib/api.js';
import { DEPARTURES, STYLES, dayCount, inputToCents, plural } from '../lib/format.js';
import { go, tripHash } from '../lib/route.js';
import { rememberTrip } from '../lib/storage.js';
import { Icon } from './Icon.jsx';
import { Landscape } from './Landscape.jsx';

const EMPTY = { departure: 'paris', destination: '', start_date: '', end_date: '', travelers: '3', budget: '450', style: 'equilibre' };
// Keys of server-side fields mapped to the inputs that show them.
const SERVER_FIELD = { budget_cents: 'budget' };

function validate(form) {
  const errors = {};
  const destination = form.destination.trim();
  if (destination.length < 2 || destination.length > 100) errors.destination = 'Indiquez une destination de 2 à 100 caractères.';
  if (!form.start_date) errors.start_date = 'Choisissez une date de départ.';
  if (!form.end_date) errors.end_date = 'Choisissez une date de retour.';
  const days = dayCount(form.start_date, form.end_date);
  if (form.start_date && form.end_date && (days < 1 || days > 14)) {
    errors.end_date = days < 1 ? 'Le retour doit être le même jour ou après le départ.' : 'Le voyage dure au maximum 14 jours, dates incluses.';
  }
  const travelers = Number(form.travelers);
  if (!Number.isInteger(travelers) || travelers < 1 || travelers > 8) errors.travelers = 'Entre 1 et 8 voyageurs.';
  const cents = inputToCents(form.budget);
  if (cents == null || Number.isNaN(cents) || cents < 100 || cents > 1_000_000) errors.budget = 'Entre 1 € et 10 000 € par personne.';
  return errors;
}

function Field({ id, label, error, hint, children }) {
  return (
    <div className={`field ${error ? 'field-invalid' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && !error && <p className="field-hint" id={`${id}-hint`}>{hint}</p>}
      {error && <p className="field-error" id={`${id}-error`}><Icon name="alert" size={16} /> {error}</p>}
    </div>
  );
}

export function TripForm({ draft }) {
  const [form, setForm] = useState(() => ({ ...EMPTY, ...(draft || {}), travelers: String(draft?.travelers ?? EMPTY.travelers) }));
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);
  const formRef = useRef(null);
  const inFlight = useRef(false);

  const set = key => event => setForm(current => ({ ...current, [key]: event.target.value }));
  const describe = (key, hint) => (errors[key] ? `${key}-error` : hint ? `${key}-hint` : undefined);
  const days = dayCount(form.start_date, form.end_date);

  function focusFirst(fieldErrors) {
    const first = Object.keys(fieldErrors)[0];
    if (first) requestAnimationFrame(() => formRef.current?.querySelector(`[name="${first}"]`)?.focus());
  }

  async function submit(event) {
    event.preventDefault();
    if (inFlight.current) return;
    const found = validate(form);
    setErrors(found);
    setServerError('');
    if (Object.keys(found).length) { focusFirst(found); return; }
    inFlight.current = true;
    setBusy(true);
    try {
      const created = await api('/trips', {
        method: 'POST',
        body: {
          departure: form.departure, destination: form.destination.trim(), start_date: form.start_date, end_date: form.end_date,
          travelers: Number(form.travelers), budget_cents: inputToCents(form.budget), style: form.style,
        },
      });
      rememberTrip({ id: created.id, readToken: created.read_token, editToken: created.edit_token,
        destination: form.destination.trim(), start: form.start_date, end: form.end_date });
      go(tripHash(created.id, created.read_token));
    } catch (e) {
      // The form state is untouched: nothing typed is lost.
      const fieldErrors = Object.fromEntries(Object.entries(e.fields || {}).map(([k, v]) => [SERVER_FIELD[k] || k, v]));
      setErrors(fieldErrors);
      setServerError(e.message);
      focusFirst(fieldErrors);
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="brief">
      <aside className={`brief-side sky-${form.style}`}>
        <a href="#" className="back-link"><Icon name="back" /> Accueil</a>
        <p className="eyebrow">Chapitre zéro</p>
        <h1 className="display">Le brief du voyage</h1>
        <p className="lead">Les contraintes du groupe, au même endroit. Le programme sera un brouillon simulé, à personnaliser ensuite.</p>
        <ul className="brief-rules">
          <li><span>1 à 14</span> jours, dates incluses</li>
          <li><span>1 à 8</span> voyageurs</li>
          <li><span>1 à 10 000 €</span> de plafond par personne</li>
        </ul>
        <p className="annotation" aria-hidden="true">l’ambiance change le paysage ↓</p>
        <div className="brief-art"><Landscape variant={form.style} /></div>
      </aside>

      <section className="brief-form" aria-labelledby="brief-form-title">
        <h2 id="brief-form-title" className="sr-only">Formulaire du voyage</h2>
        {serverError && (
          <div className="notice notice-danger" role="alert">
            <Icon name="alert" /> <span><strong>Le voyage n’a pas été créé.</strong> {serverError}</span>
          </div>
        )}
        <form ref={formRef} onSubmit={submit} noValidate>
          <fieldset className="field">
            <legend>Ville de départ</legend>
            <div className="segmented">
              {Object.entries(DEPARTURES).map(([value, label]) => (
                <label key={value} className="segment">
                  <input type="radio" name="departure" value={value} checked={form.departure === value} onChange={set('departure')} />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <Field id="destination" label="Destination ou région" error={errors.destination}>
            <input id="destination" name="destination" value={form.destination} onChange={set('destination')}
              placeholder="Côte basque, Lisbonne, Cévennes…" maxLength={100} autoComplete="off"
              aria-invalid={!!errors.destination} aria-describedby={describe('destination')} />
          </Field>

          <div className="field-row">
            <Field id="start_date" label="Départ" error={errors.start_date}>
              <input id="start_date" name="start_date" type="date" value={form.start_date} onChange={set('start_date')}
                aria-invalid={!!errors.start_date} aria-describedby={describe('start_date')} />
            </Field>
            <Field id="end_date" label="Retour" error={errors.end_date}
              hint={days > 0 && days <= 14 ? plural(days, 'jour') : undefined}>
              <input id="end_date" name="end_date" type="date" value={form.end_date} min={form.start_date || undefined}
                onChange={set('end_date')} aria-invalid={!!errors.end_date}
                aria-describedby={describe('end_date', days > 0 && days <= 14)} />
            </Field>
          </div>

          <div className="field-row">
            <Field id="travelers" label="Voyageurs" error={errors.travelers}>
              <input id="travelers" name="travelers" type="number" inputMode="numeric" min="1" max="8" value={form.travelers}
                onChange={set('travelers')} aria-invalid={!!errors.travelers} aria-describedby={describe('travelers')} />
            </Field>
            <Field id="budget" label="Plafond par personne (€)" error={errors.budget} hint="Pour tout le séjour">
              <input id="budget" name="budget" inputMode="decimal" value={form.budget} onChange={set('budget')}
                aria-invalid={!!errors.budget} aria-describedby={describe('budget', true)} />
            </Field>
          </div>

          <fieldset className="field">
            <legend>L’ambiance</legend>
            <div className="mood-grid">
              {Object.entries(STYLES).map(([value, { label, hint }]) => (
                <label key={value} className={`mood sky-${value}`}>
                  <input type="radio" name="style" value={value} checked={form.style === value} onChange={set('style')} />
                  <span className="mood-label">{label}</span>
                  <span className="mood-hint">{hint}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <button type="submit" className="btn btn-primary btn-block" disabled={busy} aria-busy={busy}>
            {busy ? 'Préparation du carnet…' : <>Créer notre carnet <Icon name="arrow" /></>}
          </button>
          <p className="fine">Aucun compte. Le programme est simulé (FakeLLM) : aucun appel à une IA payante, aucun lieu vérifié.</p>
        </form>
      </section>
    </div>
  );
}
