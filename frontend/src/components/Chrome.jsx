import { Icon } from './Icon.jsx';

// The brand mark: a distant bird drawn with two arcs, like the ones in the landscapes.
export function BirdMark({ className = '' }) {
  return (
    <svg
      className={`bird-mark ${className}`}
      viewBox="0 0 40 20"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 13 Q11 2 20 12 Q29 2 37 13" />
    </svg>
  );
}

export function Header() {
  return (
    <header className="site-header">
      <a href="#" className="logo" aria-label="Runaway, accueil">
        run<em>away</em>
        <BirdMark />
      </a>
      <nav aria-label="Navigation principale" className="site-nav">
        <a href="#nouveau" className="nav-link">
          Nouveau voyage
        </a>
      </nav>
      <p className="demo-chip" title="Programmes simulés par FakeLLM, aucun prix ni lieu vérifié">
        <span className="dot" aria-hidden="true" />
        <span className="demo-long">Mode </span>démo
      </p>
    </header>
  );
}

export function Footer({ onJournal }) {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <p className="footer-logo">
          run<em>away</em>
          <BirdMark />
        </p>
        <p className="footer-text">
          Prototype étudiant de préparation de voyages entre amis. Programmes générés par un simulateur, illustrations
          SVG originales : aucun lieu, horaire ni tarif n’est vérifié.
        </p>
        <div className="footer-actions">
          <a className="btn btn-on-dark" href="#confidentialite">
            Confidentialité
          </a>
          <button type="button" className="btn btn-on-dark" onClick={onJournal}>
            <Icon name="book" /> Journal du projet
          </button>
        </div>
      </div>
    </footer>
  );
}
