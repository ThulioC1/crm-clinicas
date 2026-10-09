import { useCallback, useEffect, useState } from "react";

interface Source<T> {
  subscribe: (l: () => void) => () => void;
}

export function useLive<T>(source: Source<T>, load: () => Promise<T[]>, deps: unknown[]) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  /* eslint-disable react-hooks/exhaustive-deps -- `deps` é a dependência declarada pelo chamador */
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
