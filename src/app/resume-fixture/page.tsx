import {notFound} from 'next/navigation';
import {emptyResume} from '@/lib/resume/schema';
import {ResumePreview} from '@/components/resume/resume-preview';
/** Local browser visual fixture only. Never published in production. */
export default function ResumeFixture(){
 if(process.env.NODE_ENV!=='development')notFound();
 const doc=emptyResume('student-graduate');
 doc.contact.name='Example Student';doc.contact.email='student@example.invalid';
 doc.summary='An entirely synthetic graduate profile used only for design validation.';
 doc.sections[1].entries.push({id:crypto.randomUUID(),title:'Master of Sample Studies',
  subtitle:'Example University',location:'Test City',startedOn:'2024-10-01',endedOn:'',
  current:true,visible:true,source:null,bullets:[]});
 doc.sections[0].entries.push({id:crypto.randomUUID(),title:'Working Student — Operations',
  subtitle:'Sample Warehouse',location:'Example City',startedOn:'2025-01-01',endedOn:'',
  current:true,visible:true,source:null,bullets:[
   {id:crypto.randomUUID(),text:'Checked inventory accuracy against stock records.',visible:true}]});
 return <main className="container stack"><h1 className="heading">Synthetic resume layout fixture</h1>
  <p className="subtle">Development-only visual sample. Not a saved career document.</p>
  <div className="resume-preview-scroll"><ResumePreview doc={doc}/></div></main>;
}
