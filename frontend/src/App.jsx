import { useEffect, useRef, useState } from 'react';
import { Footer, Header } from './components/Chrome.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import { Home } from './components/Home.jsx';
import { JournalDialog } from './components/JournalDialog.jsx';
import { Privacy } from './components/Privacy.jsx';
import { TripForm } from './components/TripForm.jsx';
import { TripView } from './components/TripView.jsx';
import { go, useHashRoute } from './lib/route.js';

export default function App() {
  const route = useHashRoute();
  const [draft, setDraft] = useState(null);
  const [journalOpen, setJournalOpen] = useState(false);
  const [flash, setFlash] = useState('');
  const main = useRef(null);
  const firstRender = useRef(true);

  // Move focus to the new page so keyboard and screen-reader users start at its top.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    main.current?.focus({ preventScroll: true });
  }, [route]);

  function pickInspiration(idea) {
    setDraft({
      departure: idea.departure,
      destination: idea.destination,
      style: idea.style,
      travelers: idea.travelers,
    });
    go('#nouveau');
  }

  function onDeleted(destination) {
    setFlash(`Le voyage « ${destination} » a été supprimé du serveur et de ce navigateur.`);
    go('#');
  }

  return (
    <>
      <button type="button" className="skip-link" onClick={() => main.current?.focus()}>
        Aller au contenu
      </button>
      <Header />
      <main id="contenu" ref={main} tabIndex={-1}>
        <ErrorBoundary key={route.page + (route.id || '')}>
          {route.page === 'home' && (
            <Home onInspiration={pickInspiration} flash={flash} onFlashDone={() => setFlash('')} />
          )}
          {route.page === 'new' && <TripForm key={JSON.stringify(draft)} draft={draft} />}
          {route.page === 'trip' && (
            <TripView
              key={`${route.id}-${route.readerView}`}
              route={route}
              onJournal={() => setJournalOpen(true)}
              onDeleted={onDeleted}
            />
          )}
          {route.page === 'privacy' && <Privacy />}
        </ErrorBoundary>
      </main>
      <Footer onJournal={() => setJournalOpen(true)} />
      <JournalDialog open={journalOpen} onClose={() => setJournalOpen(false)} />
    </>
  );
}
