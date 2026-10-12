'use client';

import { useEffect } from 'react';
import { useTheme } from 'next-themes';

export function ThemeSync({ preference }: { preference: 'light' | 'dark' | 'system' }) {
  const { setTheme } = useTheme();
  useEffect(() => { setTheme(preference); }, [preference, setTheme]);
  return null;
}
