import {notFound} from 'next/navigation';
import {z} from 'zod';
import {loadMyResume,listMyResumeVersions,listConfirmedVaultRecords} from '@/lib/resume/server';
import {ResumeEditor} from '@/components/resume/resume-editor';
import type {CareerRecord} from '@/lib/career/schema';
export const dynamic='force-dynamic';
export default async function ResumeEditorPage({params,searchParams}:{
 params:Promise<{id:string}>,searchParams:Promise<{vault?:string}>}){
 const {id}=await params;
 if(!z.uuid().safeParse(id).success)notFound();
 const [row,versions,records]=await Promise.all([
  loadMyResume(id),listMyResumeVersions(id),listConfirmedVaultRecords()
 ]);
 if(!row)notFound();
 const {vault}=await searchParams;
 return <ResumeEditor row={row} versions={versions} vault={records as CareerRecord[]} openVault={vault==='1'}/>;
}
