import {notFound} from 'next/navigation';
import {z} from 'zod';
import {loadMyResume} from '@/lib/resume/server';
import {getResumeVersion} from '@/app/actions/resumes';
import {ResumePreview} from '@/components/resume/resume-preview';
import Link from 'next/link';
import {ResumePrintButton} from '@/components/resume/print-button';
import {reviewResumeBeforeExport} from '@/lib/resume/export-review';
export const dynamic='force-dynamic';
export default async function ResumePrintPage({params,searchParams}:{
 params:Promise<{id:string}>,searchParams:Promise<{version?:string}>}){
 const {id}=await params;const {version}=await searchParams;
 if(!z.uuid().safeParse(id).success)notFound();
 const row=await loadMyResume(id);if(!row)notFound();
 const historical=version&&z.uuid().safeParse(version).success?await getResumeVersion(id,version):null;
 if(version&&!historical)notFound();
 const document=historical?.snapshot_content??row.draft_content;
 const review=reviewResumeBeforeExport(document);
 return <div className="resume-print-page">
  <div className="print-actions card">
   <p className="subtle">Select Print, then choose Save as PDF. Use 100% scale, default margins off, and background graphics enabled if needed.</p>
   <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
    <Link className="button secondary" href={'/resume-studio/'+id}>Back to editor</Link>
    <ResumePrintButton review={review}/>
   </div>
  </div>
  <ResumePreview doc={document}/>
 </div>;
}
