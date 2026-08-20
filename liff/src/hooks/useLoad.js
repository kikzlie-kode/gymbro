import { useCallback, useEffect, useState } from "react";

// Runs `fetcher` on mount and exposes { data, error, reload }.
// `data` stays null while loading OR while an error is set — check `error` first.
export function useLoad(fetcher, deps = []) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const reload = useCallback(() => {
    setError(null);
    fetcher()
      .then(setData)
      .catch((err) => setError(err.message || String(err)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, error, reload };
}
