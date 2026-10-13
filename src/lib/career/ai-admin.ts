import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { supabaseConfig } from '@/lib/config';
import type { CareerSuggestion } from '@/lib/career/schema';

/**
 * A privileged client must ONLY be invoked after getUser() has authenticated
 * the incoming request and checked ownership of the target interview session.
 * Never expose this key or this client to a Client Component/browser bundle.
 */
export function aiPersistenceConfigured() {
 return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}

export async function persistVerifiedAI({
 verifiedUserId, sessionId, answerMessageId, reply, nextFocus, suggestions,
}:{
 verifiedUserId:string;sessionId:string;answerMessageId:string;reply:string;nextFocus:string;
 suggestions:Pick<CareerSuggestion,'kind'|'title'|'description'|'evidence_quote'>[];
}) {
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!key)throw new Error('AI persistence is not configured');
 const {url}=supabaseConfig();
 const client=createClient(url,key,{
  auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
 });
 // The SQL RPC re-verifies the account/session binding, validates each quoted
 // proposal, and commits the answer + proposals atomically.
 const {data,error}=await client.rpc('persist_verified_ai_interview_turn',{
  target_user_id:verifiedUserId,
  target_session_id:sessionId,
  target_user_message_id:answerMessageId,
  ai_reply:reply,
  next_question_focus:nextFocus,
  proposals:suggestions,
 });
 if(error||data!==true)throw new Error('Verified AI output could not be saved');
}


export async function persistVerifiedCVSuggestions({
 verifiedUserId,originalText,suggestions,
}:{
 verifiedUserId:string;originalText:string;
 suggestions:Pick<CareerSuggestion,'kind'|'title'|'description'|'evidence_quote'>[];
}) {
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!key)throw new Error('AI persistence is not configured');
 const {url}=supabaseConfig();
 const admin=createClient(url,key,{
  auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
 });
 const {data,error}=await admin.rpc('persist_verified_ai_cv_suggestions',{
  target_user_id:verifiedUserId,original_text:originalText,proposals:suggestions,
 });
 if(error||data!==suggestions.length)throw new Error('Extracted AI facts could not be saved securely');
}
