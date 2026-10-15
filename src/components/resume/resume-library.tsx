'use client';
import {useMemo,useState,useTransition} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {createResume,renameResume,deleteResume,duplicateResume} from '@/app/actions/resumes';
import {paperSizes,templateIds,templateNames,type ResumeRow,type ResumeDoc} from '@/lib/resume/schema';

export function ResumeLibrary({initial}:{initial:ResumeRow[]}){
 const [search,setSearch]=useState(''),[sort,setSort]=useState<'recent'|'name'|'created'>('recent');
 const [name,setName]=useState(''),[focus,setFocus]=useState('');
 const [method,setMethod]=useState<'vault'|'blank'>('vault');
 const [template,setTemplate]=useState<ResumeDoc['settings']['template']>('ats-classic');
 const [paper,setPaper]=useState<ResumeDoc['settings']['paper']>('A4');
 const [message,setMessage]=useState(''),[pending,start]=useTransition(),router=useRouter();
 const rows=useMemo(()=>initial.filter(row=>row.name.toLowerCase().includes(search.trim().toLowerCase()))
  .sort((a,b)=>sort==='name'?a.name.localeCompare(b.name):sort==='created'
   ?b.created_at.localeCompare(a.created_at):b.updated_at.localeCompare(a.updated_at)),
  [initial,search,sort]);
 function create(){
  if(!name.trim())return setMessage('Choose a name for your resume.');
  start(async()=>{
   const result=await createResume({name,focus,template,paper});
   if(!result.ok){setMessage(result.error);return;}
   // Creation starts empty; the editor offers the confirmed Vault picker for method A.
   router.push('/resume-studio/'+result.id+(method==='vault'?'?vault=1':''));
  });
 }
 function action(id:string,type:'rename'|'duplicate'|'delete'){
  if(type==='delete'&&!window.confirm('Delete this resume and ALL its saved versions? The Career Vault is unaffected.'))return;
  const newName=type==='rename'?window.prompt('Rename resume',initial.find(r=>r.id===id)?.name):null;
  if(type==='rename'&&newName===null)return;
  start(async()=>{
   const result=type==='rename'?await renameResume(id,newName??''):
    type==='duplicate'?await duplicateResume(id):await deleteResume(id);
   if(!result.ok){setMessage(result.error);return;}
   setMessage(type==='delete'?'Resume and its versions deleted.':type==='duplicate'?'Independent copy created.':'Resume renamed.');
   router.refresh();
  });
 }
 return <div className="stack" style={{gap:22}}>
  <header><p className="eyebrow">Career documents</p><h1 className="heading">Resume Studio</h1>
   <p className="subtle">Build truthful, beautifully formatted resumes from your confirmed career facts or start from scratch. No AI required.</p>
  </header>
  <section className="card stack" aria-labelledby="new-resume-title">
   <h2 id="new-resume-title" style={{margin:0}}>Create a new resume</h2>
   <div className="resume-form-grid">
    <label className="form-row"><span className="label">Resume name</span>
     <input className="field" required maxLength={160} placeholder="e.g. Finance working student" value={name} onChange={e=>setName(e.target.value)}/></label>
    <label className="form-row"><span className="label">Role or focus (optional)</span>
     <input className="field" maxLength={160} value={focus} onChange={e=>setFocus(e.target.value)} placeholder="e.g. Finance Operations"/></label>
    <label className="form-row"><span className="label">Template</span><select className="field" value={template} onChange={e=>setTemplate(e.target.value as typeof template)}>
     {templateIds.map(t=><option value={t} key={t}>{templateNames[t]}</option>)}</select></label>
    <label className="form-row"><span className="label">Paper</span><select className="field" value={paper} onChange={e=>setPaper(e.target.value as typeof paper)}>
     {paperSizes.map(p=><option key={p}>{p}</option>)}</select></label>
   </div>
   <fieldset className="resume-fieldset"><legend>Starting point</legend>
    <label><input type="radio" checked={method==='vault'} onChange={()=>setMethod('vault')}/> Choose confirmed facts from Career Vault</label>
    <label><input type="radio" checked={method==='blank'} onChange={()=>setMethod('blank')}/> Start with a blank resume</label>
   </fieldset>
   <div><button type="button" className="button" disabled={pending} onClick={create}>{pending?'Creating…':'Create resume'}</button></div>
  </section>
  <section className="stack">
   <div className="resume-library-toolbar"><h2 style={{margin:0}}>Your resume library <span className="subtle">({initial.length})</span></h2>
    <label><span className="label">Search</span><input className="field" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Find a resume"/></label>
    <label><span className="label">Sort by</span><select className="field" value={sort} onChange={e=>setSort(e.target.value as typeof sort)}>
     <option value="recent">Recently edited</option><option value="name">Name</option><option value="created">Created date</option></select></label>
   </div>
   {!initial.length?<div className="muted-card">Your library is empty. Create your first resume above; nothing will be published or shared.</div>:
    !rows.length?<div className="muted-card">No resumes match your search.</div>:
    <div className="resume-library-grid">{rows.map(r=><article className="card stack resume-library-card" key={r.id}>
     <div className="resume-template-thumb" aria-hidden="true"><span/><strong/><i/><i/><strong/><i/><i/><i/></div>
     <div><h3 style={{margin:'0 0 6px'}}>{r.name}</h3>
      <p className="subtle" style={{margin:0}}>{templateNames[r.template_id]} · {r.paper_size}</p>
      {r.focus_label&&<p className="subtle">{r.focus_label}</p>}
      <p className="subtle" style={{fontSize:13}}>Draft · Edited {new Date(r.updated_at).toLocaleDateString()}</p>
     </div>
     <div className="resume-card-actions">
      <Link className="button" href={'/resume-studio/'+r.id}>Edit</Link>
      <button className="button secondary" disabled={pending} onClick={()=>action(r.id,'duplicate')}>Duplicate</button>
      <button className="button secondary" disabled={pending} onClick={()=>action(r.id,'rename')}>Rename</button>
      <Link className="button secondary" href={'/resume-studio/'+r.id+'/print'} target="_blank">Print / PDF</Link>
      <button className="button secondary" disabled={pending} onClick={()=>action(r.id,'delete')}>Delete</button>
     </div>
    </article>)}</div>}
  </section>
  {message&&<p role="status" className={message.includes('Could not')?'error':'subtle'}>{message}</p>}
  <p className="subtle">Deleting a resume never deletes Career Vault records. Saved resumes contain independent copies of facts; clearing Career Vault does not clear these documents.</p>
 </div>;
}
