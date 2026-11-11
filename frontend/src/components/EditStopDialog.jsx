import { useState } from 'react';
import { CATEGORIES } from '../lib/format.js';
import { Dialog } from './Dialog.jsx';
import { Icon } from './Icon.jsx';

const FIELDS = [
  { key: 'name', label: 'Nom', max: 150 },
  { key: 'city', label: 'Ville ou lieu', max: 100 },
  { key: 'category', label: 'Type' },
  { key: 'description', label: 'Notes', max: 500 },
];

const show = (key, value) => (key === 'category' ? CATEGORIES[value] : value);

export function EditStopDialog({ target, onClose, mutate, announce }) {
  const [form, setForm] = useState(null);
  const [step, setStep] = useState('edit');
  const [errors, setErrors] = useState({});
  const [failure, setFailure] = useState(null);
  const [busy, setBusy] = useState(false);

  // A new target starts a fresh form. Adjusted during render rather than in an effect.
  const [formFor, setFormFor] = useState(null);
  if (formFor !== target) {
    setFormFor(target);
    setForm(target ? Object.fromEntries(FIELDS.map(({ key }) => [key, target.stop[key]])) : null);
    if (target) {
      setStep('edit');
      setErrors({});
      setFailure(null);
    }
  }

  const ready = !!(target && form);
  const changes = ready ? FIELDS.filter(({ key }) => form[key].trim() !== target.stop[key]) : [];

  function compare(event) {
    event.preventDefault();
    const found = {};
    for (const { key, label, max } of FIELDS) {
      const value = form[key].trim();
      if (!value) found[key] = `${label} : ce champ ne peut pas être vide.`;
      else if (max && value.length > max) found[key] = `${label} : ${max} caractères maximum.`;
    }
    setErrors(found);
    if (!Object.keys(found).length && changes.length) setStep('compare');
  }

  async function apply() {
    setBusy(true);
    setFailure(null);
    try {
      const body = Object.fromEntries(changes.map(({ key }) => [key, form[key].trim()]));
      await mutate(`/days/${target.day}/stops/${target.index}`, 'PATCH', body);
      announce(`Modification appliquée à « ${body.name || target.stop.name} ». Coûts et trajets à revoir.`);
      onClose();
    } catch (e) {
      setFailure(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={ready}
      onClose={onClose}
      eyebrow={target ? `Jour ${target.day}` : ''}
      title={step === 'edit' ? 'Modifier l’activité' : 'Comparer avant d’appliquer'}
    >
      {ready && step === 'edit' && (
        <form onSubmit={compare} noValidate className="dialog-form">
          {FIELDS.map(({ key, label, max }) => (
            <div key={key} className={`field ${errors[key] ? 'field-invalid' : ''}`}>
              <label htmlFor={`stop-${key}`}>{label}</label>
              {key === 'category' ? (
                <select
                  id={`stop-${key}`}
                  value={form[key]}
                  onChange={e => setForm({ ...form, [key]: e.target.value })}
                >
                  {Object.entries(CATEGORIES).map(([value, text]) => (
                    <option key={value} value={value}>
                      {text}
                    </option>
                  ))}
                </select>
              ) : key === 'description' ? (
                <textarea
                  id={`stop-${key}`}
                  rows={4}
                  maxLength={max}
                  value={form[key]}
                  aria-invalid={!!errors[key]}
                  aria-describedby={errors[key] ? `stop-${key}-error` : undefined}
                  onChange={e => setForm({ ...form, [key]: e.target.value })}
                />
              ) : (
                <input
                  id={`stop-${key}`}
                  maxLength={max}
                  value={form[key]}
                  aria-invalid={!!errors[key]}
                  aria-describedby={errors[key] ? `stop-${key}-error` : undefined}
                  onChange={e => setForm({ ...form, [key]: e.target.value })}
                />
              )}
              {errors[key] && (
                <p className="field-error" id={`stop-${key}-error`}>
                  <Icon name="alert" size={16} /> {errors[key]}
                </p>
              )}
            </div>
          ))}
          <div className="dialog-actions">
            <button type="button" className="btn btn-quiet" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="btn btn-primary" disabled={!changes.length}>
              {changes.length ? 'Comparer les changements' : 'Aucun changement'}
            </button>
          </div>
        </form>
      )}

      {ready && step === 'compare' && (
        <>
          <div className="diff" role="table" aria-label="Avant et après">
            <div className="diff-row diff-head" role="row">
              <span role="columnheader">Champ</span>
              <span role="columnheader">Avant</span>
              <span role="columnheader">Après</span>
            </div>
            {changes.map(({ key, label }) => (
              <div className="diff-row" role="row" key={key}>
                <span role="rowheader" className="diff-field">
                  {label}
                </span>
                <span role="cell" className="diff-before">
                  <span className="sr-only">Avant : </span>
                  {show(key, target.stop[key])}
                </span>
                <span role="cell" className="diff-after">
                  <span className="sr-only">Après : </span>
                  {show(key, form[key].trim())}
                </span>
              </div>
            ))}
          </div>
          <p className="notice notice-warn">
            <Icon name="alert" /> Après application, les coûts et trajets associés à cette activité seront signalés « à
            revoir ».
          </p>
          {failure && (
            <p className="notice notice-danger" role="alert">
              <Icon name="alert" /> {failure.message}
              {failure.code === 'revision_conflict' &&
                ' Votre saisie est conservée ici : rechargez la dernière version depuis le bandeau, puis recommencez.'}
            </p>
          )}
          <div className="dialog-actions">
            <button type="button" className="btn btn-quiet" onClick={() => setStep('edit')} disabled={busy}>
              <Icon name="back" /> Revenir à la saisie
            </button>
            <button type="button" className="btn btn-primary" onClick={apply} disabled={busy} aria-busy={busy}>
              {busy ? (
                'Enregistrement…'
              ) : (
                <>
                  Appliquer <Icon name="check" />
                </>
              )}
            </button>
          </div>
        </>
      )}
    </Dialog>
  );
}
