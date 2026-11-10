/**
 * Passphrase encryption for internal messages (AES-GCM 256, PBKDF2-SHA256 key).
 * The passphrase is never stored — only the ciphertext envelope is saved.
 */

const ITERATIONS = 150_000;

const enc = new TextEncoder();
const dec = new TextDecoder();

const toB64 = (buf: ArrayBuffer | Uint8Array) => {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
};
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function deriveKey(passphrase: string, salt: Uint8Array) {
  const base = await crypto.subtle.importKey("raw", enc.encode(passphrase), "PBKDF2", false, [
    "deriveKey",
  ]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: ITERATIONS, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptText(plain: string, passphrase: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(plain));
  return JSON.stringify({ v: 1, salt: toB64(salt), iv: toB64(iv), data: toB64(data) });
}

export async function decryptText(envelope: string, passphrase: string) {
  const { salt, iv, data } = JSON.parse(envelope) as { salt: string; iv: string; data: string };
  const key = await deriveKey(passphrase, fromB64(salt));
  try {
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromB64(iv) as BufferSource },
      key,
      fromB64(data) as BufferSource,
    );
    return dec.decode(plain);
  } catch {
    throw new Error("Wrong passphrase");
  }
}
