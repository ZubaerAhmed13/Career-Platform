'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { saveProfile } from '@/app/actions/profile';
import type { Profile } from '@/lib/profile';

export function ProfileForm({ profile, mode }: {
  profile: Profile | null;
  mode: 'onboarding' | 'settings';
}) {
  const [state, action, pending] = useActionState(saveProfile, {});
  const { setTheme } = useTheme();
  const router = useRouter();
  const [theme, chooseTheme] = useState(profile?.theme_preference ?? 'system');

  useEffect(() => {
    if (!state.message) return;
    setTheme(theme);
    if (mode === 'onboarding') {
      // Navigate only after Supabase confirms persistence.
      router.replace('/dashboard');
      router.refresh();
    }
  }, [state.message, mode, router, setTheme, theme]);

  const input = (name: keyof Profile, label: string, placeholder = '', maxLength = 150) => (
    <div className="form-row">
      <label className="label" htmlFor={name}>{label}</label>
      <input className="field" id={name} name={name} maxLength={maxLength}
        defaultValue={String(profile?.[name] ?? '')} placeholder={placeholder} />
    </div>
  );
  const select = (name: keyof Profile, label: string, choices: [string, string][]) => (
    <div className="form-row">
      <label className="label" htmlFor={name}>{label}</label>
      <select className="field" id={name} name={name}
        defaultValue={String(profile?.[name] ?? '')}>
        {choices.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
      </select>
    </div>
  );

  return (
    <form action={action} className="stack">
      <div className="page-grid">
        {input('display_name', 'Preferred name', 'How should we address you?', 80)}
        {input('full_name', 'Full name', '', 120)}
        {input('country', 'Country', '', 80)}
        {input('city', 'City or region', '', 100)}
        <div className="form-row">
          <label className="label" htmlFor="interface-language-display">Interface language</label>
          <input id="interface-language-display" className="field" value="English" readOnly aria-describedby="interface-language-note" />
          <input type="hidden" name="preferred_language" value="en" />
          <small className="subtle" id="interface-language-note">CareerOS currently uses an English interface. German CV and cover-letter output can be supported separately.</small>
        </div>
        {select('career_stage', 'Career stage', [
          ['', 'Prefer not to say'], ['student', 'Student'], ['graduate', 'Recent graduate'],
          ['early', 'Early career'], ['experienced', 'Experienced professional'],
          ['changer', 'Career changer'],
        ])}
        {input('target_role', 'Target role', 'e.g. Financial Analyst')}
        {select('primary_goal', 'Primary goal', [
          ['', 'Not decided'], ['resume', 'Build a resume'],
          ['cover_letter', 'Write cover letters'], ['job_search', 'Find opportunities'],
          ['applications', 'Track applications'], ['interview', 'Prepare for interviews'],
          ['growth', 'Career growth'],
        ])}
        <div className="form-row">
          <label className="label" htmlFor="theme_preference">Appearance</label>
          <select id="theme_preference" className="field" name="theme_preference"
            value={theme} onChange={(event) =>
              chooseTheme(event.target.value as 'system' | 'light' | 'dark')}>
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>
      </div>
      <input type="hidden" name="onboarding_completed"
        value={mode === 'onboarding' ? 'true' : String(profile?.onboarding_completed ?? false)} />
      <button className="button" type="submit" disabled={pending}>
        {pending ? 'Saving…' : mode === 'onboarding' ? 'Complete onboarding' : 'Save settings'}
      </button>
      {state.error && <p role="alert" className="error">{state.error}</p>}
      {state.message && <p role="status" className="success">{state.message}</p>}
    </form>
  );
}
