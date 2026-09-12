import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

/**
 * Runs an async API call and tracks { data, error, loading, refreshing }.
 * - `deps` re-runs the call (e.g. when search params change)
 * - the first load shows `loading`; later loads show `refreshing` so the
 *   existing content can stay on screen
 * - a 401 means the session expired: the user is sent back to the login page
 */
export function useApi(fetcher, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true, refreshing: false });
  const [attempt, setAttempt] = useState(0);
  const navigate = useNavigate();
  const { clearSession } = useAuth();
  const latest = useRef(0);

  useEffect(() => {
    const id = ++latest.current;
    setState((s) => ({ ...s, error: null, loading: s.data === null, refreshing: s.data !== null }));

    fetcher()
      .then((data) => {
        if (id === latest.current) setState({ data, error: null, loading: false, refreshing: false });
      })
      .catch((error) => {
        if (id !== latest.current) return;
        if (error.status === 401) {
          clearSession();
          navigate('/login', { replace: true, state: { reason: 'expired' } });
          return;
        }
        setState((s) => ({ ...s, error, loading: false, refreshing: false }));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return { ...state, retry };
}
