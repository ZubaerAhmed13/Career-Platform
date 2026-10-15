'use client';
import type {ResumeDoc} from '@/lib/resume/schema';
import {entryDates,sectionHeading} from '@/lib/resume/exports';

export function ResumePreview({doc,fit=false}:{doc:ResumeDoc;fit?:boolean}){
 const s=doc.settings,c=doc.contact;
 const name=s.template==='ats-classic'?'Classic':s.template==='modern-professional'?'Modern':
  s.template==='student-graduate'?'Graduate':s.template==='european-clean'?'European':'Executive';
 const props={
  '--resume-accent':s.template==='ats-classic'?'#000':s.accent,
  '--resume-font':s.font, '--resume-body':s.bodySize+'pt',
  '--resume-heading':s.headingSize+'pt','--resume-line':String(s.lineSpacing),
 } as React.CSSProperties;
 const contact=(['email','phone','location','linkedin','portfolio','github','website'] as const).filter(key=>c[key]&&!c.hidden.includes(key));
 return <div className={'resume-paper resume-'+name.toLowerCase()+' '+(s.margin==='compact'?'resume-compact ':'')+
  (s.density==='compact'?'resume-tight ':'')+(fit?'resume-fit':'')}
  style={{...props,'--resume-page-width':s.paper==='A4'?'210mm':'215.9mm',
   '--resume-page-min-height':s.paper==='A4'?'297mm':'279.4mm'} as React.CSSProperties}
  aria-label="Live resume document preview" id="resume-print">
  <header className="resume-document-head">
   {c.name&&<h1>{c.name}</h1>}
   {c.headline&&!c.hidden.includes('headline')&&<p className="resume-headline">{c.headline}</p>}
   {contact.length>0&&<p className="resume-contact">{contact.map((key,i)=><span key={key}>
    {i>0?' · ':''}{['linkedin','portfolio','github','website'].includes(key)
     ?<a href={c[key]} rel="noopener noreferrer" target="_blank">{c[key]}</a>:c[key]}</span>)}</p>}
  </header>
  {doc.summaryVisible&&!!doc.summary.trim()&&<section className="resume-section">
   <h2>{s.language==='de'?'Profil':'Professional Summary'}</h2>
   <p className="resume-summary">{doc.summary}</p>
  </section>}
  {doc.sections.filter(section=>section.visible&&section.entries.some(e=>e.visible)).map(section=>
   <section className="resume-section" key={section.id}>
    <h2>{sectionHeading(section.title,s.language)}</h2>
    {section.entries.filter(e=>e.visible).map(entry=><article className="resume-entry" key={entry.id}>
     <div className="resume-entry-title">
      <h3>{entry.title}</h3><span>{entryDates(entry,doc)}</span>
     </div>
     {(entry.subtitle||entry.location)&&<p className="resume-entry-meta">{[entry.subtitle,entry.location].filter(Boolean).join(' · ')}</p>}
     {entry.bullets.some(b=>b.visible&&b.text.trim())&&<ul>
      {entry.bullets.filter(b=>b.visible&&b.text.trim()).map(b=><li key={b.id}>{b.text}</li>)}
     </ul>}
    </article>)}
   </section>)}
 </div>;
}
