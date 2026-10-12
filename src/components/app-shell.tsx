import Link from 'next/link';
import { signOut } from '@/app/actions/auth';
import { AppNavigation } from '@/components/app-navigation';
import { MobileNavigation } from '@/components/mobile-navigation';

export function AppShell({ children, email }: { children: React.ReactNode; email: string }) {
  return (
    <div className="app-layout">
      <aside className="sidebar">
        <Link href="/dashboard" style={{ fontWeight: 800, fontSize: 22 }}>
          CareerOS <span style={{ color: 'var(--accent)' }}>AI</span>
        </Link>
        <AppNavigation />
        <div style={{ marginTop: 'auto', overflowWrap: 'anywhere' }}>
          <p className="subtle" style={{ fontSize: 12 }}>{email}</p>
          <form action={signOut}>
            <button className="button secondary" type="submit">Sign out</button>
          </form>
        </div>
      </aside>
      <div>
        <MobileNavigation />
        <main className="main" id="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
