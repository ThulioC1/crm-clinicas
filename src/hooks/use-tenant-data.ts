import { useCallback, useEffect, useState } from "react";

interface Source<T> {
  subscribe: (l: () => void) => () => void;
}

export function useLive<T>(source: Source<T>, load: () => Promise<T[]>, deps: unknown[]) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const refresh = useCallback(
    () =>
      load()
        .then(setData)
        .finally(() => setLoading(false)),
    deps,
  );
  useEffect(() => {
    refresh();
    return source.subscribe(refresh);
  }, [refresh, source]);
  return { data, loading };
}
