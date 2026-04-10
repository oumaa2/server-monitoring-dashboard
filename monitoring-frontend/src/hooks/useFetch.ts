import { useState, useEffect, useCallback } from 'react';

interface FetchState<T> {
    data: T | null;
    loading: boolean;
    error: string | null;
    refetch: () => void;
}

interface FetchOptions {
    refreshMs?: number;
    paused?: boolean;
}

/** Generic hook for data fetching with auto-refresh support */
export function useFetch<T>(
    fetcher: () => Promise<T>,
    deps: unknown[] = [],
    options: FetchOptions = {}
): FetchState<T> {
    const { refreshMs, paused = false } = options;
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const run = useCallback(async () => {
        try {
            setError(null);
            const result = await fetcher();
            setData(result);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);

    useEffect(() => {
        if (paused) return; // Skip if paused

        run();
        if (refreshMs) {
            const id = setInterval(run, refreshMs);
            return () => clearInterval(id);
        }
    }, [run, refreshMs, paused]);

    return { data, loading, error, refetch: run };
}
