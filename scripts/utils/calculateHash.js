const te = new TextEncoder();

export async function calculateHashForCSP(source) {
  const bytes = te.encode(source);
  const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const base64 = btoa(String.fromCharCode(...hashArray));
  return `sha256-${base64}`;
}
