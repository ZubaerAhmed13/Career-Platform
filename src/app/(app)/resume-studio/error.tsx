'use client';
import Link from 'next/link';
/** Failed database requests must never look like a successful empty CV library. */
export default function ResumeStudioError({reset}:{error:Error&{digest?:string};reset:()=>void}){
 return <div className="stack" role="alert" style={{maxWidth:650}}>
  <p className="eyebrow">Resume Studio</p>
  <h1 className="heading">Your resume workspace is temporarily unavailable</h1>
  <p className="subtle">We could not load your private CVs. No Career Vault records were changed by this request.</p>
  <p className="subtle">First-time setup may require the resume database migration on your approved Supabase project. A temporary connection issue is also possible.</p>
  <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
   <button className="button" type="button" onClick={reset}>Try again</button>
   <Link className="button secondary" href="/dashboard">Return to dashboard</Link>
  </div>
 </div>;
}
