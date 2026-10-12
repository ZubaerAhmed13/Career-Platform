import Link from 'next/link';
import { getProfile } from '@/lib/account';
import { profileCompletion } from '@/lib/profile';
import { vaultCounts, type CareerRecord } from '@/lib/career/schema';

const guidance:Record<string,string>={
 resume:'Start by adding experience and evidence to your permanent Career Vault before using future Resume Studio.',
 cover_letter:'Add real projects and achievements that future cover letters can cite.',
 job_search:'Add skills and target experiences to prepare for future job matching.',
 applications:'Use the Career Vault now; the application tracker is still planned.',
 interview:'Document real career stories; interview practice is available only when an AI provider is configured.',
 growth:'Clarify your career experience and transferable skills.',
};
export default async function Dashboard(){
 const {user,profile}=await getProfile();
 const {serverSupabase}=await import('@/lib/supabase/server');
 const supabase=await serverSupabase();
 const result=await supabase.from('career_records').select('kind,status')
  .eq('user_id',user.id).limit(1000);
 const activity=await supabase.from('career_events').select('id,record_id,action,created_at').eq('user_id',user.id).order('created_at',{ascending:false}).limit(5);
 const available=!result.error;
 const rows=available?(result.data??[]) as Pick<CareerRecord,'kind'|'status'>[]:[];
 const stats=vaultCounts(rows);
 const name=profile?.display_name||user.email?.split('@')[0]||'there';
 const checks=[['Account created',true],['Basic profile saved',!!profile?.display_name],
   ['Language selected',!!profile?.preferred_language],['Onboarding completed',!!profile?.onboarding_completed]] as const;
 return <div className="stack" style={{gap:26}}>
  <header><p className="eyebrow">Your workspace</p><h1 className="heading">Welcome, {name}</h1>
   <p className="subtle">Your verified career information lives in one permanent workspace.</p></header>
  <div className="page-grid">
   <section className="card stack"><h2>Career information</h2>
     {available?<><strong style={{fontSize:32}}>{stats.total}</strong>
      <p className="subtle">Career records{rows.length>=1000?' (first 1,000 shown)':''}</p>
      <p>{stats.counts.experience} experiences · {stats.counts.education} education · {stats.counts.skill} skills · {stats.counts.project} projects</p>
      <p className="subtle">{stats.counts.achievement} achievements · {stats.pending} records requiring review</p>
     </>:<p className="subtle">Career Vault setup requires its database migrations. Existing account features remain available.</p>}
     <Link className="button" href="/career-vault">Open Career Vault</Link>
   </section>
   <section className="card stack"><h2>Basic account profile</h2>
     <strong style={{fontSize:32}}>{profileCompletion(profile??{})}%</strong>
     <p className="subtle">Computed from six basic profile fields, not future job readiness.</p>
     <Link className="button secondary" href="/settings">Edit profile</Link>
   </section>
   <section className="card stack"><h2>Getting started</h2>
    {checks.map(([label,done])=><p key={label} style={{margin:0}}>{done?'✓':'○'} {label}</p>)}
    {!profile?.onboarding_completed&&<Link className="button secondary" href="/onboarding">Continue onboarding</Link>}
   </section>
  </div>
  <section className="card stack"><h2>Next useful step</h2>
   <p>{stats.total===0?'Add your first real experience, education or skill.':
      stats.pending>0?'Review unconfirmed career information before using it.':
      guidance[profile?.primary_goal??'']??'Connect relevant skills and achievements to supporting evidence.'}</p>
   <Link href={stats.pending>0?'/career-vault/review':'/career-vault'} className="button secondary">Continue →</Link>
  </section>
  <section className="card stack"><h2>Recent career activity</h2>
   {activity.error?<p className="subtle">Activity history is unavailable until the database migrations are applied.</p>:
    !activity.data?.length?<div className="muted-card">No career records have been changed yet.</div>:
    activity.data.map(event=><p key={event.id}>{event.action} · {new Date(event.created_at).toLocaleDateString()} · record {String(event.record_id).slice(0,8)}</p>)}
  </section>
  <section className="card stack"><h2>Other future modules</h2>
   <p className="subtle">Resume Studio, cover letters, application tracking and job discovery remain planned and unavailable. No sample job records or career activities are invented.</p>
  </section>
 </div>;
}
