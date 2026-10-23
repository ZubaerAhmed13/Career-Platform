import {notFound} from 'next/navigation';
import {z} from 'zod';
import {loadMyTailoringSession} from '@/lib/tailoring/server';
import {listMyResumes,listConfirmedVaultRecords} from '@/lib/resume/server';
import {TailoringWorkspace} from '@/components/tailoring/tailoring-workspace';
import type {CareerRecord} from '@/lib/career/schema';
export const dynamic='force-dynamic';
export default async function TailoringSessionPage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 if(!z.uuid().safeParse(id).success)notFound();
 const [session,resumes,records]=await Promise.all([
  loadMyTailoringSession(id),listMyResumes(),listConfirmedVaultRecords()
 ]);
 if(!session)notFound();
 return <TailoringWorkspace session={session} resumes={resumes} vault={records as CareerRecord[]}/>;
}
