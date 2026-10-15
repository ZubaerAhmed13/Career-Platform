import {notFound} from 'next/navigation';
import {emptyResume} from '@/lib/resume/schema';
import {ResumePreview} from '@/components/resume/resume-preview';
/** Local browser visual fixture only. Never published in production. */
export default async function ResumeFixture({searchParams}:{searchParams:Promise<{long?:string;paper?:string}>}){
 if(process.env.NODE_ENV!=='development')notFound();
 const {long,paper}=await searchParams;
 const doc=emptyResume('student-graduate',paper==='Letter'?'Letter':'A4');
 doc.contact.name='Example Student';doc.contact.email='student@example.invalid';
 doc.summary='An entirely synthetic graduate profile used only for design validation.';
 doc.sections[1].entries.push({id:crypto.randomUUID(),title:'Master of Sample Studies',
  subtitle:'Example University',location:'Test City',startedOn:'2024-10-01',endedOn:'',
  current:true,visible:true,source:null,bullets:[]});
 doc.sections[0].entries.push({id:crypto.randomUUID(),title:'Working Student — Operations',
  subtitle:'Sample Warehouse',location:'Example City',startedOn:'2025-01-01',endedOn:'',
  current:true,visible:true,source:null,bullets:[
   {id:crypto.randomUUID(),text:'Checked inventory accuracy against stock records.',visible:true}]});
 if(long==='1')for(let i=0;i<9;i++)doc.sections[0].entries.push({id:crypto.randomUUID(),
  title:'Synthetic employer '+(i+1),subtitle:'Very Long Fictional Department For Layout Testing',
  location:'Test city',startedOn:'2010-01-01',endedOn:'2018-12-31',current:false,visible:true,source:null,
  bullets:Array.from({length:7},(_,j)=>({id:crypto.randomUUID(),visible:true,
   text:'Synthetic achievement '+(i+1)+'/'+(j+1)+': documented work and its exact contribution with readable line length, with no invented real-world statistics.'}))});
 return <main className="container stack"><h1 className="heading">Synthetic resume layout fixture</h1>
  <p className="subtle">Development-only visual sample. Not a saved career document.</p>
  <div className="resume-preview-scroll"><ResumePreview doc={doc}/></div></main>;
}
