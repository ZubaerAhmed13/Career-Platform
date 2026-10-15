'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookOpenCheck, BriefcaseBusiness, ChartNoAxesCombined, ClipboardList,
  FileArchive, FilePenLine, Files, House, MessageSquareQuote,
  UserRound,
} from 'lucide-react';

const items = [
  { href: '/dashboard', label: 'Dashboard', Icon: House, available: true },
  { href: '/career-vault', label: 'Career Vault', Icon: UserRound, available: true },
  { href: '/resume-studio', label: 'Resume Studio', Icon: FilePenLine, available: true },
  { href: '/cover-letters', label: 'Cover Letter Studio', Icon: Files, available: false },
  { href: '/jobs', label: 'Job Discovery', Icon: BriefcaseBusiness, available: false },
  { href: '/applications', label: 'Applications', Icon: ClipboardList, available: false },
  { href: '/interviews', label: 'Interview Academy', Icon: MessageSquareQuote, available: false },
  { href: '/career-growth', label: 'Career Growth', Icon: ChartNoAxesCombined, available: false },
  { href: '/documents', label: 'Documents', Icon: FileArchive, available: false },
  { href: '/settings', label: 'Settings', Icon: BookOpenCheck, available: true },
] as const;

export function AppNavigation({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Primary navigation" className="stack" style={{ gap: 3 }}>
      {items.map(({ href, label, Icon, available }) => {
        const active = pathname === href || pathname.startsWith(href + '/');
        return (
          <Link
            className={'nav-link' + (active ? ' active' : '')}
            aria-current={active ? 'page' : undefined}
            href={href}
            key={href}
            onClick={onNavigate}
          >
            <Icon aria-hidden="true" size={18} />
            <span>
              <span>{label}</span>
              {!available && <small style={{ display: 'block', fontSize: 11 }}>Coming soon</small>}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
