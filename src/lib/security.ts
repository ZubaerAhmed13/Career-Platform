/** Prevent open redirects from OAuth/confirmation and sign-in return URLs. */
const privateDestination = new Set([
  '/dashboard', '/onboarding', '/settings', '/career-vault',
  '/resume-studio', '/cover-letters', '/jobs', '/applications',
  '/interviews', '/career-growth', '/documents', '/update-password',
]);

export function safeNextPath(input: string | null | undefined) {
  if (!input || !input.startsWith('/') || input.startsWith('//') || input.includes('\\')) {
    return '/dashboard';
  }

  try {
    // Recheck after percent-decoding to reject encoded protocol-relative URLs,
    // encoded CR/LF, encoded backslashes, or malformed sequences.
    const decoded = decodeURIComponent(input);
    if (!decoded.startsWith('/') || decoded.startsWith('//') ||
        decoded.includes('\\') || /[\r\n\0]/.test(decoded)) {
      return '/dashboard';
    }
    const url = new URL(input, 'https://career.invalid');
    if (!privateDestination.has(url.pathname)) return '/dashboard';
    return url.pathname + url.search;
  } catch {
    return '/dashboard';
  }
}

export function safePublicOrigin(value: string) {
  const url = new URL(value);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Invalid site origin');
  }
  return url.origin;
}
