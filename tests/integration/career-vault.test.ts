/**
 * Mandatory staging tests for Migrations 003–007: two confirmed disposable accounts.
 * Uses the same explicit test configuration as profile RLS tests. Never point at
 * live production. These tests create and remove test-only records.
 */
import {describe,it,expect} from 'vitest';
import {createClient} from '@supabase/supabase-js';

function config(){
 const keys=['SUPABASE_TEST_PROJECT_URL','SUPABASE_TEST_PUBLISHABLE_KEY','SUPABASE_TEST_USER_A_EMAIL',
  'SUPABASE_TEST_USER_A_PASSWORD','SUPABASE_TEST_USER_B_EMAIL','SUPABASE_TEST_USER_B_PASSWORD'];
 const absent=keys.filter(k=>!process.env[k]);
 if(absent.length)throw new Error('Staging RLS test needs: '+absent.join(', '));
 if(process.env.SUPABASE_TEST_ALLOW_MUTATIONS!=='I_UNDERSTAND_STAGING_ONLY')
  throw new Error('Staging-only mutation acknowledgment missing.');
 const url=process.env.SUPABASE_TEST_PROJECT_URL!;
 if(new URL(url).host === 'jtitfwzpfbyfsdpxxrbj.supabase.co')throw new Error('Refusing mutation tests against the primary CareerOS Supabase project.');
  if(!url.startsWith('https://')||!url.endsWith('.supabase.co'))throw new Error('Use a dedicated Supabase staging URL');
 if(process.env.SUPABASE_TEST_USER_A_EMAIL===process.env.SUPABASE_TEST_USER_B_EMAIL)
  throw new Error('Two distinct test accounts are required.');
 return {url,key:process.env.SUPABASE_TEST_PUBLISHABLE_KEY!,
   a:{email:process.env.SUPABASE_TEST_USER_A_EMAIL!,password:process.env.SUPABASE_TEST_USER_A_PASSWORD!},
   b:{email:process.env.SUPABASE_TEST_USER_B_EMAIL!,password:process.env.SUPABASE_TEST_USER_B_PASSWORD!}};
}

