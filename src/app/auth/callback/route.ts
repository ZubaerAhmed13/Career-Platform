import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { serverSupabase } from '@/lib/supabase/server';
import { safeNextPath } from '@/lib/security';

const emailOtpTypes = new Set<string>([
  'email', 'signup', 'invite', 'magiclink', 'recovery', 'email_change',
]);

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  const rawType = url.searchParams.get('type');
  const type = rawType && emailOtpTypes.has(rawType) ? rawType as EmailOtpType : null;

  // All redirects go to our configured site; never trust a forwarded Host header.
  const origin = process.env.NEXT_PUBLIC_SITE_URL
    ? new URL(process.env.NEXT_PUBLIC_SITE_URL).origin
    : url.origin;

  const supabase = await serverSupabase();
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const path = safeNextPath(url.searchParams.get('next') ?? '/onboarding');
      return NextResponse.redirect(new URL(path, origin));
    }
  } else if (tokenHash && type) {
    // Support Supabase's server-side email templates that send a token hash.
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) {
      const path = safeNextPath(
        url.searchParams.get('next') ?? (type === 'recovery' ? '/update-password' : '/onboarding'),
      );
      return NextResponse.redirect(new URL(path, origin));
    }
  }
  return NextResponse.redirect(new URL('/login?error=confirmation', origin));
}
