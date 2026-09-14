export interface IntegrationConfig {
  mode: 'mock' | 'http'
  baseUrl: string
  issuer: string
  accessBrokerUrl: string
  /** Simulated network latency for the mock adapter (ms). */
  mockLatencyMs: number
}

export const DEFAULT_CONFIG: IntegrationConfig = {
  mode: 'mock',
  baseUrl: 'http://localhost:3100',
  issuer: 'http://localhost:3200',
  accessBrokerUrl: 'http://localhost:3300',
  mockLatencyMs: 250,
}

export function loadConfig(storageKey: string): IntegrationConfig {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return DEFAULT_CONFIG
    return { ...DEFAULT_CONFIG, ...(JSON.parse(raw) as Partial<IntegrationConfig>) }
  } catch {
    return DEFAULT_CONFIG
  }
}

export function saveConfig(storageKey: string, config: IntegrationConfig): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify(config))
  } catch {
    /* storage unavailable (private mode); keep in memory */
  }
}
