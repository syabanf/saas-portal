import {
  createHttpApi,
  createMockApi,
  loadConfig,
  saveConfig,
  type ControlPlaneApi,
  type IntegrationConfig,
} from '@scp/integration'
import * as React from 'react'
import { useAppState } from './app-state'

const CONFIG_KEY = 'scp.admin.integration'

interface ApiContextValue {
  api: ControlPlaneApi
  config: IntegrationConfig
  setConfig: (next: IntegrationConfig) => void
}

const ApiContext = React.createContext<ApiContextValue | null>(null)

export function ApiProvider({ children }: { children: React.ReactNode }) {
  const { state, dispatch } = useAppState()
  const stateRef = React.useRef(state)
  stateRef.current = state
  const [config, setConfigState] = React.useState<IntegrationConfig>(() => loadConfig(CONFIG_KEY))

  const api = React.useMemo(
    () =>
      config.mode === 'http'
        ? createHttpApi(config)
        : createMockApi({
            getState: () => stateRef.current,
            dispatch,
            latencyMs: config.mockLatencyMs,
          }),
    [config, dispatch],
  )

  const setConfig = React.useCallback((next: IntegrationConfig) => {
    saveConfig(CONFIG_KEY, next)
    setConfigState(next)
  }, [])

  const value = React.useMemo(() => ({ api, config, setConfig }), [api, config, setConfig])
  return <ApiContext.Provider value={value}>{children}</ApiContext.Provider>
}

export function useApi(): ApiContextValue {
  const ctx = React.useContext(ApiContext)
  if (!ctx) throw new Error('useApi must be used inside ApiProvider')
  return ctx
}