describe('Career Vault staging ownership isolation',()=>{
 it('rejects cross-account read/write/delete and cross-owner relationships',async()=>{
  const cfg=config();const options={auth:{persistSession:false,autoRefreshToken:false}};
  const a=createClient(cfg.url,cfg.key,options),b=createClient(cfg.url,cfg.key,options);
  const aAuth=await a.auth.signInWithPassword(cfg.a),bAuth=await b.auth.signInWithPassword(cfg.b);
  expect(aAuth.error).toBeNull();expect(bAuth.error).toBeNull();
  const aid=aAuth.data.user!.id,bid=bAuth.data.user!.id;
  expect(aid).not.toEqual(bid);
  let aId:string|undefined,bId:string|undefined;
  try{
    const ra=await a.from('career_records').insert({user_id:aid,kind:'experience',title:'RLS disposable A'}).select('id').single();
    const rb=await b.from('career_records').insert({user_id:bid,kind:'project',title:'RLS disposable B'}).select('id').single();
    expect(ra.error).toBeNull();expect(rb.error).toBeNull();
    aId=ra.data!.id;bId=rb.data!.id;
    const foreignRead=await a.from('career_records').select('*').eq('id',bId);
    expect(foreignRead.error).toBeNull();expect(foreignRead.data).toEqual([]);
    const foreignUpdate=await a.from('career_records').update({title:'Unauthorized'}).eq('id',bId).select('id');
    expect(foreignUpdate.error).toBeNull();expect(foreignUpdate.data).toEqual([]);
    const foreignDelete=await a.from('career_records').delete().eq('id',bId).select('id');
    expect(foreignDelete.error).toBeNull();expect(foreignDelete.data).toEqual([]);
    const foreignInsert=await a.from('career_records').insert({user_id:bid,kind:'skill',title:'Unauthorized'});
    expect(foreignInsert.error).not.toBeNull();
    const crossLink=await a.from('career_links').insert({user_id:aid,from_record_id:aId,to_record_id:bId,relation:'related'});
    expect(crossLink.error).not.toBeNull();
    const bOwn=await b.from('career_records').select('title').eq('id',bId).single();
    expect(bOwn.data?.title).toBe('RLS disposable B');
    const anonymous=createClient(cfg.url,cfg.key,options);
    const anonymousRead=await anonymous.from('career_records').select('id').eq('id',aId);
    expect(anonymousRead.data??[]).toEqual([]);
  }finally{
   if(aId)await a.from('career_records').delete().eq('id',aId);
   if(bId)await b.from('career_records').delete().eq('id',bId);
  }
 },30000);

 it('enforces atomic, user-scoped suggestion approval and interview ownership',async()=>{
  const cfg=config();const options={auth:{persistSession:false,autoRefreshToken:false}};
  const a=createClient(cfg.url,cfg.key,options),b=createClient(cfg.url,cfg.key,options);
  expect((await a.auth.signInWithPassword(cfg.a)).error).toBeNull();
  expect((await b.auth.signInWithPassword(cfg.b)).error).toBeNull();
  const aid=(await a.auth.getUser()).data.user!.id;
  let sessionId:string|undefined,approvedId:string|undefined;
  const createdSuggestions:string[]=[];
  try{
   const ses=await a.from('career_interview_sessions').insert({user_id:aid,title:'RLS disposable interview'}).select('id').single();
   expect(ses.error).toBeNull();sessionId=ses.data!.id;
   const denied=await b.from('career_interview_messages').insert({user_id:(await b.auth.getUser()).data.user!.id,session_id:sessionId,role:'user',content:'Cross account message'});
   expect(denied.error).not.toBeNull();
   const deniedAssistant=await a.from('career_interview_messages').insert({
     user_id:aid,session_id:sessionId,role:'assistant',content:'Forged assistant message',
   });
   expect(deniedAssistant.error).not.toBeNull();
   const deniedServiceFunction=await a.rpc('persist_verified_ai_interview',{
     target_user_id:aid,target_session_id:sessionId,ai_reply:'Forged provider response',proposals:[],
   });
   expect(deniedServiceFunction.error).not.toBeNull();
   const deniedCVService=await a.rpc('persist_verified_ai_cv_suggestions',{
     target_user_id:aid,original_text:'This was a real staging interview answer',
     proposals:[],
   });
   expect(deniedCVService.error).not.toBeNull();
   const forgedAI=await a.from('career_suggestions').insert({
     user_id:aid,session_id:sessionId,kind:'skill',title:'Forged AI suggestion',
     origin:'ai',description:'Claiming a model made this',review_status:'pending',
   });
   expect(forgedAI.error).not.toBeNull();
   const text='Verified by the staging test';
   const suggestion=await a.from('career_suggestions').insert({
     user_id:aid,kind:'skill',title:text,description:text,
     evidence_quote:text,origin:'cv_import',review_status:'pending',
   }).select('id').single();
   expect(suggestion.error).toBeNull();
   createdSuggestions.push(suggestion.data!.id);
   const deniedApprove=await b.rpc('approve_career_suggestion',{suggestion_id:suggestion.data!.id});
   expect(deniedApprove.error).not.toBeNull();
   const approved=await a.rpc('approve_career_suggestion',{suggestion_id:suggestion.data!.id});
   expect(approved.error).toBeNull();approvedId=approved.data as string;
   const duplicate=await a.rpc('approve_career_suggestion',{suggestion_id:suggestion.data!.id});
   expect(duplicate.error).not.toBeNull();
   const saved=await a.from('career_records').select('title').eq('id',approvedId).single();
   expect(saved.data?.title).toBe(text);
   const another=await a.from('career_suggestions').insert({
     user_id:aid,kind:'skill',
     title:'Edited staging evidence',description:'Original proposed description',
     evidence_quote:'Original proposed description',origin:'cv_import',review_status:'pending',
   }).select('id').single();
   expect(another.error).toBeNull();
   createdSuggestions.push(another.data!.id);
   const correction=await a.rpc('edit_career_suggestion',{
     suggestion_id:another.data!.id,proposed_kind:'skill',
     proposed_title:'Edited staging evidence',proposed_description:'User-approved proposed detail',
   });
   expect(correction.error).toBeNull();expect(correction.data).toBe(true);
   const blockedMerge=await b.rpc('merge_career_suggestion',{
     suggestion_id:another.data!.id,target_record_id:approvedId,
     expected_revision:1,merge_title:false,merge_description:true,
   });
   expect(blockedMerge.error).not.toBeNull();
   const merged=await a.rpc('merge_career_suggestion',{
     suggestion_id:another.data!.id,target_record_id:approvedId,
     expected_revision:1,merge_title:false,merge_description:true,
   });
   expect(merged.error).toBeNull();
   const updated=await a.from('career_records').select('title,description,revision')
      .eq('id',approvedId).single();
   expect(updated.data?.title).toBe(text);
   expect(updated.data?.description).toBe('User-approved proposed detail');
   expect(updated.data?.revision).toBe(2);
  }finally{
   if(approvedId)await a.from('career_records').delete().eq('id',approvedId);
   for(const id of createdSuggestions)await a.from('career_suggestions').delete().eq('id',id);
   if(sessionId)await a.from('career_interview_sessions').delete().eq('id',sessionId);
  }
 },30000);
});
