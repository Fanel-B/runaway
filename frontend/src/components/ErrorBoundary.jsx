import { Component } from 'react';

export class ErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <section className="state-page" role="alert">
        <p className="eyebrow">Incident d’affichage</p>
        <h1 className="display-sm">Cette page a rencontré un problème.</h1>
        <p className="muted">
          Vos données enregistrées sur le serveur ne sont pas touchées. Rechargez la page pour reprendre.
        </p>
        <div className="inline-actions">
          <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
            Recharger la page
          </button>
        </div>
      </section>
    );
  }
}
