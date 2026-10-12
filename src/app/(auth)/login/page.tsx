import Link from 'next/link';
import { AuthForm } from '@/components/auth-form';

export default async function Login({
  searchParams,
}: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  return (
    <main className="auth-shell">
      <section className="card auth-card stack">
        <Link href="/" className="eyebrow">← CareerOS AI</Link>
        <h1 className="heading">Welcome back</h1>
        <p className="subtle">Sign in to your private workspace.</p>
        {error === 'confirmation' && (
          <p role="alert" className="error">
            Your email link could not be verified or has expired.
            Please request a new confirmation or recovery email.
          </p>
        )}
        <AuthForm mode="login" next={next} />
        <Link href="/forgot-password">Forgot password?</Link>
        <p>
          New here?{' '}
          <Link href="/signup" style={{ color: 'var(--accent)' }}>Create an account</Link>
        </p>
      </section>
    </main>
  );
}
