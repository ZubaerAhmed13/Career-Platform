import { getProfile } from '@/lib/account';
import { AppShell } from '@/components/app-shell';
import { ThemeSync } from '@/components/theme-sync';

export default async function PrivateLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await getProfile();
  return (
    <AppShell email={user.email ?? 'Signed-in user'}>
      <ThemeSync preference={profile?.theme_preference ?? 'system'} />
      {children}
    </AppShell>
  );
}
