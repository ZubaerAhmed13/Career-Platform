'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAccount } from '@/lib/account';
import { getInterviewResponse, AIUnavailableError } from '@/lib/career/ai';
import { aiPersistenceConfigured, persistVerifiedAI } from '@/lib/career/ai-admin';
import { interviewTopics } from '@/lib/career/prompts';
import { selectInterviewContext } from '@/lib/career/context';
import type { VaultActionState } from './career';

const uuid=z.uuid();
const topicSchema=z.enum(interviewTopics);

export async function startCareerInterview(_previous:VaultActionState,form:FormData):Promise<VaultActionState>{
 if(!process.env.OPENAI_API_KEY||!aiPersistenceConfigured())return {error:'AI interviewer is unavailable until the provider and secure persistence are configured.'};
 const topic=topicSchema.safeParse(form.get('topic'));
 if(!topic.success)return {error:'Select a supported career interview topic.'};
 const title=String(form.get('title')??'Career exploration').trim().slice(0,160)||'Career exploration';
 const {user,supabase}=await requireAccount();
 const {data,error}=await supabase.from('career_interview_sessions')
   .insert({user_id:user.id,title,topic:topic.data}).select('id').single();
 if(error||!data)return {error:'Unable to start an interview session.'};
 redirect('/career-vault/interview?id='+data.id);
}

export async function sendCareerInterviewAnswer(_previous:VaultActionState,form:FormData):Promise<VaultActionState>{
 if(!process.env.OPENAI_API_KEY||!aiPersistenceConfigured())return {error:'AI interviewer or secure persistence is not configured.'};
 if(form.get('consent')!=='yes')return {error:'Confirm you agree to send this answer to the configured AI provider.'};
 const sessionId=String(form.get('session_id')??'');
 const answer=String(form.get('answer')??'').trim();
 const topic=topicSchema.safeParse(form.get('topic'));
 if(!uuid.safeParse(sessionId).success||!topic.success||answer.length<5||answer.length>2000)
   return {error:'Enter an answer of 5–2,000 characters and select a valid interview topic.'};
 const {user,supabase}=await requireAccount();
 const session=await supabase.from('career_interview_sessions').select('id,status')
   .eq('id',sessionId).eq('user_id',user.id).maybeSingle();
 if(session.error||!session.data||session.data.status!=='active')return {error:'This interview is not available.'};
 const recent=await supabase.from('career_interview_messages').select('id')
   .eq('user_id',user.id).gte('created_at',new Date(Date.now()-60_000).toISOString()).limit(6);
 if(recent.error)return {error:'Could not check interview usage limits.'};
 if((recent.data??[]).length>=6)return {error:'Interview usage limit reached. Try again in a minute.'};
 const [history,records]=await Promise.all([
   supabase.from('career_interview_messages').select('role,content')
    .eq('user_id',user.id).eq('session_id',sessionId).order('created_at',{ascending:false}).limit(10),
   supabase.from('career_records').select('kind,title,description')
    .eq('user_id',user.id).eq('status','confirmed').order('updated_at',{ascending:false}).limit(40),
 ]);
 if(history.error||records.error)return {error:'Unable to retrieve the selected career context.'};
 // User message is persisted first; if provider fails it remains truthfully marked as unanswered.
 const quota=await supabase.rpc('claim_career_ai_quota');
 if(quota.error||!quota.data)return {error:'AI usage limit reached or quota service unavailable. Try again later.'};
 const saved=await supabase.from('career_interview_messages').insert({
   user_id:user.id,session_id:sessionId,role:'user',content:answer,
 }).select('id').single();
 if(saved.error||!saved.data)return {error:'Your answer could not be saved.'};
 try{
   const result=await getInterviewResponse({
     topic:topic.data,answer,
     history:(history.data??[]).reverse().map(m=>({role:m.role as 'user'|'assistant',content:m.content})),
     context:selectInterviewContext((records.data??[]),topic.data),
   });
   try {
     await persistVerifiedAI({
       verifiedUserId:user.id,sessionId,answerMessageId:saved.data.id,
       reply:result.reply,nextFocus:result.next_focus,suggestions:result.suggestions,
     });
   } catch {
     return {error:'Your answer was saved, but the verified AI response could not be stored safely. No assistant reply was fabricated.'};
   }
   revalidatePath('/career-vault/interview');revalidatePath('/career-vault/review');
   return {message:result.scope==='off_topic'
     ?'CareerOS is limited to your real career background; no fact proposals were created.'
     :'Answer saved; any proposed facts are pending your approval.'};
 }catch(error){
   const message=error instanceof AIUnavailableError?error.message:'The AI provider could not complete this response.';
   revalidatePath('/career-vault/interview');
   return {error:message+' Your original answer was saved, and no artificial reply was created.'};
 }
}

export async function completeCareerInterview(_previous:VaultActionState,form:FormData):Promise<VaultActionState>{
 const id=String(form.get('session_id')??'');
 if(!uuid.safeParse(id).success)return {error:'Invalid interview session.'};
 const {user,supabase}=await requireAccount();
 const {data,error}=await supabase.from('career_interview_sessions')
   .update({status:'completed',updated_at:new Date().toISOString()})
   .eq('id',id).eq('user_id',user.id).select('id').maybeSingle();
 if(error||!data)return {error:'Could not finish the interview.'};
 revalidatePath('/career-vault/interview');return {message:'Interview completed. Your conversation remains saved.'};
}
