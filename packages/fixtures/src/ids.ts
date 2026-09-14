const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'

export function newId(prefix: string): string {
  let out = ''
  for (let i = 0; i < 6; i += 1) out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  return `${prefix}-${out}`
}

export function generateSecret(length = 40): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let out = ''
  for (let i = 0; i < length; i += 1) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}

export function requestId(): string {
  return `req_${newId('').slice(1)}${newId('').slice(1)}`
}
