import * as React from 'react'

type Snapshot<S> = { state: S; revision: number }
export function useDemoStore<S, A>({
  initial,
  reducer,
  storageKey,
  shared,
}: {
  initial: () => S
  reducer: (state: S, action: A) => S
  storageKey: string
  shared: boolean
}) {
  const [state, setState] = React.useState<S>(() => {
    if (!shared) {
      try {
        const saved = localStorage.getItem(storageKey)
        if (saved) return JSON.parse(saved) as S
      } catch {
        /* use fixtures */
      }
    }
    return initial()
  })
  const [ready, setReady] = React.useState(!shared)
  const [error, setError] = React.useState<string | null>(null)
  const queue = React.useRef<{ id: string; action: A }[]>([])
  const busy = React.useRef(false)
  const revision = React.useRef(-1)
  const mounted = React.useRef(true)
  const [pending, setPending] = React.useState(false)
  const sync = React.useCallback(async () => {
    if (!shared || busy.current) return
    busy.current = true
    try {
      do {
        const item = queue.current[0]
        const response = await fetch(
          '/__demo/state',
          item
            ? {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(item),
              }
            : { cache: 'no-store' },
        )
        if (!response.ok)
          throw new Error(
            'Shared demo store is unavailable. Your changes are queued; retry to save them.',
          )
        const snapshot: Snapshot<S> = await response.json()
        if (item) queue.current.shift()
        if (mounted.current && snapshot.revision >= revision.current && !queue.current.length) {
          revision.current = snapshot.revision
          setState(snapshot.state)
          setReady(true)
        }
      } while (queue.current.length)
      if (mounted.current) {
        setError(null)
        setPending(false)
      }
    } catch (e) {
      if (mounted.current) setError(e instanceof Error ? e.message : 'Could not save changes')
    } finally {
      busy.current = false
    }
  }, [shared])
  React.useEffect(() => {
    mounted.current = true
    void sync()
    const timer = shared
      ? window.setInterval(() => {
          if (!queue.current.length) void sync()
        }, 1500)
      : undefined
    return () => {
      mounted.current = false
      window.clearInterval(timer)
    }
  }, [sync, shared])
  const dispatch = React.useCallback(
    (action: A) => {
      if (!shared) setState((current) => reducer(current, action))
      if (shared) {
        queue.current.push({ id: crypto.randomUUID(), action })
        setPending(true)
        void sync()
      }
    },
    [reducer, shared, sync],
  )
  React.useEffect(() => {
    if (!shared) localStorage.setItem(storageKey, JSON.stringify(state))
  }, [shared, state, storageKey])
  React.useEffect(() => {
    if (!pending) return
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [pending])
  return { state, dispatch, ready, error, retry: sync, pending }
}
