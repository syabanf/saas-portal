import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
const urls = ['http://localhost:5173/__demo/state', 'http://localhost:5174/__demo/state']
async function read(url: string) {
  const r = await fetch(url)
  assert.equal(r.status, 200)
  return r.json()
}
async function post(url: string, body: unknown) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  assert.equal(r.status, 200)
  return r.json()
}
async function main() {
  const ids = Array.from({ length: 12 }, () => `ux-test-${randomUUID()}`)
  try {
    const now = new Date().toISOString()
    await Promise.all(
      ids.map((id, i) =>
        post(urls[i % 2]!, {
          id,
          action: {
            type: 'users/upsert',
            user: {
              id,
              name: 'Temporary UX test',
              email: `${id}@example.com`,
              platformAdmin: false,
              status: 'invited',
              createdAt: now,
              updatedAt: now,
            },
          },
        }),
      ),
    )
    const snapshot = await read(urls[0]!)
    for (const id of ids)
      assert(
        snapshot.state.users.some((u: { id: string }) => u.id === id),
        'Concurrent write was lost',
      )
    const request = { id: randomUUID(), action: { type: 'users/remove', id: ids[0] } }
    const first = await post(urls[0]!, request)
    const retry = await post(urls[1]!, request)
    assert.equal(first.revision, retry.revision, 'Retry must not apply a second mutation')
    const portal = await read(urls[1]!)
    assert.deepEqual(retry.state, portal.state)
    console.log(
      'Shared store passed: 12 concurrent writes across both origins, idempotent retry, matching state.',
    )
  } finally {
    for (const id of ids)
      await post(urls[0]!, { id: randomUUID(), action: { type: 'users/remove', id } })
  }
}
void main()
