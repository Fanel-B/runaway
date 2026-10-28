import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, options);
  const data = await response.json();
  if (!response.ok) {
    const message = Array.isArray(data.detail) ? data.detail.map(e => e.msg).join(' · ') : data.detail;
    throw new Error(message || 'Une erreur est survenue. Réessayez.');
  }
  return data;
}

function App() {
  const [trip, setTrip] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [share, setShare] = useState('');
  const [copied, setCopied] = useState(false);
  async function load(id, token) {
    const result = await api(`/trips/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    setTrip(result);
  }
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const id = params.get('trip'), token = params.get('key');
    if (id && token) {
      setBusy(true);
      load(id, token).then(() => setShare(window.location.href)).catch(e => setError(e.message)).finally(() => setBusy(false));
    }
  }, []);

  async function submit(event) {
    event.preventDefault(); setError(''); setBusy(true); setCopied(false);
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    payload.travelers = Number(payload.travelers);
    payload.budget_cents = Math.round(Number(payload.budget) * 100);
    delete payload.budget;
    try {
      const created = await api('/trips', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const hash = new URLSearchParams({ trip: created.id, key: created.read_token }).toString();
      window.history.replaceState(null, '', `#${hash}`);
      // Preserve access even if the following read fails; reloading retries it.
      setShare(window.location.href);
      await load(created.id, created.read_token);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  function reset() {
    window.history.replaceState(null, '', window.location.pathname);
    setTrip(null); setShare(''); setError(''); setCopied(false);
  }
  return <>
    <header><a href="/" className="logo">runaway<span>↗</span></a><span className="tag">LE DÉPART SE PRÉPARE ENSEMBLE</span><span className="demo">Démo · T1</span></header>
    <main>
      <div className="notice"><strong>Un prototype transparent.</strong> Générateur simulé, aucun prix réel ni lieu vérifié pour le moment.</div>
      {error && <div role="alert" className="error">{error}</div>}
      {!trip ? <div className="landing">
        <section className="intro"><p className="eyebrow">DE PARIS OU TOULOUSE</p><h1>Des envies en vrac.<br /><em>Un départ ensemble.</em></h1><p className="lead">Posez les bases du voyage. Gardez un programme clair et un budget qui montre aussi ce qu’on ne sait pas encore.</p>
          <div className="steps"><p><b>01</b> Vos contraintes, au même endroit.</p><p><b>02</b> Un programme jour par jour.</p><p><b>03</b> Une version à partager aux amis.</p></div>
          <div className="promise"><span>À VENIR</span><h3>On garde. On change.<br />On voit ce que ça implique.</h3><p>La prochaine tranche permettra de protéger vos décisions avant de proposer une modification.</p></div>
        </section>
        <section className="panel"><p className="eyebrow">LE BRIEF DU VOYAGE</p><h2>On part où ?</h2><p className="muted">Commencez simplement. Aucun compte nécessaire.</p>
          <form onSubmit={submit}>
            <label>Ville de départ<select name="departure"><option value="paris">Paris</option><option value="toulouse">Toulouse</option></select></label>
            <label>Destination ou région<input name="destination" placeholder="Normandie, Andalousie…" minLength="2" maxLength="100" required /></label>
            <div className="fields"><label>Départ<input type="date" name="start_date" required /></label><label>Retour<input type="date" name="end_date" required /></label></div>
            <div className="fields"><label>Voyageurs<input name="travelers" type="number" min="1" max="8" defaultValue="3" required /></label><label>Plafond / personne (€)<input name="budget" type="number" min="1" max="10000" step="0.01" defaultValue="450" required /></label></div>
            <label>L’ambiance<select name="style"><option value="equilibre">Un peu de tout</option><option value="nature">Grands espaces</option><option value="culture">Ville et culture</option><option value="plage">Au bord de l’eau</option></select></label>
            <button disabled={busy} type="submit">{busy ? 'Préparation du brouillon…' : 'Créer notre brouillon ↗'}</button>
            <p className="fine">1 à 14 jours · Aucun appel à une IA payante dans cette version.</p>
          </form>
        </section>
      </div> : <>
        <div className="trip-heading"><div><p className="eyebrow">VOTRE ATELIER DE VOYAGE</p><h1>{trip.preferences.destination}</h1><p>{trip.preferences.start_date} → {trip.preferences.end_date} · {trip.preferences.travelers} voyageurs · départ {trip.preferences.departure}</p></div><button className="secondary" onClick={reset}>Nouveau voyage</button></div>
        <div className="trip-grid"><section><h2>Le programme</h2><p className="muted">Brouillon de démonstration : ces journées sont à personnaliser.</p>
          {trip.itinerary.days.map(day => <article className="day" key={day.number}><div className="day-number">{String(day.number).padStart(2, '0')}</div><div><h3>{day.title}</h3>{day.stops.map((stop, i) => <div key={i}><strong>{stop.name}</strong><p>{stop.description}</p><span className="status">Lieu non vérifié · aucun marqueur</span></div>)}</div></article>)}
        </section><aside>
          <div className="panel budget"><p className="eyebrow">PAR PERSONNE</p><h2>{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(trip.preferences.budget_cents / 100)}</h2><p>Votre plafond, pas une estimation du voyage.</p><span className="status">Budget incomplet</span><p className="muted">Les trois scénarios seront disponibles dès que les postes seront renseignés. La marge prévue est de 8 %.</p><ul>{trip.budget.scenarios.central.missing_items.map(item => <li key={item}>{item}<span>À préciser</span></li>)}</ul></div>
          <div className="panel share"><h3>Tout le monde sur la même page.</h3><p>Ce lien donne un accès en lecture au programme et à son plafond commun. Toute personne qui le reçoit peut le consulter.</p><button onClick={async () => { try { await navigator.clipboard.writeText(share); setCopied(true); } catch { setError('Copie impossible : sélectionnez le lien ci-dessous.'); } }}>{copied ? 'Lien copié' : 'Copier le lien de lecture'}</button><label className="fine">Lien privé de lecture<input value={share} readOnly onFocus={e => e.target.select()} /></label><p className="fine">En local, ce lien ne fonctionne que depuis votre machine. Le partage à distance nécessite un déploiement.</p></div>
        </aside></div>
      </>}
    </main><footer>Runaway · Prototype étudiant · Les données manquantes restent visibles.</footer>
  </>;
}

createRoot(document.getElementById('root')).render(<App />);
