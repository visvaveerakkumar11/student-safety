import { useCallback, useEffect, useRef, useState } from 'react'

import { getErrorMessage } from '@/services/http'

interface Options {
  /** Re-fetch silently every N ms while the page is visible. */
  pollMs?: number
}

/**
 * Loads data from an API call and re-runs it when `deps` change.
 * Background refreshes (polling, reload) keep the previous data on screen instead of flashing a loader.
 */
export function useApi<T>(fetcher: () => Promise<T>, deps: unknown[], { pollMs }: Options = {}) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher
  const requestId = useRef(0)

  const run = useCallback(async (silent: boolean) => {
    const id = ++requestId.current
    if (!silent) setLoading(true)
    try {
      const result = await fetcherRef.current()
      if (id === requestId.current) {
        setData(result)
        setError(null)
      }
    } catch (e) {
      if (id === requestId.current) setError(getErrorMessage(e))
    } finally {
      if (id === requestId.current) setLoading(false)
    }
  }, [])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void run(false) }, deps)

  useEffect(() => {
    if (!pollMs) return
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void run(true)
    }, pollMs)
    return () => window.clearInterval(timer)
  }, [pollMs, run])

  const reload = useCallback(() => run(true), [run])
  return { data, error, loading, reload }
}
