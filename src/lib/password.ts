import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'crypto'

const KEY_LENGTH = 64
const SCRYPT_N = 16_384
const SCRYPT_R = 8
const SCRYPT_P = 1
const MAX_PASSWORD_LENGTH = 1_024

function deriveKey(
  password: string,
  salt: Buffer,
  cost: { N: number; r: number; p: number }
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(
      password,
      salt,
      KEY_LENGTH,
      {
        ...cost,
        maxmem: 64 * 1024 * 1024,
      },
      (error, derivedKey) => {
        if (error) {
          reject(error)
          return
        }
        resolve(derivedKey)
      }
    )
  })
}

export function isHashedPassword(value: string): boolean {
  return value.startsWith('scrypt$')
}

export async function hashPassword(password: string): Promise<string> {
  if (!password || password.length > MAX_PASSWORD_LENGTH) {
    throw new Error('Geçersiz parola uzunluğu.')
  }

  const salt = randomBytes(16)
  const derivedKey = await deriveKey(password, salt, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  })

  return [
    'scrypt',
    SCRYPT_N,
    SCRYPT_R,
    SCRYPT_P,
    salt.toString('base64url'),
    derivedKey.toString('base64url'),
  ].join('$')
}

export async function verifyPassword(
  password: string,
  storedPassword: string
): Promise<boolean> {
  if (
    !password ||
    password.length > MAX_PASSWORD_LENGTH ||
    !storedPassword
  ) {
    return false
  }

  if (!isHashedPassword(storedPassword)) {
    const supplied = Buffer.from(password)
    const stored = Buffer.from(storedPassword)

    return supplied.length === stored.length && timingSafeEqual(supplied, stored)
  }

  const [algorithm, nValue, rValue, pValue, saltValue, hashValue] =
    storedPassword.split('$')
  const N = Number(nValue)
  const r = Number(rValue)
  const p = Number(pValue)

  if (
    algorithm !== 'scrypt' ||
    N !== SCRYPT_N ||
    r !== SCRYPT_R ||
    p !== SCRYPT_P ||
    !saltValue ||
    !hashValue
  ) {
    return false
  }

  try {
    const salt = Buffer.from(saltValue, 'base64url')
    const storedHash = Buffer.from(hashValue, 'base64url')
    const suppliedHash = await deriveKey(password, salt, { N, r, p })

    return (
      storedHash.length === suppliedHash.length &&
      timingSafeEqual(storedHash, suppliedHash)
    )
  } catch {
    return false
  }
}
