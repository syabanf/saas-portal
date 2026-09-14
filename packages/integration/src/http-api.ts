import type { ControlPlaneApi } from './adapter'
import type { IntegrationConfig } from './config'

/** Thin HTTP twin of the mock adapter. Same interface, real endpoints. */
export function createHttpApi(config: IntegrationConfig): ControlPlaneApi {
  async function call<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${config.baseUrl}${path}`, {
      method,
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
    return (await res.json()) as T
  }

  return {
    mode: 'http',
    login: (email) => call('POST', '/auth/login', { email }),
    logout: (sessionId) => call('POST', '/auth/logout', { session_id: sessionId }),
  }
}
