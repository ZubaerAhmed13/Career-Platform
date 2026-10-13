'use client';
import { useActionState, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { reviewCareerSuggestion, addResumeTextForReview } from '@/app/actions/career';
import { editSuggestion, mergeSuggestion, deleteCareerSuggestion } from '@/app/actions/career-review';
import { extractPastedCV } from '@/app/actions/career-import';
import {careerKinds,kindLabels,type CareerRecord,type CareerSuggestion} from '@/lib/career/schema';
import {potentialCareerConflicts} from '@/lib/career/conflicts';


function AIExtractForm(){
 const [state,action,pending]=useActionState(extractPastedCV,{});
 const router=useRouter();
 useEffect(()=>{if(state.message)router.refresh();},[state.message,router]);
 return <form action={action} className="card stack">
  <h2>Extract reviewable facts from pasted text with AI</h2>
  <p className="subtle">This sends your supplied text to the configured self-hosted CareerOS model. Only proposals with direct supporting excerpts enter your private review queue; nothing is approved automatically.</p>
  <label htmlFor="ai-cv-text" className="label">Paste existing CV text (20–4,000 characters)</label>
  <textarea className="field" id="ai-cv-text" name="resume_text" minLength={20} maxLength={4000} rows={6} required/>
  <label><input type="checkbox" name="consent" value="yes" required/> I consent to sending this text to the privately hosted CareerOS model for structured extraction.</label>
  <button className="button" disabled={pending}>{pending?'Extracting…':'Extract proposed facts for my review'}</button>
  {state.error&&<p role="alert" className="error">{state.error}</p>}
  {state.message&&<p role="status" className="success">{state.message}</p>}
 </form>;
}

function EditProposal({suggestion}:{suggestion:CareerSuggestion}){
 const [state,action,pending]=useActionState(editSuggestion,{});
 const router=useRouter();
 useEffect(()=>{if(state.message)router.refresh();},[state.message,router]);
 return <form action={action} className="stack" style={{padding:14,border:'1px solid var(--line)',borderRadius:12}}>
  <input name="id" type="hidden" value={suggestion.id}/>
  <label className="label" htmlFor={'edit-kind-'+suggestion.id}>Category</label>
  <select className="field" id={'edit-kind-'+suggestion.id} name="kind" defaultValue={suggestion.kind}>
   {careerKinds.map(kind=><option key={kind} value={kind}>{kindLabels[kind]}</option>)}</select>
  <label className="label" htmlFor={'edit-title-'+suggestion.id}>Suggested title</label>
  <input className="field" id={'edit-title-'+suggestion.id} name="title" defaultValue={suggestion.title} maxLength={180} required/>
  <label className="label" htmlFor={'edit-description-'+suggestion.id}>Suggested detail</label>
  <textarea className="field" id={'edit-description-'+suggestion.id} name="description" defaultValue={suggestion.description} maxLength={4000} rows={4}/>

  <label className="label" htmlFor={'edit-organization-'+suggestion.id}>Employer or institution (optional)</label>
  <input className="field" id={'edit-organization-'+suggestion.id} name="organization" maxLength={180} defaultValue={suggestion.organization??''}/>
  <label className="label" htmlFor={'edit-location-'+suggestion.id}>Location (optional)</label>
  <input className="field" id={'edit-location-'+suggestion.id} name="location" maxLength={150} defaultValue={suggestion.location??''}/>
  <div className="page-grid">
   <div className="form-row"><label className="label" htmlFor={'edit-start-'+suggestion.id}>Start date (optional)</label>
    <input className="field" type="date" id={'edit-start-'+suggestion.id} name="started_on" defaultValue={suggestion.started_on??''}/></div>
   <div className="form-row"><label className="label" htmlFor={'edit-end-'+suggestion.id}>End date (optional)</label>
    <input className="field" type="date" id={'edit-end-'+suggestion.id} name="ended_on" defaultValue={suggestion.ended_on??''}/></div>
  </div>
  <label><input type="checkbox" name="is_current" value="yes" defaultChecked={suggestion.is_current}/> This role/qualification is ongoing. End date must be empty.</label>

  <button className="button secondary" disabled={pending}>Save corrected suggestion</button>
  {state.error&&<p role="alert" className="error">{state.error}</p>}
  {state.message&&<p role="status" className="success">{state.message}</p>}
 </form>;
}
function MergeProposal({suggestion,records}:{suggestion:CareerSuggestion;records:CareerRecord[]}){
 const [state,action,pending]=useActionState(mergeSuggestion,{});
 const router=useRouter();
 const candidates=records.filter(r=>r.kind===suggestion.kind&&r.status==='confirmed');
 const [target,setTarget]=useState(candidates[0]?.id??'');
 useEffect(()=>{if(state.message)router.refresh();},[state.message,router]);
 const original=candidates.find(c=>c.id===target);
 if(!candidates.length)return <p className="subtle">No confirmed record of the same category is available for merging.</p>;
 return <form action={action} className="stack" style={{border:'1px solid var(--line)',padding:14,borderRadius:12}}>
   <input type="hidden" name="id" value={suggestion.id}/>
   <input type="hidden" name="expected_revision" value={original?.revision??''}/>
   <label className="label" htmlFor={'merge-target-'+suggestion.id}>Choose existing confirmed record</label>
   <select className="field" id={'merge-target-'+suggestion.id} name="target_record_id" value={target} onChange={e=>setTarget(e.target.value)}>
    {candidates.map(c=><option key={c.id} value={c.id}>{c.title} {c.organization&&'· '+c.organization}</option>)}
   </select>
   {original&&<div className="page-grid">
    <div className="muted-card"><strong>Existing confirmed value</strong><p>{original.title}</p><p>{original.organization} · {original.started_on??'Start unknown'} to {original.is_current?'Present':original.ended_on??'End unknown'}</p><p style={{whiteSpace:'pre-wrap'}}>{original.description||'No description'}</p></div>
    <div className="muted-card"><strong>Proposed new value</strong><p>{suggestion.title}</p><p>{suggestion.organization||'Employer unspecified'} · {suggestion.location||'Location unspecified'}</p><p>{suggestion.started_on??'Start unknown'} to {suggestion.is_current?'Present':suggestion.ended_on??'End unknown'}</p><p style={{whiteSpace:'pre-wrap'}}>{suggestion.description||'No description'}</p></div>
   </div>}
   <label><input type="checkbox" name="merge_title" value="yes"/> Replace title</label>
   <label><input type="checkbox" name="merge_description" value="yes"/> Replace description</label>
   <label><input type="checkbox" name="merge_organization" value="yes"/> Replace employer/institution</label>
   <label><input type="checkbox" name="merge_location" value="yes"/> Replace location</label>
   <label><input type="checkbox" name="merge_dates" value="yes"/> Replace start, end and ongoing status together</label>
   <label><input type="checkbox" name="confirm_merge" value="yes" required/> I reviewed both versions and approve only the selected replacements.</label>
   <button className="button" disabled={pending}>Merge selected fields</button>
   <p className="subtle">Other record fields remain intact; a revision check prevents overwriting newer edits.</p>
   {state.error&&<p role="alert" className="error">{state.error}</p>}
   {state.message&&<p role="status" className="success">{state.message}</p>}
 </form>;
}


function RemoveProposal({id}:{id:string}){
 const [state,action,pending]=useActionState(deleteCareerSuggestion,{});
 const router=useRouter();
 useEffect(()=>{if(state.message)router.refresh();},[state.message,router]);
 return <details><summary style={{cursor:'pointer',padding:10,fontWeight:600}}>Remove this suggestion</summary>
  <form action={action} className="stack">
   <input type="hidden" name="id" value={id}/>
   <label><input type="checkbox" name="confirm" value="yes" required/> Permanently remove this suggestion. My confirmed records will stay unchanged.</label>
   <button className="button secondary" disabled={pending}>Remove suggestion</button>
   {state.error&&<p role="alert" className="error">{state.error}</p>}
   {state.message&&<p role="status" className="success">{state.message}</p>}
  </form></details>;
}

function Suggestion({suggestion,records}:{suggestion:CareerSuggestion;records:CareerRecord[]}){
 const [state,action,pending]=useActionState(reviewCareerSuggestion,{});
 const router=useRouter();
 useEffect(()=>{if(state.message)router.refresh();},[state.message,router]);
 const conflict=potentialCareerConflicts(suggestion,records);
 return <article className="card stack">
  <div><p className="eyebrow">{suggestion.origin==='ai'?'AI suggestion':'User-provided import text'} · {suggestion.kind} · {suggestion.review_status}</p>
    <h3 style={{margin:'6px 0'}}>{suggestion.title}</h3></div>
  <p style={{whiteSpace:'pre-wrap',margin:0}}>{suggestion.description}</p>
  {!!suggestion.evidence_quote&&<div className="muted-card">
    <strong>Supporting excerpt supplied to the system</strong><p style={{whiteSpace:'pre-wrap'}}>{suggestion.evidence_quote}</p>
  </div>}
  {conflict.length>0&&<p className="error" role="note">
    A potentially related record already exists. Review the dates, employer and original facts before saving a separate record or selectively merging.
   {conflict.map(record=><span key={record.id} style={{display:'block',marginTop:6}}>
      Existing: {record.title} {record.organization&&'· '+record.organization} · {record.started_on??'Start unknown'} to {record.is_current?'Present':record.ended_on??'End unknown'}
    </span>)}
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
  {suggestion.review_status==='pending'&&conflict.length>0&&
   <form action={action} className="stack" style={{border:'1px solid var(--line)',borderRadius:12,padding:14}}>
     <input type="hidden" name="id" value={suggestion.id}/>
     <p><strong>Save separately after comparison</strong></p>
     <p className="subtle">Use this only when the apparent duplicate represents a genuinely different role, project, qualification or achievement.</p>
     <label><input type="checkbox" name="confirm_separate" value="yes" required/> I compared the existing records and confirm this is a distinct fact.</label>
     <button className="button secondary" name="decision" value="separate" disabled={pending}>Save as a separate confirmed record</button>
     {state.error&&<p className="error" role="alert">{state.error}</p>}
     {state.message&&<p className="success" role="status">{state.message}</p>}
   </form>}
  {suggestion.review_status==='pending'&&<div className="stack">
    <details><summary style={{cursor:'pointer',padding:10,fontWeight:600}}>Edit proposed information before approval</summary>
      <EditProposal suggestion={suggestion}/></details>
    <details><summary style={{cursor:'pointer',padding:10,fontWeight:600}}>Merge selected fields into a confirmed record</summary>
      <MergeProposal suggestion={suggestion} records={records}/></details>
  </div>}
  <RemoveProposal id={suggestion.id}/>
 </article>;
}
export function ReviewWorkspace({suggestions,records,aiConfigured}:{suggestions:CareerSuggestion[];records:CareerRecord[];aiConfigured:boolean}){
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
    <p className="subtle">Safe text-only intake (20–4,000 characters). This accepts pasted text only. For PDF/DOCX files, use the browser-local extractor above; server-side antivirus uploads remain disabled until a private scanner is available.</p>
    <form action={action} className="stack">
      <div className="form-row"><label className="label" htmlFor="cv-title">Record name</label><input className="field" id="cv-title" name="title" maxLength={180} placeholder="e.g. Work experience from old CV"/></div>
      <div className="form-row"><label className="label" htmlFor="cv-kind">Related category</label><select className="field" id="cv-kind" name="kind">
        {careerKinds.map(k=><option key={k} value={k}>{kindLabels[k]}</option>)}</select></div>
      <div className="form-row"><label className="label" htmlFor="cv-text">Original text</label>
        <textarea className="field" id="cv-text" name="resume_text" minLength={20} maxLength={4000} rows={6} required/></div>
      <label><input type="checkbox" name="detect_sections" value="yes" defaultChecked/> Split recognizable CV sections into separate pending facts. If none are recognized, keep the original text as one unreviewed item. Maximum six candidates per import.</label>
      <button className="button" disabled={pending}>Save for review — not confirmed</button>
      {state.error&&<p role="alert" className="error">{state.error}</p>}
      {state.message&&<p role="status" className="success">{state.message}</p>}
    </form>
  </section>
  {aiConfigured?<AIExtractForm/>:<p className="muted-card" role="status">Automatic AI text extraction is unavailable until a server-side AI provider and trusted database persistence are configured. Manual records and text review still work.</p>}
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
