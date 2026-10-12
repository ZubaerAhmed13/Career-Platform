'use client';

import { useRef } from 'react';
import { AppNavigation } from '@/components/app-navigation';
import { signOut } from '@/app/actions/auth';

export function MobileNavigation() {
  const details = useRef<HTMLDetailsElement>(null);
  return (
    <header className="mobile-nav">
      <details ref={details}>
        <summary>☰ CareerOS AI · Menu</summary>
        <AppNavigation onNavigate={() => { if (details.current) details.current.open = false; }} />
        <form action={signOut}>
          <button type="submit" className="button secondary">Sign out</button>
        </form>
      </details>
    </header>
  );
}
