// Development keeps the React and Spring processes separate. Production defaults
// to same-origin requests so the frontend can sit behind the same host/reverse
// proxy as the API without being tied to a developer machine.
export const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL ||
  (process.env.NODE_ENV === 'development' ? 'http://localhost:8080' : '');

export const requestJson = async (path, options = {}) => {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(options.headers || {}),
      },
    });
  } catch {
    const error = new Error(`Cannot reach the ProCart API at ${API_BASE_URL}. Start the Java backend and try again.`);
    error.status = 0;
    throw error;
  }

  let payload = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const error = new Error(payload?.message || 'Something went wrong. Please try again.');
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
};
