'use client';
import Link from 'next/link';
import {useEffect,useMemo,useRef,useState,useTransition} from 'react';
import {useRouter} from 'next/navigation';
import {createTargetedResume,saveTailoringSession} from '@/app/actions/resume-tailoring';
import {briefFromRow,requirementCategories,requirementPriorities,type JobBrief,type JobRequirement,type TailoringRow} from '@/lib/tailoring/schema';
import {newManualRequirement,extractRequirements} from '@/lib/tailoring/requirements';
import {compareResume,coverage,findEvidence} from '@/lib/tailoring/matching';
import {qualityWarnings,type ResumeRow} from '@/lib/resume/schema';
import type {CareerRecord} from '@/lib/career/schema';

export function TailoringWorkspace({session,resumes,vault}:{
 session:TailoringRow;resumes:ResumeRow[];vault:CareerRecord[]
}){
 const router=useRouter();
 const [brief,setBrief]=useState<JobBrief>(()=>briefFromRow(session));
 const [message,setMessage]=useState(''),[status,setStatus]=useState('Saved');
 const [sourceId,setSourceId]=useState<string>(session.source_resume_id??'');
 const [pending,start]=useTransition();
 const [newRequirement,setNewRequirement]=useState('');
 const [filter,setFilter]=useState<'all'|'approved'|'needs'>('all');
 const revision=useRef(session.revision),saving=useRef(false),blocked=useRef(false);
 const saved=useRef(JSON.stringify(brief)),current=useRef(brief);
 const [tick,setTick]=useState(0);
 current.current=brief;
 const dirty=JSON.stringify(brief)!==saved.current;
 const matches=useMemo(()=>brief.requirements.map(r=>findEvidence(r,vault)),[brief.requirements,vault]);
 const summary=coverage(matches);
 const targeted=resumes.find(r=>r.id===session.tailored_resume_id);
 const changes=session.source_snapshot&&targeted?compareResume(session.source_snapshot,targeted.draft_content):[];
 const sourceOptions=resumes.filter(r=>r.id!==session.tailored_resume_id);
 const displayed=matches.filter(e=>filter==='all'||(filter==='approved'?e.requirement.review==='approved':
  e.requirement.review==='approved'&&e.status!=='direct'));
 function change(edit:(copy:JobBrief)=>void){
  setBrief(previous=>{const copy=structuredClone(previous);edit(copy);return copy;});
  if(!blocked.current)setStatus('Unsaved changes');
 }
 async function save(snapshot:JobBrief){
  if(saving.current||blocked.current)return false;
  saving.current=true;setStatus('Saving…');
  try{
   const result=await saveTailoringSession(session.id,revision.current,snapshot);
   if(!result.ok){
    if(result.conflict)blocked.current=true;
    setStatus(result.conflict?'Conflict detected':'Save failed');
    setMessage(result.error);return false;
   }
   revision.current=result.revision!;
   saved.current=JSON.stringify(snapshot);
   setStatus(JSON.stringify(current.current)===saved.current?'Saved':'Unsaved changes');
   if(JSON.stringify(current.current)!==saved.current)setTick(n=>n+1);
   return true;
  }catch{
   setStatus('Save failed');
   setMessage('Connection failed. Your edits are still in this browser; retry saving.');
   return false;
  }finally{saving.current=false;}
 }
 useEffect(()=>{
  if(!dirty||saving.current||blocked.current)return;
  const timer=setTimeout(()=>void save(brief),900);
  return ()=>clearTimeout(timer);
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[brief,tick,dirty]);
 function patchRequirement(id:string,changeSet:Partial<JobRequirement>){
  change(b=>{b.requirements=b.requirements.map(r=>r.id===id?{
   ...r,...changeSet,...(changeSet.text!==undefined?{origin:'user' as const}:{}),
  }:r);});
 }
 function add(){
  const value=newRequirement.trim();
  if(value.length<2||value.length>1200){setMessage('Enter a requirement between 2 and 1,200 characters.');return;}
  change(b=>{if(b.requirements.length>=100)return;b.requirements.push(newManualRequirement(value));});
  setNewRequirement('');
 }
 function reanalyse(){
  if(!window.confirm('Replace all current requirement annotations with fresh candidate extractions? Previously approved or manually added requirements will be lost.'))return;
  change(b=>{b.requirements=extractRequirements(b.originalDescription);});
 }
 function createCopy(){
  start(async()=>{
   if(saving.current){setMessage('Finish saving the current edits before copying a resume.');return;}
   if(dirty&&!await save(current.current))return;
   if(JSON.stringify(current.current)!==saved.current){setMessage('More edits are still unsaved. Try again.');return;}
   const result=await createTargetedResume(session.id,revision.current,sourceId||null);
   if(!result.ok){setMessage(result.error);return;}
   setMessage('Independent targeted copy created. The source resume was not changed.');
   router.refresh();
  });
 }
 const verified=brief.requirements.filter(r=>r.review==='approved');
 return <main className="stack tailoring-workspace">
  <header className="resume-editor-top">
   <div><Link href="/resume-studio/tailor" className="subtle">← All job briefs</Link>
    <p className="eyebrow">Resume Studio / job targeting</p>
    <h1 className="heading">{session.job_title}</h1>
    <p className="subtle">{session.employer_name||'Employer not specified'} · {status} {dirty?'· editing':''}</p>
   </div>
   <div className="resume-top-actions">
    <button className="button secondary" disabled={pending||blocked.current} onClick={()=>void save(current.current)}>Save now</button>
    {session.tailored_resume_id&&<Link className="button" href={'/resume-studio/'+session.tailored_resume_id}>Edit targeted CV →</Link>}
   </div>
  </header>
  {blocked.current&&<div className="card stack" role="alert">
   <strong>Another tab changed this job brief.</strong>
   <p>Copy any unsaved text before refreshing. This tab will not overwrite the newer revision.</p>
   <button className="button secondary" onClick={()=>window.location.reload()}>Reload latest version</button>
  </div>}
  {message&&<p className="muted-card" role="status">{message}</p>}
  <section className="tailoring-summary" aria-label="Verified requirement coverage">
   <div className="card"><strong>{summary.total}</strong><span>Reviewed criteria</span></div>
   <div className="card"><strong>{summary.direct}</strong><span>Directly evidenced</span></div>
   <div className="card"><strong>{summary.related}</strong><span>Related / needs review</span></div>
   <div className="card"><strong>{summary.missing}</strong><span>No confirmed evidence</span></div>
  </section>
  <p className="subtle">Essential criteria: {summary.essentialDirect} of {summary.essential} with direct documented evidence. These are evidence counts, not ATS scores or hiring predictions.</p>
  <div className="tailoring-columns">
   <div className="stack">
    <section className="card stack">
     <h2 style={{margin:0}}>1. Job brief</h2>
     <p className="subtle">Original text and location are private to your account. A saved posting URL is never fetched.</p>
     <div className="resume-form-grid">
      <label className="form-row"><span className="label">Job title</span>
       <input className="field" maxLength={180} value={brief.jobTitle} onChange={e=>change(b=>{b.jobTitle=e.target.value;})}/></label>
      <label className="form-row"><span className="label">Employer</span>
       <input className="field" maxLength={180} value={brief.employerName} onChange={e=>change(b=>{b.employerName=e.target.value;})}/></label>
      <label className="form-row"><span className="label">Location</span>
       <input className="field" maxLength={180} value={brief.location} onChange={e=>change(b=>{b.location=e.target.value;})}/></label>
      <label className="form-row"><span className="label">Employment type</span>
       <input className="field" maxLength={100} value={brief.employmentType} onChange={e=>change(b=>{b.employmentType=e.target.value;})}/></label>
     </div>
     <label className="form-row"><span className="label">Posting URL (reference only)</span>
      <input className="field" type="url" maxLength={1500} value={brief.jobUrl}
       onChange={e=>change(b=>{b.jobUrl=e.target.value;})}/></label>
     <label className="form-row"><span className="label">Original description</span>
      <textarea className="field" rows={6} maxLength={50000} value={brief.originalDescription}
       onChange={e=>change(b=>{b.originalDescription=e.target.value;})}/></label>
     <button type="button" className="button secondary" onClick={reanalyse}>Re-analyse text (replaces reviewed annotations)</button>
     <label className="form-row"><span className="label">Private notes</span>
      <textarea className="field" rows={2} maxLength={4000} value={brief.notes} onChange={e=>change(b=>{b.notes=e.target.value;})}/></label>
    </section>
    <section className="card stack">
     <h2 style={{margin:0}}>2. Review job requirements</h2>
     <p className="subtle">These are conservative candidate line excerpts, not exhaustive automatic understanding. Explicitly approve, correct or reject each. Compound / alternative statements require human interpretation.</p>
     <div className="resume-card-actions">
      {(['all','approved','needs'] as const).map(v=><button key={v} className={filter===v?'button':'button secondary'} onClick={()=>setFilter(v)}>{v==='all'?'All':v==='approved'?'Approved':'Evidence gaps'}</button>)}
     </div>
     {!brief.requirements.length&&<p className="subtle">No candidate lines detected. Add requirements yourself below.</p>}
     {displayed.map(({requirement:r,status:evidenceStatus,matches:links,warning})=><article key={r.id} className="tailoring-requirement stack">
      <div className="resume-inline-header">
       <strong>{r.review==='candidate'?'Needs approval':r.review==='approved'?'Approved':'Rejected'}</strong>
       <span className="subtle">{evidenceStatus==='none'?'No confirmed evidence':evidenceStatus==='direct'?'Direct evidence':evidenceStatus==='related'?'Related evidence':'Review compound wording'}</span>
      </div>
      <textarea className="field" rows={2} maxLength={1200} aria-label="Requirement wording" value={r.text}
       onChange={e=>patchRequirement(r.id,{text:e.target.value})}/>
      <p className="subtle" style={{margin:0}}>Source: {r.origin==='user'?'User-edited or added':r.excerpt||'Candidate from job text'} · {r.relation}</p>
      <div className="resume-form-grid">
       <label className="form-row"><span className="label">Category</span>
        <select className="field" value={r.category} onChange={e=>patchRequirement(r.id,{category:e.target.value as JobRequirement['category']})}>
         {requirementCategories.map(c=><option value={c} key={c}>{c}</option>)}</select></label>
       <label className="form-row"><span className="label">Priority</span>
        <select className="field" value={r.priority} onChange={e=>patchRequirement(r.id,{priority:e.target.value as JobRequirement['priority']})}>
         {requirementPriorities.map(p=><option value={p} key={p}>{p}</option>)}</select></label>
       <label className="form-row"><span className="label">Logic</span>
        <select className="field" value={r.relation} onChange={e=>patchRequirement(r.id,{relation:e.target.value as JobRequirement['relation']})}>
         <option value="single">Single criterion</option><option value="alternative">Alternative (OR)</option>
         <option value="compound">Compound (AND)</option></select></label>
      </div>
      {warning&&<p className="subtle" role="status">Caution: {warning}</p>}
      {r.review==='approved'&&links.length>0&&<details><summary>Inspect {links.length} matching Career Vault record(s)</summary>
       <ul className="tailoring-evidence">{links.map(link=><li key={link.recordId}>
        <strong>{link.title}</strong> · {link.classification}<p>{link.excerpt||'No description recorded'}</p>
        <small>{link.rule} · Source revision {link.revision}</small>
       </li>)}</ul></details>}
      <div className="resume-card-actions">
       <button className="button secondary" onClick={()=>patchRequirement(r.id,{review:'approved'})} disabled={r.review==='approved'}>Approve</button>
       <button className="button secondary" onClick={()=>patchRequirement(r.id,{review:'rejected'})} disabled={r.review==='rejected'}>Reject</button>
      </div>
     </article>)}
     <label className="form-row"><span className="label">Add a missed requirement manually</span>
      <textarea className="field" maxLength={1200} rows={2} value={newRequirement} onChange={e=>setNewRequirement(e.target.value)}/></label>
     <button className="button secondary" type="button" onClick={add} disabled={brief.requirements.length>=100}>Add requirement</button>
     <small className="subtle">{verified.length} approved, {brief.requirements.filter(r=>r.review==='candidate').length} awaiting review. Only approved criteria appear in evidence coverage.</small>
    </section>
   </div>
   <div className="stack">
    <section className="card stack">
     <h2 style={{margin:0}}>3. Your evidence and gaps</h2>
     <p className="subtle">Evidence is matched only from confirmed Career Vault records. A similar keyword alone may be insufficient. No missing skill will be invented.</p>
     {verified.length===0?<p>No reviewed criteria yet. Approve requirements first.</p>:
      verified.map(r=>{
       const result=matches.find(m=>m.requirement.id===r.id)!;
       return <div key={r.id} className="tailoring-evidence-row">
        <strong>{r.text}</strong>
        <p className="subtle">{r.priority} · {result.status==='none'?'No confirmed evidence':result.status==='direct'?'Direct evidence':result.status==='related'?'Related, not proof':'Needs user review'}</p>
        {result.warning&&<p role="status">{result.warning}</p>}
       </div>;
      })}
     <Link className="button secondary" href="/career-vault">Review or correct Career Vault →</Link>
    </section>
    <section className="card stack">
     <h2 style={{margin:0}}>4. Make your targeted resume</h2>
     {session.tailored_resume_id?<>
      <p>An independent tailored CV is linked. Editing it never rewrites the source resume or confirmed Career Vault facts.</p>
      <Link className="button" href={'/resume-studio/'+session.tailored_resume_id+'?vault=1'}>Open targeted editor + confirmed facts</Link>
      <Link className="button secondary" href={'/resume-studio/'+session.tailored_resume_id+'/print'} target="_blank">Print saved targeted CV / PDF</Link>
     </>:<>
      <label className="form-row"><span className="label">Choose the original resume</span>
       <select className="field" value={sourceId} onChange={e=>setSourceId(e.target.value)}>
        <option value="">Start blank (same Step 3 editor)</option>
        {sourceOptions.map(r=><option value={r.id} key={r.id}>{r.name}</option>)}
       </select></label>
      <p className="subtle">The source&apos;s exact saved draft, design, portrait choice and confirmed source snapshots are copied. After copying, select or reorder Career Vault facts inside the usual editor.</p>
      <button className="button" type="button" disabled={pending||blocked.current||saving.current} onClick={createCopy}>{pending?'Creating copy…':'Create independent targeted CV'}</button>
     </>}
    </section>
    {targeted&&<section className="card stack">
     <h2 style={{margin:0}}>5. Compare and export</h2>
     <p className="subtle">Comparison is against the source snapshot captured when the copy was created; it never changes retroactively. Refresh after edits made in another tab.</p>
     <div className="resume-card-actions"><button type="button" className="button secondary" onClick={()=>router.refresh()}>Refresh comparison</button>
      <Link className="button secondary" href={'/resume-studio/'+targeted.id}>Edit / version / DOCX / text</Link></div>
     {changes.length?<ul className="tailoring-diff">{changes.map((change,i)=><li key={i}><strong>{change.kind}</strong> {change.label}</li>)}</ul>:
      <p>No differences recorded yet between this targeted draft and its source snapshot.</p>}
     <h3>Document checks</h3>
     {qualityWarnings(targeted.draft_content).length?
      <ul>{qualityWarnings(targeted.draft_content).map((warning,i)=><li key={i}>{warning}</li>)}</ul>:
      <p>No basic structural warnings. Review the content and printed pages yourself before applying.</p>}
     <p className="subtle">The PDF print route displays the saved draft, not unsaved editor changes. Save first.</p>
    </section>}
   </div>
  </div>
 </main>;
}
