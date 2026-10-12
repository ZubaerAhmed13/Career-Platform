'use client';
import { useActionState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { reviewCareerSuggestion, addResumeTextForReview } from '@/app/actions/career';
import {careerKinds,kindLabels,type CareerRecord,type CareerSuggestion} from '@/lib/career/schema';

function Suggestion({suggestion,records}:{suggestion:CareerSuggestion;records:CareerRecord[]}){
 const [state,action,pending]=useActionState(reviewCareerSuggestion,{});
 const router=useRouter();
 useEffect(()=>{if(state.message)router.refresh();},[state.message,router]);
 const conflict=records.filter(r=>r.kind===suggestion.kind&&r.title.toLowerCase()===suggestion.title.toLowerCase());
 return <article className="card stack">
  <div><p className="eyebrow">{suggestion.origin==='ai'?'AI suggestion':'User-provided import text'} · {suggestion.kind} · {suggestion.review_status}</p>
    <h3 style={{margin:'6px 0'}}>{suggestion.title}</h3></div>
  <p style={{whiteSpace:'pre-wrap',margin:0}}>{suggestion.description}</p>
  {!!suggestion.evidence_quote&&<div className="muted-card">
    <strong>Supporting excerpt supplied to the system</strong><p style={{whiteSpace:'pre-wrap'}}>{suggestion.evidence_quote}</p>
  </div>}
  {conflict.length>0&&<p className="error" role="note">
    A record with the same title and category already exists. Review the original before accepting anything new.
  </p>}
  {suggestion.review_status==='pending'&&<form action={action} className="stack">
    <input type="hidden" name="id" value={suggestion.id}/>
    <p className="subtle">Approve only if the statement is accurate. Approval creates a new record; existing confirmed information is never replaced.</p>
    <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
      <button className="button" name="decision" value="approve" disabled={pending||conflict.length>0}>Approve as new fact</button>
      <button className="button secondary" name="decision" value="reject" disabled={pending}>Reject / keep existing facts</button>
    </div>
    {state.error&&<p className="error" role="alert">{state.error}</p>}
    {state.message&&<p className="success" role="status">{state.message}</p>}
  </form>}
 </article>;
}
export function ReviewWorkspace({suggestions,records}:{suggestions:CareerSuggestion[];records:CareerRecord[]}){
 const [state,action,pending]=useActionState(addResumeTextForReview,{});
 const router=useRouter();
 useEffect(()=>{if(state.message)router.refresh();},[state.message,router]);
 const pendingSuggestions=suggestions.filter(s=>s.review_status==='pending');
 return <div className="stack" style={{gap:24}}>
  <header><Link href="/career-vault" className="eyebrow">← Career Vault</Link>
    <h1 className="heading">Review before saving</h1>
    <p className="subtle">AI and imported content must be reviewed before becoming a confirmed career fact. Rejecting a suggestion never changes existing records.</p>
  </header>
  <section className="card stack">
    <h2>Paste resume text for later review</h2>
    <p className="subtle">Safe text-only intake (20–4,000 characters). This does not parse PDF/DOCX or automatically extract facts. A full secure CV upload pipeline is not enabled yet.</p>
    <form action={action} className="stack">
      <div className="form-row"><label className="label" htmlFor="cv-title">Record name</label><input className="field" id="cv-title" name="title" maxLength={180} placeholder="e.g. Work experience from old CV"/></div>
      <div className="form-row"><label className="label" htmlFor="cv-kind">Related category</label><select className="field" id="cv-kind" name="kind">
        {careerKinds.map(k=><option key={k} value={k}>{kindLabels[k]}</option>)}</select></div>
      <div className="form-row"><label className="label" htmlFor="cv-text">Original text</label>
        <textarea className="field" id="cv-text" name="resume_text" minLength={20} maxLength={4000} rows={6} required/></div>
      <button className="button" disabled={pending}>Save for review — not confirmed</button>
      {state.error&&<p role="alert" className="error">{state.error}</p>}
      {state.message&&<p role="status" className="success">{state.message}</p>}
    </form>
  </section>
  <section className="stack"><h2>Pending suggestions ({pendingSuggestions.length})</h2>
   {!pendingSuggestions.length?<div className="muted-card">Nothing needs approval yet. Your confirmed records are unchanged.</div>:
   pendingSuggestions.map(s=><Suggestion key={s.id} suggestion={s} records={records}/>)}
  </section>
  <section className="card stack"><h2>Review history</h2>
    {suggestions.filter(s=>s.review_status!=='pending').length===0?<p className="subtle">No previous decisions.</p>:
    suggestions.filter(s=>s.review_status!=='pending').map(s=><p key={s.id}>{s.review_status} · {s.title} ({s.kind})</p>)}
  </section>
 </div>;
}
