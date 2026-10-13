import { loadCareerVault, getSession } from '@/lib/career/server';
import { InterviewWorkspace } from '@/components/career/interview-workspace';
import { aiPersistenceConfigured } from '@/lib/career/ai-admin';
import { localModelConfigured } from '@/lib/career/local-model';
export const dynamic='force-dynamic';
export default async function CareerInterviewPage({searchParams}:{searchParams:Promise<{id?:string}>}){
 const {id}=await searchParams;
 const {sessions,suggestions}=await loadCareerVault();
 const selected=id&&sessions.some(s=>s.id===id)?await getSession(id):null;
 return <InterviewWorkspace sessions={sessions} selected={selected?.session??null}
   messages={selected?.messages??[]} proposals={suggestions.filter(s=>s.session_id===id)} configured={localModelConfigured()&&aiPersistenceConfigured()}/>;
}
