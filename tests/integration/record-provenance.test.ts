/**
 * Run ONLY on a dedicated disposable Supabase staging project.
 * Confirm migrations 001–009 are present before running.
 */
import {describe,it,expect} from 'vitest';
import {createClient} from '@supabase/supabase-js';
const mainProject='jtitfwzpfbyfsdpxxrbj.supabase.co';
function config(){
 const required=[
  'SUPABASE_TEST_PROJECT_URL','SUPABASE_TEST_PUBLISHABLE_KEY',
  'SUPABASE_TEST_USER_A_EMAIL','SUPABASE_TEST_USER_A_PASSWORD',
 ];
 const missing=required.filter(k=>!process.env[k]);
 if(missing.length)throw new Error('Missing staging credentials: '+missing.join(', '));
 if(process.env.SUPABASE_TEST_ALLOW_MUTATIONS!=='I_UNDERSTAND_STAGING_ONLY')
  throw new Error('Mutation tests require explicit staging acknowledgement');
 const url=process.env.SUPABASE_TEST_PROJECT_URL!;
 if(!url.startsWith('https://')||!url.endsWith('.supabase.co')
  ||new URL(url).hostname===mainProject)
  throw new Error('Refusing primary production or invalid project');
 return {
  url,key:process.env.SUPABASE_TEST_PUBLISHABLE_KEY!,
  email:process.env.SUPABASE_TEST_USER_A_EMAIL!,
  password:process.env.SUPABASE_TEST_USER_A_PASSWORD!,
 };
}
describe('manual career provenance cannot be forged',()=>{
 it('rejects fake AI attribution and preserves original source on edits',async()=>{
  const {url,key,email,password}=config();
  const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const auth=await client.auth.signInWithPassword({email,password});
  expect(auth.error).toBeNull();
  const userId=auth.data.user!.id;
  for(const source of ['ai','import']){
   const fake=await client.from('career_records').insert({
    user_id:userId,kind:'skill',title:'Forged '+source,source,status:'confirmed',
   });
   expect(fake.error).not.toBeNull();
  }
  const fakePending=await client.from('career_records').insert({
   user_id:userId,kind:'skill',title:'Forged pending',source:'manual',status:'unreviewed',
  });
  expect(fakePending.error).not.toBeNull();
  const created=await client.from('career_records').insert({
   user_id:userId,kind:'skill',title:'Staging provenance disposable',
  }).select('id,source,status,revision').single();
  expect(created.error).toBeNull();
  const id=created.data!.id;
  try{
   expect(created.data?.source).toBe('manual');
   expect(created.data?.status).toBe('confirmed');
   const fakeSource=await client.from('career_records')
    .update({source:'ai'}).eq('id',id);
   expect(fakeSource.error).not.toBeNull();
   const fakeStatus=await client.from('career_records')
    .update({status:'conflict'}).eq('id',id);
   expect(fakeStatus.error).not.toBeNull();
   const legitimate=await client.from('career_records').update({
    title:'Legitimate edit',
   }).eq('id',id).select('source,status,revision').single();
   expect(legitimate.error).toBeNull();
   expect(legitimate.data?.source).toBe('manual');
   expect(legitimate.data?.status).toBe('confirmed');
   expect(legitimate.data?.revision).toBe(2);
  }finally{
   const deleted=await client.from('career_records').delete().eq('id',id);
   expect(deleted.error).toBeNull();
  }
 },30000);
});
