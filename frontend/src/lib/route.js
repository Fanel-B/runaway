import { useEffect, useState } from 'react';

// Hash routes keep the read secret out of server logs: #trip=<id>&key=<read secret>.
function parse() {
  const raw = window.location.hash.slice(1);
  if (raw === 'nouveau') return { page: 'new' };
  if (raw === 'confidentialite') return { page: 'privacy' };
  const params = new URLSearchParams(raw);
  if (params.get('trip')) {
    return {
      page: 'trip',
      id: params.get('trip'),
      key: params.get('key'),
      readerView: params.get('vue') === 'lecture',
    };
  }
  return { page: 'home' };
}

export function useHashRoute() {
  const [route, setRoute] = useState(parse);
  useEffect(() => {
    const onChange = () => {
      setRoute(parse());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

export function tripHash(id, readToken, readerView = false) {
  const params = new URLSearchParams({ trip: id, key: readToken });
  if (readerView) params.set('vue', 'lecture');
  return `#${params}`;
}

export function go(hash) {
  window.location.hash = hash;
}
