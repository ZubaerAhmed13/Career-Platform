'use client';
import {useState,useTransition} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {createTailoringSession,deleteTailoringSession} from '@/app/actions/resume-tailoring';
import type {TailoringRow} from '@/lib/tailoring/schema';

export function TailoringLibrary({sessions}:{sessions:TailoringRow[]}){
 const router=useRouter();
 const [title,setTitle]=useState(''),[employer,setEmployer]=useState('');
 const [location,setLocation]=useState(''),[url,setUrl]=useState('');
 const [description,setDescription]=useState(''),[notes,setNotes]=useState('');
 const [type,setType]=useState(''),[message,setMessage]=useState('');
 const [weeklyHours,setWeeklyHours]=useState(''),[workArrangement,setWorkArrangement]=useState('');
 const [postingDate,setPostingDate]=useState(''),[applicationDeadline,setApplicationDeadline]=useState('');
 const [pending,start]=useTransition();
 function create(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();
  start(async()=>{
   const result=await createTailoringSession({
    jobTitle:title,employerName:employer,location,employmentType:type,
    jobUrl:url,originalDescription:description,notes,
    weeklyHours,workArrangement,postingDate,applicationDeadline
   });
   if(!result.ok){setMessage(result.error);return;}
   router.push('/resume-studio/tailor/'+result.id);
  });
 }
 function remove(id:string){
  if(!window.confirm('Delete only this job brief and its analysis? The source resume, tailored resume and all saved resume versions will remain.'))return;
  start(async()=>{
   const result=await deleteTailoringSession(id);
   if(!result.ok){setMessage(result.error);return;}
   setMessage('Job brief removed. All CVs were preserved.');
   router.refresh();
  });
 }
 return <main className="stack" style={{gap:22}}>
  <header><Link className="subtle" href="/resume-studio">← Resume Studio</Link>
   <p className="eyebrow">Evidence-first job targeting</p>
   <h1 className="heading">Advanced resume tailoring</h1>
   <p className="subtle">Understand a genuine job advert, review its requirements, match confirmed Career Vault facts, and create an independent CV. Rule-based assistance only; no AI model or recruiter prediction.</p>
  </header>
  <form className="card stack" onSubmit={create} aria-labelledby="job-title-heading">
   <h2 id="job-title-heading" style={{margin:0}}>Start with a real job posting</h2>
   <div className="resume-form-grid">
    <label className="form-row"><span className="label">Job title *</span>
     <input className="field" required maxLength={180} value={title} onChange={e=>setTitle(e.target.value)}/></label>
    <label className="form-row"><span className="label">Employer</span>
     <input className="field" maxLength={180} value={employer} onChange={e=>setEmployer(e.target.value)}/></label>
    <label className="form-row"><span className="label">Location</span>
     <input className="field" maxLength={180} value={location} onChange={e=>setLocation(e.target.value)}/></label>
    <label className="form-row"><span className="label">Employment type / hours if supplied</span>
     <input className="field" maxLength={100} value={type} onChange={e=>setType(e.target.value)}/></label>

    <label className="form-row"><span className="label">Weekly hours (only if stated)</span>
     <input className="field" maxLength={80} value={weeklyHours} onChange={e=>setWeeklyHours(e.target.value)} placeholder="e.g. 20 hours/week"/></label>
    <label className="form-row"><span className="label">Work arrangement (if stated)</span>
     <input className="field" maxLength={80} value={workArrangement} onChange={e=>setWorkArrangement(e.target.value)} placeholder="Onsite, hybrid or remote"/></label>
    <label className="form-row"><span className="label">Posting date (optional)</span>
     <input className="field" type="date" value={postingDate} onChange={e=>setPostingDate(e.target.value)}/></label>
    <label className="form-row"><span className="label">Application deadline (optional)</span>
     <input className="field" type="date" value={applicationDeadline} onChange={e=>setApplicationDeadline(e.target.value)}/></label>
    <label className="form-row"><span className="label">Original posting URL (reference only)</span>
     <input type="url" className="field" maxLength={1500} value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://..."/></label>
   </div>
   <label className="form-row"><span className="label">Paste the complete job description *</span>
    <textarea className="field" required rows={10} minLength={40} maxLength={50000}
     value={description} onChange={e=>setDescription(e.target.value)}
     placeholder="Paste the employer's original responsibilities and qualifications here. No web pages will be fetched."/></label>
   <small className="subtle">{description.length}/50,000 characters · Original line breaks are preserved.</small>
   <label className="form-row"><span className="label">Private notes (optional)</span>
    <textarea className="field" rows={2} maxLength={4000} value={notes} onChange={e=>setNotes(e.target.value)}/></label>
   <div><button type="submit" className="button" disabled={pending}>{pending?'Saving…':'Save job and review requirements'}</button></div>
  </form>
  <section className="stack"><h2 style={{margin:0}}>Saved job briefs ({sessions.length})</h2>
   {!sessions.length?<div className="muted-card">No saved job briefs yet. A job-specific CV is created only when you choose to make one.</div>:
   <div className="resume-library-grid">{sessions.map(s=><article key={s.id} className="card stack">
    <h3 style={{margin:0}}>{s.job_title}</h3>
    <p className="subtle" style={{margin:0}}>{s.employer_name||'Employer not provided'} {s.job_location?'· '+s.job_location:''}</p>
    <p className="subtle">Reviewed requirements: {s.requirements.filter(r=>r.review==='approved').length} · {s.tailored_resume_id?'Tailored CV linked':'No targeted CV yet'}</p>
    <div className="resume-card-actions">
     <Link className="button" href={'/resume-studio/tailor/'+s.id}>Continue tailoring</Link>
     {s.tailored_resume_id&&<Link className="button secondary" href={'/resume-studio/'+s.tailored_resume_id}>Edit targeted CV</Link>}
     <button className="button secondary" type="button" disabled={pending} onClick={()=>remove(s.id)}>Delete job brief</button>
    </div>
   </article>)}</div>}
  </section>
  {message&&<p role="alert">{message}</p>}
 </main>;
}
