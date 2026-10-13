import {getProfile} from '@/lib/account';
import {ProfileForm} from '@/components/profile-form';
import {AccountDeletionControls} from '@/components/account-deletion-controls';
import Link from 'next/link';

export const dynamic='force-dynamic';

export default async function Settings(){
 const {user,profile}=await getProfile();
 return <div className="stack" style={{gap:26}}>
  <header>
   <p className="eyebrow">Account preferences</p>
   <h1 className="heading">Settings</h1>
   <p className="subtle">Manage your profile, security and personal information.</p>
  </header>
  <section className="card stack"><h2>Profile and appearance</h2><ProfileForm mode="settings" profile={profile}/></section>
  <section className="card stack">
   <h2>Account security</h2>
   <p>Signed in as {user.email}</p>
   <Link href="/forgot-password">Request password reset</Link>
  </section>
  <section className="card stack">
   <h2>Privacy and data export</h2>
   <p className="subtle">Download your account profile, saved file metadata, career records, evidence, pending and reviewed proposals, interview messages, and activity. Your password, live sessions, internal quota records and platform backups are not included.</p>
   <Link className="button secondary" href="/api/account/export">Export my account data (JSON)</Link>
   <Link href="/career-vault/privacy">Export or clear only my Career Vault</Link>
  </section>
  <AccountDeletionControls configured={Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim())}/>
  <p className="subtle">Account deletion cannot erase historical database backups immediately. Privacy and retention processing, including a complete subject-access request, may require support from the service operator.</p>
 </div>;
}
