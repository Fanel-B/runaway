export class ApiError extends Error {
  constructor(message, { status = 0, code = null, fields = {} } = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

const FIELD_MESSAGES = {
  departure: 'Choisissez Paris ou Toulouse.',
  destination: 'Entre 2 et 100 caractères.',
  start_date: 'Date de départ invalide.',
  end_date: 'Le voyage doit durer entre 1 et 14 jours, dates incluses.',
  travelers: 'Entre 1 et 8 voyageurs.',
  budget_cents: 'Entre 1 € et 10 000 € par personne.',
  style: 'Choisissez une ambiance.',
};

function parseValidation(detail) {
  const fields = {};
  for (const error of detail) {
    const loc = (error.loc || []).filter(part => part !== 'body');
    // Date-range errors come from a model validator, without a field name.
    const field = loc.length ? String(loc[loc.length - 1]) : 'end_date';
    fields[field] = FIELD_MESSAGES[field] || String(error.msg || '').replace(/^Value error, /, '');
  }
  return fields;
}

// Same origin through the Vite proxy by default; VITE_API_URL points to a separate API once deployed.
const BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

export async function api(path, { method = 'GET', token, body } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  let response;
  try {
    response = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('Serveur injoignable. Vérifiez que l’API est lancée, puis réessayez.');
  }
  let data = null;
  try {
    data = await response.json();
  } catch {
    /* empty or non-JSON body */
  }
  if (!response.ok) {
    const detail = data?.detail;
    if (Array.isArray(detail)) {
      throw new ApiError('Certaines informations sont à corriger.', {
        status: response.status,
        code: 'validation',
        fields: parseValidation(detail),
      });
    }
    if (detail && typeof detail === 'object') {
      throw new ApiError(detail.message, { status: response.status, code: detail.code });
    }
    const fallback =
      response.status >= 500
        ? 'Le serveur rencontre un problème. Votre saisie est conservée : réessayez.'
        : 'Une erreur est survenue. Réessayez.';
    throw new ApiError(typeof detail === 'string' ? detail : fallback, { status: response.status });
  }
  return data;
}
