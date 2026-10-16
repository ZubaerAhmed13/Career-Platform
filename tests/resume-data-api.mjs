// Disposable CI-only JWT/PostgREST acceptance. Never connects to real user data.
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
const base=process.env.CAREEROS_TEST_REST_URL??'http://127.0.0.1:3111';
const secret=process.env.CAREEROS_TEST_JWT_SECRET;
assert(secret&&secret.length>=32,'A synthetic JWT test secret is required');
const A='10101010-1010-4010-8010-101010101010';
const B='20202020-2020-4020-8020-202020202020';
const record='30303030-3030-4030-8030-303030303030';
const encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
function jwt(sub){
 const claims={role:'authenticated',sub,aud:'authenticated',
  iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600};
 const prefix=encode({alg:'HS256',typ:'JWT'})+'.'+encode(claims);
 return prefix+'.'+createHmac('sha256',secret).update(prefix).digest('base64url');
}
const a=jwt(A),b=jwt(B);
async function req(path,{method='GET',token,body,prefer}={}){
 const headers={Accept:'application/json','Content-Type':'application/json'};
 if(token)headers.Authorization='Bearer '+token;
 if(prefer)headers.Prefer=prefer;
 const response=await fetch(base+path,{method,headers,...(body?{body:JSON.stringify(body)}:{})});
 const raw=await response.text();
 let data;
 try{data=raw?JSON.parse(raw):null;}catch{data=raw;}
 return {status:response.status,data};
}
async function ok(path,opts={}){
 const r=await req(path,opts);
 assert(r.status>=200&&r.status<300,opts.method+' '+path+' '+r.status+': '+JSON.stringify(r.data).slice(0,400));
 return r.data;
}
function document(){
 return {schemaVersion:1,contact:{name:'Synthetic Owner A',headline:'',photo:'',showPhoto:false,email:'a@example.invalid',
  phone:'',location:'',linkedin:'',portfolio:'',github:'',website:'',hidden:[]},
 summary:'',summaryVisible:true,sections:[{id:'40404040-4040-4040-8040-404040404040',
 kind:'experience',title:'Experience',visible:true,entries:[]}],
 settings:{template:'ats-classic',paper:'A4',language:'en',font:'Arial',bodySize:10.5,
 headingSize:12,lineSpacing:1.2,margin:'standard',density:'standard',accent:'#1d3557',dateStyle:'month-year'}};
}
async function main(){
 const noToken=await req('/resumes?select=id');
 assert([401,403].includes(noToken.status),'anonymous access must fail');
 const added=await ok('/resumes?select=id,revision',{token:a,method:'POST',prefer:'return=representation',
  body:{user_id:A,name:'Synthetic CV',focus_label:'Student',draft_content:document(),
   template_id:'ats-classic',paper_size:'A4',document_language:'en'}});
 assert.equal(added.length,1);assert.equal(added[0].revision,1);
 const id=added[0].id;
 const refreshed=await ok('/resumes?select=id,draft_content&id=eq.'+id,{token:jwt(A)});
 assert.equal(refreshed.length,1);assert.equal(refreshed[0].draft_content.contact.name,'Synthetic Owner A');
 console.log('PASS anonymous isolation; authenticated create; fresh-token reload');
 assert.deepEqual(await ok('/resumes?select=id&id=eq.'+id,{token:b}),[]);
 const forged=await req('/resumes?select=id',{token:b,method:'POST',prefer:'return=representation',
  body:{user_id:A,name:'Forged',draft_content:document(),
   template_id:'ats-classic',paper_size:'A4',document_language:'en'}});
 assert(forged.status>=400);
 const entry={id:'50505050-5050-4050-8050-505050505050',title:'Synthetic Operations Assistant',
  subtitle:'Example Organisation',location:'',startedOn:'',endedOn:'',current:false,visible:true,
  extras:{},bullets:[{id:'60606060-6060-4060-8060-606060606060',
  text:'Verified synthetic inventory responsibilities.',visible:true}],
  source:{recordId:record,revision:1,kind:'experience',capturedAt:'2026-10-16T10:00:00.000Z',
   title:'Synthetic Operations Assistant',organization:'Example Organisation',
   description:'Verified synthetic inventory responsibilities.'}};
 const doc=document();doc.sections[0].entries.push(entry);
 const saved=await ok('/resumes?select=revision&id=eq.'+id+'&revision=eq.1',{
  token:a,method:'PATCH',prefer:'return=representation',body:{draft_content:doc}});
 assert.equal(saved[0].revision,2);
 const original=await ok('/career_records?select=title,revision,description&id=eq.'+record,{token:a});
 assert.equal(original[0].revision,1);
 assert.equal(original[0].description,entry.source.description);
 console.log('PASS two owners isolated; confirmed Vault snapshot without mutating source');
 const foreign=await ok('/resumes?select=id&id=eq.'+id,{token:b,method:'PATCH',
  prefer:'return=representation',body:{name:'Foreign'}});
 assert.deepEqual(foreign,[]);
 const forbidden=await req('/rpc/create_my_resume_version',{token:b,method:'POST',
  body:{p_resume:id,p_label:'Forgery',p_revision:2}});
 assert(forbidden.status>=400);
 const number=await ok('/rpc/create_my_resume_version',{token:a,method:'POST',
  body:{p_resume:id,p_label:'Baseline',p_revision:2}});
 assert.equal(number,1);
 const versions=await ok('/resume_versions?select=id,version_number,label,snapshot_content&resume_id=eq.'+id,{token:a});
 assert.equal(versions.length,1);
 assert.equal(versions[0].snapshot_content.sections[0].entries[0].source.recordId,record);
 assert.deepEqual(await ok('/resume_versions?select=id&resume_id=eq.'+id,{token:b}),[]);
 const mutation=await req('/resume_versions?id=eq.'+versions[0].id,{token:a,method:'PATCH',body:{label:'Forge'}});
 assert(mutation.status>=400);
 console.log('PASS independent immutable versions, owner-restricted RPC');
 const stale=await ok('/resumes?select=id&id=eq.'+id+'&revision=eq.1',{
  token:a,method:'PATCH',prefer:'return=representation',body:{name:'Stale'}});
 assert.deepEqual(stale,[]);
 doc.summary='Resume-only tailoring without changing Vault';
 const tailored=await ok('/resumes?select=revision&id=eq.'+id+'&revision=eq.2',{
  token:a,method:'PATCH',prefer:'return=representation',body:{draft_content:doc}});
 assert.equal(tailored[0].revision,3);
 const old=await ok('/resume_versions?select=snapshot_content&resume_id=eq.'+id,{token:a});
 assert.equal(old[0].snapshot_content.summary,'');
 const restored=await ok('/resumes?select=revision,draft_content&id=eq.'+id+'&revision=eq.3',{
  token:a,method:'PATCH',prefer:'return=representation',
  body:{draft_content:old[0].snapshot_content}});
 assert.equal(restored[0].revision,4);assert.equal(restored[0].draft_content.summary,'');
 console.log('PASS stale update protection, version restoration and stable history');
 const backup=await ok('/resumes?select=id,draft_content&user_id=eq.'+A,{token:a});
 const backupVersions=await ok('/resume_versions?select=id,snapshot_content&user_id=eq.'+A,{token:a});
 assert.equal(backup.length,1);assert.equal(backupVersions.length,1);
 const deleted=await ok('/resumes?select=id&id=eq.'+id,{token:a,method:'DELETE',prefer:'return=representation'});
 assert.equal(deleted.length,1);
 assert.deepEqual(await ok('/resume_versions?select=id&resume_id=eq.'+id,{token:a}),[]);
 console.log('PASS owner-filtered backup row availability and own resume/versions deletion');
}
await main().catch(e=>{console.error(e);process.exitCode=1;});
