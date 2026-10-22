'use client';
import Link from 'next/link';
import {useEffect,useMemo,useRef,useState,useTransition} from 'react';
import {useRouter} from 'next/navigation';
import {createTargetedResume,saveTailoringSession,includeVerifiedCareerRecord,getAvailableResumeVersions} from '@/app/actions/resume-tailoring';
import {briefFromRow,requirementCategories,requirementPriorities,type JobBrief,type JobRequirement,type TailoringRow} from '@/lib/tailoring/schema';
import {newManualRequirement,extractRequirements,splitRequirement,mergeRequirements,reviseRequirement} from '@/lib/tailoring/requirements';
import {compareResume,coverage,findEvidence} from '@/lib/tailoring/matching';
import {qualityWarnings,type ResumeRow} from '@/lib/resume/schema';
import {resumePlainText} from '@/lib/resume/exports';
import {contentSuggestions,sourceChangeWarnings,wordingPrompts} from '@/lib/tailoring/recommendations';
import {inspectKeywordCoverage} from '@/lib/tailoring/keywords';
import type {CareerRecord} from '@/lib/career/schema';

export function TailoringWorkspace({session,resumes,vault}:{
 session:TailoringRow;resumes:ResumeRow[];vault:CareerRecord[]
}){
 const router=useRouter();
 const [brief,setBrief]=useState<JobBrief>(()=>briefFromRow(session));
 const [message,setMessage]=useState(''),[status,setStatus]=useState('Saved');
 const [sourceId,setSourceId]=useState<string>(session.source_resume_id??'');
 const [sourceVersion,setSourceVersion]=useState('');
 const [versions,setVersions]=useState<{id:string;version_number:number;label:string}[]>([]);
 const [pending,start]=useTransition();
 const [newRequirement,setNewRequirement]=useState('');
 const [splitId,setSplitId]=useState<string|null>(null);
 const [splitFirst,setSplitFirst]=useState(''),[splitSecond,setSplitSecond]=useState('');
 const [mergeSelections,setMergeSelections]=useState<Record<string,string>>({});
 const [filter,setFilter]=useState<'all'|'approved'|'needs'>('all');
 const revision=useRef(session.revision),saving=useRef(false),blocked=useRef(false);
 const saved=useRef(JSON.stringify(brief)),current=useRef(brief);
 const [tick,setTick]=useState(0);
 useEffect(()=>{
  let active=true;
  if(!sourceId){setVersions([]);return;}
  void getAvailableResumeVersions(sourceId).then(items=>{if(active)setVersions(items);});
  return ()=>{active=false;};
 },[sourceId]);
 current.current=brief;
 const dirty=JSON.stringify(brief)!==saved.current;
 const matches=useMemo(()=>brief.requirements.map(r=>findEvidence(r,vault)),[brief.requirements,vault]);
 const summary=coverage(matches);
 const targeted=resumes.find(r=>r.id===session.tailored_resume_id);
 const changes=session.source_snapshot&&targeted?compareResume(session.source_snapshot,targeted.draft_content):[];
 const recommendations=contentSuggestions(matches,vault,targeted?.draft_content);
 const keywordFindings=inspectKeywordCoverage(brief.requirements,targeted?.draft_content??null,vault);
 const writing=targeted?wordingPrompts(targeted.draft_content):[];
 const sourceWarnings=targeted?sourceChangeWarnings(targeted.draft_content,vault):[];
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
  change(b=>{b.requirements=b.requirements.map(r=>r.id===id?reviseRequirement(r,changeSet):r);});
 }
 function add(){
  const value=newRequirement.trim();
  if(value.length<2||value.length>1200){setMessage('Enter a requirement between 2 and 1,200 characters.');return;}
  change(b=>{if(b.requirements.length>=100)return;b.requirements.push(newManualRequirement(value));});
  setNewRequirement('');
 }
 function prepareSplit(item:JobRequirement){
  setSplitId(item.id);setSplitFirst(item.text);setSplitSecond('');
 }
 function applySplit(id:string){
  const item=brief.requirements.find(r=>r.id===id);
  if(!item)return;
  try{
   const children=splitRequirement(item,splitFirst,splitSecond);
   change(b=>{
    const index=b.requirements.findIndex(r=>r.id===id);
    if(index>=0&&b.requirements.length<100)b.requirements.splice(index,1,...children);
   });
   setSplitId(null);setSplitFirst('');setSplitSecond('');
   setMessage('Requirement split into two candidate criteria. Review and approve each separately.');
  }catch(error){setMessage(error instanceof Error?error.message:'Unable to split this criterion.');}
 }
 function applyMerge(id:string){
  const otherId=mergeSelections[id];
  const first=brief.requirements.find(r=>r.id===id);
  const second=brief.requirements.find(r=>r.id===otherId);
  if(!first||!second){setMessage('Choose another criterion to merge.');return;}
  try{
   const merged=mergeRequirements(first,second);
   change(b=>{
    const index=b.requirements.findIndex(r=>r.id===id);
    b.requirements=b.requirements.filter(r=>r.id!==id&&r.id!==otherId);
    b.requirements.splice(Math.min(index,b.requirements.length),0,merged);
   });
   setMergeSelections({});
   setMessage('Criteria merged into a new candidate. Check whether this is an AND/OR condition before approval.');
  }catch(error){setMessage(error instanceof Error?error.message:'Unable to merge criteria.');}
 }
 function reanalyse(){
  if(!window.confirm('Replace all current requirement annotations with fresh candidate extractions? Previously approved or manually added requirements will be lost.'))return;
  change(b=>{b.requirements=extractRequirements(b.originalDescription);});
 }
 function addSelectedFact(recordId:string){
  if(!targeted)return;
  start(async()=>{
   const result=await includeVerifiedCareerRecord(session.id,recordId,targeted.revision);
   if(!result.ok){setMessage(result.error);return;}
   setMessage('Confirmed career fact added to the targeted CV. The source resume and Career Vault are unchanged.');
   router.refresh();
  });
 }
 function createCopy(){
  start(async()=>{
   if(saving.current){setMessage('Finish saving the current edits before copying a resume.');return;}
   if(dirty&&!await save(current.current))return;
   if(JSON.stringify(current.current)!==saved.current){setMessage('More edits are still unsaved. Try again.');return;}
   const result=await createTargetedResume(session.id,revision.current,sourceId||null,sourceVersion||null);
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
      <label className="form-row"><span className="label">Weekly hours if stated</span>
       <input className="field" maxLength={80} value={brief.weeklyHours} onChange={e=>change(b=>{b.weeklyHours=e.target.value;})}/></label>
      <label className="form-row"><span className="label">Work arrangement</span>
       <input className="field" maxLength={80} value={brief.workArrangement} onChange={e=>change(b=>{b.workArrangement=e.target.value;})}/></label>
      <label className="form-row"><span className="label">Posting date (optional)</span>
       <input className="field" type="date" value={brief.postingDate} onChange={e=>change(b=>{b.postingDate=e.target.value;})}/></label>
      <label className="form-row"><span className="label">Application deadline (optional)</span>
       <input className="field" type="date" value={brief.applicationDeadline} onChange={e=>change(b=>{b.applicationDeadline=e.target.value;})}/></label>
     </div>
     <label className="form-row"><span className="label">Posting URL (reference only)</span>
      <input className="field" type="url" maxLength={1500} value={brief.jobUrl}
       onChange={e=>change(b=>{b.jobUrl=e.target.value;})}/></label>
     <label className="form-row"><span className="label">Original description</span>
      <textarea className="field" rows={6} maxLength={50000} value={brief.originalDescription}
       onChange={e=>change(b=>{b.originalDescription=e.target.value;})}/></label>
     <details><summary>Show the first saved original posting (immutable source copy)</summary>
      <pre className="tailoring-original-text">{session.initial_job_description}</pre>
     </details>
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
      {splitId===r.id&&<fieldset className="resume-fieldset stack">
       <legend>Split into two separately reviewed criteria</legend>
       <label className="form-row"><span className="label">First criterion</span>
        <textarea className="field" value={splitFirst} maxLength={1200} rows={2}
         onChange={e=>setSplitFirst(e.target.value)}/></label>
       <label className="form-row"><span className="label">Second criterion</span>
        <textarea className="field" value={splitSecond} maxLength={1200} rows={2}
         onChange={e=>setSplitSecond(e.target.value)}/></label>
       <div className="resume-card-actions">
        <button className="button secondary" type="button" onClick={()=>applySplit(r.id)}>Split and review</button>
        <button className="button secondary" type="button" onClick={()=>setSplitId(null)}>Cancel</button>
       </div>
      </fieldset>}
      {brief.requirements.length>1&&<div className="resume-form-grid">
       <label className="form-row"><span className="label">Merge with another criterion</span>
        <select className="field" value={mergeSelections[r.id]??''}
         onChange={e=>setMergeSelections(current=>({...current,[r.id]:e.target.value}))}>
         <option value="">Choose a duplicate or related line</option>
         {brief.requirements.filter(other=>other.id!==r.id).map(other=><option key={other.id} value={other.id}>{other.text.slice(0,75)}</option>)}
        </select></label>
       <button className="button secondary" type="button" disabled={!mergeSelections[r.id]}
        onClick={()=>applyMerge(r.id)}>Merge and review</button>
      </div>}
      <div className="resume-card-actions">
       <button className="button secondary" type="button" disabled={splitId===r.id||brief.requirements.length>=100}
        onClick={()=>prepareSplit(r)}>Split criterion</button>
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
     <h2 style={{margin:0}}>Transparent keyword inspection</h2>
     <p className="subtle">Only exact employer terminology from approved requirements appears here. Wording already in a resume is not independently verified just because it is present. No keyword density targets or ATS score.</p>
     {!keywordFindings.length?<p className="subtle">No supported technical terms detected yet. Review your requirements or continue editing manually.</p>:
      <ul className="tailoring-keyword-list">{keywordFindings.map(term=><li key={term.term}>
       <strong>{term.term}</strong><span>{term.status==='present'?'Present in targeted resume (not proof of proficiency)':
        term.status==='confirmed-missing'?'Confirmed in Career Vault but absent from targeted resume':
        term.status==='related'?'Related evidence — needs review':'No verified support found'}</span>
      </li>)}</ul>}
    </section>
    <section className="card stack">
     <h2 style={{margin:0}}>Suggested career facts</h2>
     <p className="subtle">Each suggestion references a confirmed source record and a reviewed requirement. An inclusion only happens after you choose it.</p>
     {!recommendations.length?<p className="subtle">No unrepresented confirmed facts were detected for the approved criteria. You can still add facts manually in Resume Studio.</p>:
      recommendations.map(item=><article key={item.recordId} className="tailoring-evidence-row stack">
       <div className="resume-inline-header"><strong>{item.record.title}</strong>
        <span className="subtle">{item.classification==='include'?'Include — direct evidence':'Consider — related evidence'}</span></div>
       <p className="subtle">{item.reason}</p>
       <p className="subtle">Supports: {item.requirements.slice(0,2).join(' · ')}</p>
       <p>{item.record.description.slice(0,320)}</p>
       {targeted&&<div><button className="button secondary" disabled={pending} onClick={()=>addSelectedFact(item.recordId)}>
        Add this confirmed fact to targeted CV
       </button></div>}
      </article>)}
    </section>
    <section className="card stack">
     <h2 style={{margin:0}}>4. Make your targeted resume</h2>
     {session.tailored_resume_id?<>
      <p>An independent tailored CV is linked. Editing it never rewrites the source resume or confirmed Career Vault facts.</p>
      <Link className="button" href={'/resume-studio/'+session.tailored_resume_id+'?vault=1'}>Open targeted editor + confirmed facts</Link>
      <Link className="button secondary" href={'/resume-studio/'+session.tailored_resume_id+'/print'} target="_blank">Print saved targeted CV / PDF</Link>
     </>:<>
      <label className="form-row"><span className="label">Choose the original resume</span>
       <select className="field" value={sourceId} onChange={e=>{setSourceId(e.target.value);setSourceVersion('');}}>
        <option value="">Start blank (same Step 3 editor)</option>
        {sourceOptions.map(r=><option value={r.id} key={r.id}>{r.name}</option>)}
       </select></label>
      {sourceId&&<label className="form-row"><span className="label">Saved version (optional)</span>
       <select className="field" value={sourceVersion} onChange={e=>setSourceVersion(e.target.value)}>
        <option value="">Latest saved draft</option>
        {versions.map(v=><option value={v.id} key={v.id}>Version #{v.version_number}{v.label?' — '+v.label:''}</option>)}
       </select></label>}
      <p className="subtle">The source&apos;s exact saved draft, design, portrait choice and confirmed source snapshots are copied. After copying, select or reorder Career Vault facts inside the usual editor.</p>
      <button className="button" type="button" disabled={pending||blocked.current||saving.current} onClick={createCopy}>{pending?'Creating copy…':'Create independent targeted CV'}</button>
     </>}
    </section>
    {targeted&&<section className="card stack">
     <h2 style={{margin:0}}>5. Compare and export</h2>
     <p className="subtle">Comparison is against the source snapshot captured when the copy was created; it never changes retroactively. Refresh after edits made in another tab.</p>
     <div className="resume-card-actions"><button type="button" className="button secondary" onClick={()=>router.refresh()}>Refresh comparison</button>
      <Link className="button secondary" href={'/resume-studio/'+targeted.id}>Edit / version / DOCX / text</Link></div>
     {session.source_snapshot&&<details>
      <summary>Show full before-and-after document text</summary>
      <div className="tailoring-compare">
       <section><h3>Source snapshot (unchanged)</h3>
        <pre>{resumePlainText(session.source_snapshot)}</pre></section>
       <section><h3>Current targeted resume</h3>
        <pre>{resumePlainText(targeted.draft_content)}</pre></section>
      </div>
     </details>}
     {changes.length?<ul className="tailoring-diff">{changes.map((change,i)=><li key={i}><strong>{change.kind}</strong> {change.label}</li>)}</ul>:
      <p>No differences recorded yet between this targeted draft and its source snapshot.</p>}
     {sourceWarnings.length>0&&<><h3>Source change awareness</h3>
      <ul>{sourceWarnings.map((warning,i)=><li key={i}>{warning}</li>)}</ul></>}
     {writing.length>0&&<><h3>Wording guidance (not automatic rewriting)</h3>
      <ul>{writing.map((prompt,i)=><li key={i}><strong>{prompt.entry}:</strong> {prompt.message}
       <p className="subtle">{prompt.bullet}</p></li>)}</ul></>}
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
