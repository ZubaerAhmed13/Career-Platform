'use client';
import { useActionState, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { startCareerInterview, sendCareerInterviewAnswer } from '@/app/actions/career-interview';
import { interviewTopics, type InterviewTopic } from '@/lib/career/prompts';
import type {CareerMessage,CareerSession} from '@/lib/career/schema';

function StartInterview(){
 const [state,action,pending]=useActionState(startCareerInterview,{});
 return <form action={action} className="card stack">
   <h2>Start a real career interview</h2>
   <label className="label" htmlFor="session-title">Session topic</label>
   <input className="field" id="session-title" name="title" maxLength={160}
     placeholder="e.g. My supply chain experience" defaultValue="Career exploration"/>
   <button className="button" disabled={pending}>{pending?'Creating…':'Start session'}</button>
   {state.error&&<p role="alert" className="error">{state.error}</p>}
 </form>;
}
function InterviewChat({session,messages}:{session:CareerSession;messages:CareerMessage[]}){
 const [state,action,pending]=useActionState(sendCareerInterviewAnswer,{});
 const [topic,setTopic]=useState<InterviewTopic>('experience');
 const router=useRouter();
 useEffect(()=>{if(state.message||state.error)router.refresh();},[state.message,state.error,router]);
 return <section className="stack">
  <h2>{session.title}</h2>
  <p className="subtle">The AI may ask follow-up questions, but nothing becomes a career fact without your review.</p>
  <div className="stack">{messages.length===0?<div className="muted-card">No messages yet. Share a real career experience to begin.</div>:messages.map(m=>
   <article key={m.id} className="card" style={{marginLeft:m.role==='user'?24:0,marginRight:m.role==='assistant'?24:0}}>
     <p className="eyebrow">{m.role==='assistant'?'AI response':'Your answer'}</p>
     <p style={{whiteSpace:'pre-wrap'}}>{m.content}</p>
   </article>)}</div>
  {session.status==='active'&&<form action={action} className="card stack">
   <input type="hidden" name="session_id" value={session.id}/>
   <label className="label" htmlFor="topic">Focus for the next question</label>
   <select className="field" id="topic" name="topic" value={topic} onChange={e=>setTopic(e.target.value as InterviewTopic)}>
     {interviewTopics.map(t=><option key={t} value={t}>{t[0].toUpperCase()+t.slice(1)}</option>)}
   </select>
   <label className="label" htmlFor="answer">Your answer (2,000 characters maximum)</label>
   <textarea className="field" id="answer" name="answer" rows={5} maxLength={2000} minLength={5} required/>
   <label><input type="checkbox" name="consent" value="yes" required/> I consent to sending this answer and relevant approved career context to the configured AI service.</label>
   <button disabled={pending} className="button">{pending?'Processing…':'Send answer to AI interviewer'}</button>
   {state.error&&<p className="error" role="alert">{state.error}</p>}
   {state.message&&<p className="success" role="status">{state.message}</p>}
  </form>}
 </section>;
}
export function InterviewWorkspace({sessions,selected,messages,configured}:{
 sessions:CareerSession[];selected:CareerSession|null;messages:CareerMessage[];configured:boolean;
}){
 return <div className="stack" style={{gap:24}}>
  <header><Link href="/career-vault" className="eyebrow">← Career Vault</Link>
   <h1 className="heading">AI Career Interviewer</h1>
   <p className="subtle">Explore career stories with a real AI provider, then approve individual fact proposals. Your verified career records are never silently rewritten.</p>
  </header>
  {!configured?<div className="card stack" role="status">
    <h2>AI service not configured</h2><p className="subtle">The manual Career Vault remains available. To activate interviews, configure OPENAI_API_KEY privately on the server; no simulated messages will be shown.</p>
    <Link className="button secondary" href="/career-vault">Return to manual Career Vault</Link>
  </div>:<div className="page-grid">
   <aside className="card stack"><h2>Interview sessions</h2><StartInterview/>
    {sessions.length===0?<p className="subtle">No interviews yet.</p>:sessions.map(s=>
     <Link key={s.id} href={'/career-vault/interview?id='+s.id} style={{textDecoration:'underline'}}>{s.title} · {s.status}</Link>)}
   </aside>
   <div>{selected?<InterviewChat key={selected.id} session={selected} messages={messages}/>:<div className="muted-card">Start an interview or select an existing session to resume.</div>}</div>
  </div>}
 </div>;
}
