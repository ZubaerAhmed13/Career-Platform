'use client';
import { useActionState, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { deleteCareerRecord } from '@/app/actions/career';
import { careerKinds, kindLabels, vaultCounts, type CareerRecord, type CareerKind } from '@/lib/career/schema';
import { RecordEditor } from './record-editor';
import {detailFields} from '@/lib/career/record-fields';

function DeleteButton({record}:{record:CareerRecord}){
 const [state,action,pending]=useActionState(deleteCareerRecord,{});
 const [confirm,setConfirm]=useState(false);
 const router=useRouter();
 useEffect(()=>{if(state.message)router.refresh();},[state.message,router]);
 return <div>
  {!confirm?<button className="button secondary" type="button" onClick={()=>setConfirm(true)}>Delete</button>:
  <form action={action} className="stack" style={{gap:8}}>
   <input type="hidden" name="id" value={record.id}/>
   <p className="subtle">Delete “{record.title}”? Associated links will be removed; independent records remain.</p>
   <label><input name="confirm" type="checkbox" value="yes" required/> I understand this cannot be undone</label>
   <div style={{display:'flex',gap:8}}><button className="button" disabled={pending}>Confirm delete</button>
    <button className="button secondary" type="button" onClick={()=>setConfirm(false)}>Cancel</button></div>
  </form>}
  {state.error&&<p role="alert" className="error">{state.error}</p>}
  {state.message&&<p role="status" className="success">{state.message}</p>}
 </div>;
}
export function VaultWorkspace({records,linkedCount,pendingSuggestionCount,targetRole}:{records:CareerRecord[];linkedCount:number;pendingSuggestionCount:number;targetRole?:string}){
 const [adding,setAdding]=useState(false);
 const [editing,setEditing]=useState<string|null>(null);
 const [kind,setKind]=useState<string>('all');
 const [status,setStatus]=useState('all');
 const [organization,setOrganization]=useState('all');
 const [search,setSearch]=useState('');
 const [fromDate,setFromDate]=useState('');
 const [toDate,setToDate]=useState('');
 const summary=vaultCounts(records);
 const confirmed=records.filter(r=>r.status==='confirmed');
 const organizations=[...new Set(records.map(r=>r.organization.trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
 const highlight=(kind:CareerKind,max=3)=>confirmed.filter(r=>r.kind===kind).slice(0,max);
 const overview=[
  {kind:'experience' as CareerKind,title:'Work experience',empty:'Add a real job or internship, including what you personally did.'},
  {kind:'education' as CareerKind,title:'Education',empty:'Add a degree or relevant academic qualification when useful.'},
  {kind:'skill' as CareerKind,title:'Skills',empty:'List skills you genuinely used and can explain.'},
  {kind:'project' as CareerKind,title:'Projects',empty:'Connect an academic or professional project to relevant evidence.'},
  {kind:'achievement' as CareerKind,title:'Achievements',empty:'Document meaningful results without inventing metrics.'},
  {kind:'language' as CareerKind,title:'Languages',empty:'Add languages and truthful proficiency levels.'},
  {kind:'certification' as CareerKind,title:'Certifications',empty:'Add relevant certifications and the issuing organization.'},
  {kind:'volunteering' as CareerKind,title:'Volunteering',empty:'Record real volunteer responsibilities and contributions.'},
 ];
 const filtered=useMemo(()=>records.filter(r=>
    (kind==='all'||r.kind===kind)&&(status==='all'||r.status===status)&&
    (organization==='all'||r.organization===organization)&&
    (!fromDate||!r.ended_on||r.ended_on>=fromDate)&&(!toDate||!r.started_on||r.started_on<=toDate)&&
    [r.title,r.organization,r.location,r.description,...Object.values(r.details??{})].join(' ').toLocaleLowerCase().includes(search.toLocaleLowerCase())
 ),[records,kind,status,organization,search,fromDate,toDate]);
 return <div className="stack" style={{gap:24}}>
  <header><p className="eyebrow">Verified information, in your control</p>
    <h1 className="heading">Career Intelligence Vault</h1>
    <p className="subtle">Your permanent source of career facts. Tailored resumes will use these records without changing the originals.</p>
    <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
      <button className="button" onClick={()=>{setAdding(v=>!v);setEditing(null)}}>{adding?'Close editor':'+ Add career record'}</button>
      <Link className="button secondary" href="/career-vault/evidence">Evidence & relationships</Link>
      <Link className="button secondary" href="/career-vault/review">Review suggestions</Link>
      <Link className="button secondary" href="/career-vault/interview">Career interviewer</Link>
      <Link className="button secondary" href="/api/career-vault/export">Export my data</Link>
      <Link className="button secondary" href="/career-vault/privacy">Privacy & data controls</Link>
    </div>
  </header>
  <div className="page-grid">
   <div className="card"><p className="eyebrow">Saved records</p><strong style={{fontSize:32}}>{summary.total}</strong><p className="subtle">Not an artificial profile score</p></div>
   <div className="card"><p className="eyebrow">Needs confirmation</p><strong style={{fontSize:32}}>{summary.pending+pendingSuggestionCount}</strong><p className="subtle">Pending suggestions and unreviewed or conflicting records</p></div>
   <div className="card"><p className="eyebrow">Connections</p><strong style={{fontSize:32}}>{linkedCount}</strong><p className="subtle">Saved relationships and evidence links</p></div>
  </div>

  <section className="stack" aria-labelledby="career-overview-heading">
   <div>
    <h2 id="career-overview-heading" style={{marginBottom:4}}>Your career at a glance</h2>
    <p className="subtle">Only information you have saved and confirmed appears here. No career claims are invented.</p>
    {targetRole&&<p><strong>Target role:</strong> {targetRole}</p>}
   </div>
   <div className="page-grid">
    {overview.map(section=><section key={section.kind} className="card stack" style={{gap:10}}>
     <h3 style={{margin:0}}>{section.title} ({summary.counts[section.kind]})</h3>
     {highlight(section.kind).length===0?<p className="subtle">{section.empty}</p>:
       highlight(section.kind).map(record=><div key={record.id}>
        <strong>{record.title}</strong>
        {record.organization&&<p className="subtle" style={{margin:'3px 0'}}>{record.organization}</p>}
       </div>)}
     {summary.counts[section.kind]>3&&<p className="subtle">More entries are listed below.</p>}
    </section>)}
   </div>
  </section>
  {adding&&<RecordEditor onSaved={()=>setAdding(false)}/>}
  <section className="card stack"><h2 style={{margin:0}}>Explore your career information</h2>
   <div className="page-grid">
    <div className="form-row"><label className="label" htmlFor="vault-search">Search your records</label>
     <input className="field" id="vault-search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Title, employer, description…"/></div>
    <div className="form-row"><label className="label" htmlFor="vault-kind">Category</label>
     <select className="field" id="vault-kind" value={kind} onChange={e=>setKind(e.target.value)}><option value="all">All categories</option>
      {careerKinds.map(k=><option key={k} value={k}>{kindLabels[k]} ({summary.counts[k]})</option>)}</select></div>
    <div className="form-row"><label className="label" htmlFor="vault-organization">Employer or institution</label>
     <select className="field" id="vault-organization" value={organization} onChange={e=>setOrganization(e.target.value)}>
      <option value="all">All organizations</option>
      {organizations.map(name=><option key={name} value={name}>{name}</option>)}
     </select></div>
    <div className="form-row"><label className="label" htmlFor="vault-status">Review status</label>
     <select className="field" id="vault-status" value={status} onChange={e=>setStatus(e.target.value)}>
      <option value="all">All statuses</option><option value="confirmed">Confirmed</option><option value="unreviewed">Unreviewed</option><option value="conflict">Conflict</option>
     </select></div>
   </div>
   <div className="page-grid">
    <div className="form-row"><label className="label" htmlFor="vault-from">Record date range — from</label>
     <input className="field" id="vault-from" type="date" value={fromDate} onChange={e=>setFromDate(e.target.value)}/></div>
    <div className="form-row"><label className="label" htmlFor="vault-to">Record date range — to</label>
     <input className="field" id="vault-to" type="date" value={toDate} onChange={e=>setToDate(e.target.value)}/></div>
   </div>
   {records.length===0?<div className="muted-card">Your vault is empty. Add a real experience, education record, skill, project or achievement to get started. You can return and edit it at any time.</div>:
    filtered.length===0?<p className="subtle">No records match these filters.</p>:
    <div className="stack">{filtered.map(r=><article className="card stack" key={r.id} style={{padding:18}}>
     <div style={{display:'flex',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}>
      <div><p className="eyebrow" style={{marginBottom:4}}>{kindLabels[r.kind as CareerKind]} · {r.status}</p>
       <h3 style={{margin:'4px 0'}}>{r.title}</h3><p className="subtle" style={{margin:0}}>{[r.organization,r.location].filter(Boolean).join(' · ')||'No organization set'}</p></div>
      <button className="button secondary" onClick={()=>{setEditing(editing===r.id?null:r.id);setAdding(false)}}>{editing===r.id?'Close editor':'Edit'}</button>
     </div>
     {(r.started_on||r.ended_on||r.is_current)&&<p className="subtle" style={{margin:0}}>{r.started_on??'Start not specified'} — {r.is_current?'Present':r.ended_on??'End not specified'}</p>}
     {detailFields[r.kind as CareerKind].filter(field=>r.details?.[field.key]).length>0&&
      <dl className="page-grid" style={{margin:0}}>
       {detailFields[r.kind as CareerKind].filter(field=>r.details?.[field.key]).map(field=>
        <div key={field.key}><dt className="subtle" style={{fontSize:13}}>{field.label}</dt>
         <dd style={{margin:0,whiteSpace:'pre-wrap'}}>{r.details[field.key]}</dd></div>)}
      </dl>}
     {r.description&&<p style={{whiteSpace:'pre-wrap',margin:0}}>{r.description}</p>}
     {editing===r.id?<RecordEditor key={r.id+'-'+r.revision} record={r} onSaved={()=>setEditing(null)}/>:<DeleteButton record={r}/>}
    </article>)}</div>}
   {records.length>=250&&<p className="subtle">Showing the most recently updated 250 records. Export includes additional records.</p>}
  </section>
 </div>;
}
