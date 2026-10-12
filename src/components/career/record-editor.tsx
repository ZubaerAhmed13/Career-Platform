'use client';
import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveCareerRecord } from '@/app/actions/career';
import { careerKinds, kindLabels, type CareerKind, type CareerRecord } from '@/lib/career/schema';

export function RecordEditor({ record, onSaved }: { record?: CareerRecord; onSaved?: () => void }) {
 const [state, submit, pending]=useActionState(saveCareerRecord,{});
 const [kind,setKind]=useState<CareerKind>(record?.kind??'experience');
 const [current,setCurrent]=useState(record?.is_current??false);
 const router=useRouter();
 useEffect(()=>{if(state.message){router.refresh();onSaved?.();}},[state.message,router,onSaved]);
 const textField=(name:string,label:string,maxLength:number,required=false)=><div className="form-row">
   <label htmlFor={'career-'+name} className="label">{label}</label>
   <input className="field" id={'career-'+name} name={name} maxLength={maxLength}
    defaultValue={String(record?.[name as keyof CareerRecord]??'')} required={required}/>
 </div>;
 return <form action={submit} className="card stack" style={{marginTop:14}}>
  <h2 style={{margin:0}}>{record?'Edit career record':'Add career information'}</h2>
  <p className="subtle">Your information is saved only when you choose Save. AI and imports cannot overwrite these confirmed details.</p>
  <input type="hidden" name="id" value={record?.id??''}/>
  <input type="hidden" name="revision" value={record?.revision??''}/>
  <div className="page-grid">
   <div className="form-row"><label className="label" htmlFor="career-kind">Category</label>
   <select className="field" id="career-kind" name="kind" value={kind} onChange={e=>setKind(e.target.value as CareerKind)}>
    {careerKinds.map(k=><option value={k} key={k}>{kindLabels[k]}</option>)}
   </select></div>
   {textField('title',kind==='experience'?'Job title':kind==='education'?'Qualification or degree':'Title / name',180,true)}
   {textField('organization',kind==='education'?'Institution':kind==='experience'||kind==='volunteering'?'Organization / employer':'Organization (optional)',180)}
   {textField('location','City / location (optional)',150)}
   {['language','skill'].includes(kind)&&<div className="form-row">
    <label className="label" htmlFor="career-proficiency">Proficiency / level (optional)</label>
    <input className="field" id="career-proficiency" name="proficiency" maxLength={100}
      defaultValue={record?.details?.proficiency??''} placeholder="e.g. B1 or Advanced"/>
   </div>}
   <div className="form-row"><label className="label" htmlFor="career-start">Start date (optional)</label>
    <input className="field" type="date" id="career-start" name="started_on" defaultValue={record?.started_on??''}/></div>
   <div className="form-row"><label className="label" htmlFor="career-end">End date (optional)</label>
    <input className="field" type="date" id="career-end" name="ended_on" disabled={current} defaultValue={record?.ended_on??''}/></div>
  </div>
  <label style={{display:'flex',alignItems:'center',gap:10}}><input type="checkbox" checked={current} onChange={e=>setCurrent(e.target.checked)}/>Still ongoing</label>
  <input type="hidden" name="is_current" value={String(current)}/>
  <div className="form-row"><label htmlFor="career-description" className="label">Responsibilities, outcomes, or description</label>
   <textarea className="field" rows={5} id="career-description" name="description" maxLength={8000}
    defaultValue={record?.description??''} placeholder="Write only facts you can stand behind. Metrics are optional."/>
  </div>
  <div style={{display:'flex',flexWrap:'wrap',gap:10}}>
   <button className="button" disabled={pending}>{pending?'Saving…':'Save confirmed record'}</button>
   {onSaved&&<button type="button" className="button secondary" onClick={onSaved}>Cancel</button>}
  </div>
  {state.error&&<p role="alert" className="error">{state.error}</p>}
  {state.message&&<p role="status" className="success">{state.message}</p>}
 </form>;
}
