import {notFound} from 'next/navigation';
import {emptyResume} from '@/lib/resume/schema';
import {reviewResumeBeforeExport} from '@/lib/resume/export-review';
import {ResumePrintButton} from '@/components/resume/print-button';
import {ResumePreview} from '@/components/resume/resume-preview';

/** Development-only synthetic print preflight; no Auth, Vault or remote data. */
export default async function SyntheticPrintFixture({searchParams}:{
 searchParams:Promise<{warning?:string;invalid?:string}>
}){
 if(process.env.NODE_ENV!=='development')notFound();
 const {warning,invalid}=await searchParams;
 const doc=emptyResume();
 doc.contact.name='Fictional Print Candidate';
 doc.contact.email=invalid==='1'?'invalid-email':'print@example.invalid';
 doc.sections[0].entries.push({
  id:crypto.randomUUID(),title:'Sample Operations Analyst',
  subtitle:'Fictional Employer',location:'Test City',
  startedOn:'2025-01-01',endedOn:'',current:true,
  visible:true,extras:{},source:null,bullets:[
   {id:crypto.randomUUID(),visible:true,
    text:warning==='1'?'Increased sales by 35%.':'Prepared sample inventory reports.'}
  ]
 });
 const review=reviewResumeBeforeExport(doc);
 return <main className="container stack">
  <h1>Synthetic PDF preflight fixture</h1>
  <div className="print-actions card">
   <ResumePrintButton review={review}/>
  </div>
  <ResumePreview doc={doc}/>
 </main>;
}
