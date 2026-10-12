import 'server-only';
import { requireAccount } from '@/lib/account';
import type { CareerRecord, CareerEvidence, CareerEvidenceLink,
 CareerLink, CareerSuggestion, CareerSession, CareerMessage, CareerEvent } from './schema';

export async function loadCareerVault() {
 const { user, supabase } = await requireAccount();
 const [records,evidence,evidenceLinks,links,suggestions,sessions,events] = await Promise.all([
   supabase.from('career_records').select('*').eq('user_id',user.id).order('updated_at',{ascending:false}).limit(250),
   supabase.from('career_evidence').select('*').eq('user_id',user.id).order('created_at',{ascending:false}).limit(250),
   supabase.from('career_evidence_links').select('*').eq('user_id',user.id).limit(500),
   supabase.from('career_links').select('*').eq('user_id',user.id).limit(500),
   supabase.from('career_suggestions').select('*').eq('user_id',user.id).order('created_at',{ascending:false}).limit(100),
   supabase.from('career_interview_sessions').select('*').eq('user_id',user.id).order('updated_at',{ascending:false}).limit(50),
   supabase.from('career_events').select('id,user_id,record_id,action,created_at').eq('user_id',user.id).order('created_at',{ascending:false}).limit(15),
 ]);
 for(const result of [records,evidence,evidenceLinks,links,suggestions,sessions,events]){
   if(result.error) throw new Error('Career Vault database unavailable. Apply required migrations and retry.');
 }
 return {
   userId:user.id,
   records:(records.data??[]) as CareerRecord[],
   evidence:(evidence.data??[]) as CareerEvidence[],
   evidenceLinks:(evidenceLinks.data??[]) as CareerEvidenceLink[],
   links:(links.data??[]) as CareerLink[],
   suggestions:(suggestions.data??[]) as CareerSuggestion[],
   sessions:(sessions.data??[]) as CareerSession[],
   events:(events.data??[]) as CareerEvent[],
 };
}

export async function getSession(sessionId:string){
 const {user,supabase}=await requireAccount();
 const {data:session,error}=await supabase.from('career_interview_sessions').select('*').eq('user_id',user.id).eq('id',sessionId).single();
 if(error||!session) return null;
 const messages=await supabase.from('career_interview_messages').select('*').eq('user_id',user.id).eq('session_id',sessionId).order('created_at',{ascending:true}).limit(100);
 if(messages.error) throw new Error('Unable to retrieve this career interview.');
 return {session:session as CareerSession,messages:(messages.data??[]) as CareerMessage[]};
}
