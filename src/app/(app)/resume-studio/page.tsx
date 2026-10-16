import {listMyResumes} from '@/lib/resume/server';
import {ResumeLibrary} from '@/components/resume/resume-library';
export const dynamic='force-dynamic';
export default async function ResumeStudioPage(){
 const rows=await listMyResumes();
 return <ResumeLibrary initial={rows}/>;
}
