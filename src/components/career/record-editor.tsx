'use client';
import {useActionState,useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import {saveCareerRecord} from '@/app/actions/career';
import {careerKinds,kindLabels,type CareerKind,type CareerRecord} from '@/lib/career/schema';
import {detailFields} from '@/lib/career/record-fields';

export function RecordEditor({record,onSaved}:{record?:CareerRecord;onSaved?:()=>void}){
 const [state,submit,pending]=useActionState(saveCareerRecord,{});
 const [kind,setKind]=useState<CareerKind>(record?.kind??'experience');
 const [current,setCurrent]=useState(record?.is_current??false);
 const router=useRouter();
 useEffect(()=>{if(state.message){router.refresh();onSaved?.();}},[state.message,router,onSaved]);
 const textField=(name:string,label:string,maxLength:number,required=false,placeholder='')=>
  <div className="form-row">
   <label htmlFor={'career-'+name} className="label">{label}</label>
   <input className="field" id={'career-'+name} name={name} maxLength={maxLength}
    defaultValue={String(record?.[name as keyof CareerRecord]??'')} placeholder={placeholder} required={required}/>
  </div>;
 const titleLabels:Record<CareerKind,string>={
  experience:'Job title',education:'Degree / qualification',skill:'Skill name',language:'Language',
  project:'Project title',achievement:'Achievement title',certification:'Certificate / credential',
  volunteering:'Volunteer role',
 };
 const organizationLabels:Record<CareerKind,string>={
  experience:'Employer',education:'Institution',skill:'Organization (optional)',
  language:'Organization (optional)',project:'Organization / course (optional)',
  achievement:'Organization (optional)',certification:'Issuing organization',volunteering:'Volunteer organization',
 };
 return <form action={submit} className="card stack" style={{marginTop:14}}>
  <div><h2 style={{margin:0}}>{record?'Edit career record':'Add career information'}</h2>
   <p className="subtle">Enter only confirmed facts. Optional structured fields help Resume Studio later; an import or AI suggestion cannot overwrite this record.</p>
  </div>
  <input type="hidden" name="id" value={record?.id??''}/>
  <input type="hidden" name="revision" value={record?.revision??''}/>
  <div className="form-row">
   <label className="label" htmlFor="career-kind">Career category</label>
   <select className="field" id="career-kind" name="kind" value={kind}
    onChange={e=>{setKind(e.target.value as CareerKind);setCurrent(false);}}>
    {careerKinds.map(k=><option value={k} key={k}>{kindLabels[k]}</option>)}
   </select>
  </div>
  <div className="page-grid">
   {textField('title',titleLabels[kind],180,true)}
   {textField('organization',organizationLabels[kind],180)}
   {textField('location','Location (optional)',150,false,'City or remote')}
  </div>
  <fieldset style={{border:'1px solid var(--line)',borderRadius:12,padding:16,minWidth:0}}>
   <legend style={{fontWeight:700,padding:'0 8px'}}>Details for {kindLabels[kind].toLowerCase()}</legend>
   <div className="page-grid" key={kind}>
    {detailFields[kind].map(field=><div className="form-row" key={field.key}>
     <label className="label" htmlFor={'career-detail-'+field.key}>{field.label}</label>
     {field.multiline?
      <textarea className="field" id={'career-detail-'+field.key} name={'detail_'+field.key}
       rows={3} maxLength={field.maxLength} placeholder={field.placeholder}
       defaultValue={record?.kind===kind?record.details?.[field.key]??'':''}/>:
      <input className="field" id={'career-detail-'+field.key} name={'detail_'+field.key}
       maxLength={field.maxLength} placeholder={field.placeholder}
       defaultValue={record?.kind===kind?record.details?.[field.key]??'':''}/>}
    </div>)}
   </div>
  </fieldset>
  <fieldset style={{border:'1px solid var(--line)',borderRadius:12,padding:16,minWidth:0}}>
   <legend style={{fontWeight:700,padding:'0 8px'}}>Dates (optional)</legend>
   <div className="page-grid">
    <div className="form-row"><label className="label" htmlFor="career-start">Start / issue date</label>
     <input className="field" type="date" id="career-start" name="started_on" defaultValue={record?.started_on??''}/></div>
    <div className="form-row"><label className="label" htmlFor="career-end">End / expiry date</label>
     <input className="field" type="date" id="career-end" name="ended_on" disabled={current} defaultValue={record?.ended_on??''}/></div>
   </div>
   <label style={{display:'flex',alignItems:'center',gap:10,marginTop:12}}>
    <input type="checkbox" checked={current} onChange={e=>setCurrent(e.target.checked)}/>Ongoing / still current
   </label>
   <input type="hidden" name="is_current" value={String(current)}/>
  </fieldset>
  <div className="form-row"><label htmlFor="career-description" className="label">Description, responsibilities and evidence-backed outcomes</label>
   <textarea className="field" rows={5} id="career-description" name="description" maxLength={8000}
    defaultValue={record?.description??''} placeholder="What did you do, how, and what happened? Do not invent metrics."/>
  </div>
  <div style={{display:'flex',flexWrap:'wrap',gap:10}}>
   <button className="button" disabled={pending}>{pending?'Saving…':'Save confirmed record'}</button>
   {onSaved&&<button type="button" className="button secondary" onClick={onSaved}>Cancel</button>}
  </div>
  {state.error&&<p role="alert" className="error">{state.error}</p>}
  {state.message&&<p role="status" className="success">{state.message}</p>}
 </form>;
}
