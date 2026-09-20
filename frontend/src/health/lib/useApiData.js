import { useCallback, useEffect, useState } from 'react';

// Small shared data-fetching hook used by every health page: tracks
// loading/error/data state for a single async fetch and exposes `reload`
// so pages can wire up <ErrorState onRetry={reload}>. Errors thrown by
// shared/lib/api.js already carry a Korean, user-presentable `.message`
// and a `.status` (e.g. 404 for "no data yet"), so pages branch on
// `error.status` to tell empty-state apart from a real error.
export function useApiData(fetcher, deps = []) {
  const [state, setState] = useState({ loading: true, error: null, data: null });

  const load = useCallback(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    fetcher()
      .then((data) => {
        if (!cancelled) setState({ loading: false, error: null, data });
      })
      .catch((error) => {
        if (!cancelled) setState({ loading: false, error, data: null });
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    const cancel = load();
    return cancel;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  return { ...state, reload: load };
}
