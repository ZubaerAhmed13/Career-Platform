'use client';
import { useActionState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { saveCareerEvidence, attachCareerEvidence, linkCareerRecords, removeCareerEvidence, removeCareerLink, detachCareerEvidence, type VaultActionState } from '@/app/actions/career';
import type { CareerRecord, CareerEvidence, CareerEvidenceLink, CareerLink } from '@/lib/career/schema';

type VaultAction=(previous:VaultActionState, form:FormData)=>Promise<VaultActionState>;
function ActionForm({action,children,submitLabel}:{action:VaultAction;children:React.ReactNode;submitLabel:string}){
 const [state,formAction,pending]=useActionState(action,{});
 const router=useRouter();
 useEffect(()=>{if(state.message)router.refresh();},[state.message,router]);
 return <form action={formAction} className="card stack">
  {children}<button disabled={pending} className="button">{pending?'Saving…':submitLabel}</button>
  {state.error&&<p className="error" role="alert">{state.error}</p>}
  {state.message&&<p className="success" role="status">{state.message}</p>}
 </form>;
}
export function EvidenceWorkspace({records,evidence,links,evidenceLinks}:{
 records:CareerRecord[],evidence:CareerEvidence[],links:CareerLink[],evidenceLinks:CareerEvidenceLink[];
}){
 const recordOptions=<>{records.map(r=><option key={r.id} value={r.id}>{r.title} ({r.kind})</option>)}</>;
 const evidenceOptions=<>{evidence.map(e=><option key={e.id} value={e.id}>{e.title}</option>)}</>;
 return <div className="stack" style={{gap:24}}>
  <header><Link href="/career-vault" className="eyebrow">← Career Vault</Link>
   <h1 className="heading">Evidence and relationships</h1>
   <p className="subtle">Connect real skills, achievements, education and projects to the career experiences they support. All links must belong to the same account.</p>
  </header>
  <div className="page-grid">
   <ActionForm action={saveCareerEvidence} submitLabel="Save supporting evidence">
    <h2 style={{margin:0}}>Add evidence source</h2>
    <p className="subtle">Record a note, source URL or document reference. This does not upload files.</p>
    <label className="label" htmlFor="e-title">Name</label><input id="e-title" className="field" name="title" maxLength={180} required/>
    <label className="label" htmlFor="e-type">Type</label><select id="e-type" className="field" name="evidence_type" defaultValue="note">
     <option value="note">Note</option><option value="url">Public URL</option><option value="document_reference">Private document reference (no upload)</option></select>
    <label className="label" htmlFor="e-url">Source URL (optional)</label><input id="e-url" className="field" name="source_url" type="url" maxLength={1500}/>
    <label className="label" htmlFor="e-excerpt">Evidence details</label><textarea id="e-excerpt" name="excerpt" className="field" maxLength={4000} rows={4}/>
   </ActionForm>
   <ActionForm action={attachCareerEvidence} submitLabel="Attach evidence">
    <h2 style={{margin:0}}>Connect evidence to a record</h2>
    <label className="label" htmlFor="e-record">Career record</label><select id="e-record" className="field" name="record_id" required>{recordOptions}</select>
    <label className="label" htmlFor="e-link">Evidence</label><select id="e-link" className="field" name="evidence_id" required>{evidenceOptions}</select>
    {(!records.length||!evidence.length)&&<p className="subtle">Add a career record and evidence entry first.</p>}
   </ActionForm>
   <ActionForm action={linkCareerRecords} submitLabel="Create career relationship">
    <h2 style={{margin:0}}>Connect two career records</h2>
    <label className="label" htmlFor="l-from">Source record</label><select id="l-from" className="field" name="from_record_id" required>{recordOptions}</select>
    <label className="label" htmlFor="l-relation">Relationship</label><select id="l-relation" name="relation" className="field">
     <option value="uses_skill">Uses skill</option><option value="supports_achievement">Supports achievement</option>
     <option value="related_project">Related project</option><option value="related_education">Related education</option>
     <option value="related">Related</option></select>
    <label className="label" htmlFor="l-to">Related record</label><select id="l-to" className="field" name="to_record_id" required>{recordOptions}</select>
    {records.length<2&&<p className="subtle">At least two different records are needed.</p>}
   </ActionForm>
  </div>
  <section className="card stack"><h2>Saved evidence ({evidence.length})</h2>
   {!evidence.length?<div className="muted-card">No evidence yet. Add a note or a trustworthy supporting source to strengthen your career facts.</div>:
   evidence.map(e=><div className="card stack" key={e.id}>
     <h3 style={{margin:0}}>{e.title}</h3><p className="subtle" style={{margin:0}}>{e.evidence_type}</p>
     {e.excerpt&&<p style={{whiteSpace:'pre-wrap'}}>{e.excerpt}</p>}
     {e.source_url&&<a href={e.source_url} target="_blank" rel="noreferrer noopener" style={{textDecoration:'underline'}}>Open source</a>}
     <p className="subtle">Attached to {evidenceLinks.filter(l=>l.evidence_id===e.id).length} record(s)</p>
     <ActionForm action={removeCareerEvidence} submitLabel="Permanently delete evidence">
      <input type="hidden" name="id" value={e.id}/>
      <label><input type="checkbox" name="confirm" value="yes" required/> Remove this evidence and its links</label>
     </ActionForm>
   </div>)}
  </section>
  <section className="card stack"><h2>Knowledge connections ({links.length})</h2>
   {!links.length?<div className="muted-card">No connections yet. Link a project to a skill or an experience to an achievement.</div>:
   links.map(link=><div className="card stack" key={link.id}>
    <p>{records.find(r=>r.id===link.from_record_id)?.title??'Deleted record'} → <strong>{link.relation.replaceAll('_',' ')}</strong> → {records.find(r=>r.id===link.to_record_id)?.title??'Deleted record'}</p>
    <ActionForm action={removeCareerLink} submitLabel="Remove relationship"><input name="id" type="hidden" value={link.id}/></ActionForm>
   </div>)}
  </section>
  <section className="card stack"><h2>Evidence attachments ({evidenceLinks.length})</h2>
   {!evidenceLinks.length?<p className="subtle">No attachments yet.</p>:evidenceLinks.map(link=><div className="card stack" key={link.id}>
    <p>{evidence.find(item=>item.id===link.evidence_id)?.title??'Deleted evidence'} → {records.find(item=>item.id===link.record_id)?.title??'Deleted career record'}</p>
    <ActionForm action={detachCareerEvidence} submitLabel="Detach evidence"><input type="hidden" name="id" value={link.id}/></ActionForm>
   </div>)}
  </section>
 </div>;
}
