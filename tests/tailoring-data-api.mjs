// Disposable synthetic-JWT/PostgREST acceptance for Step 4. Never use live credentials.
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
const base=process.env.CAREEROS_TEST_REST_URL??'http://127.0.0.1:3111';
const secret=process.env.CAREEROS_TEST_JWT_SECRET;
assert(secret&&secret.length>=32,'Missing synthetic JWT secret');
const A='10101010-1010-4010-8010-101010101010',B='20202020-2020-4020-8020-202020202020';
const encode=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
function token(sub){
 const now=Math.floor(Date.now()/1000);
 const prefix=encode({alg:'HS256',typ:'JWT'})+'.'+encode({role:'authenticated',sub,aud:'authenticated',iat:now,exp:now+3600});
 return prefix+'.'+createHmac('sha256',secret).update(prefix).digest('base64url');
}
async function query(path,{method='GET',identity,body}={}){
 const headers={Accept:'application/json','Content-Type':'application/json',Prefer:'return=representation'};
 if(identity)headers.Authorization='Bearer '+token(identity);
 const response=await fetch(base+path,{method,headers,...(body?{body:JSON.stringify(body)}:{})});
 const raw=await response.text();let data;try{data=raw?JSON.parse(raw):null;}catch{data=raw;}
 return {status:response.status,data};
}
async function ok(path,args){
 const result=await query(path,args);
 assert(result.status>=200&&result.status<300,args.method+' '+path+' => '+result.status+' '+JSON.stringify(result.data).slice(0,300));
 return result.data;
}
const job='Required: Excel experience and operational reporting. Preferred: project coordination with English communication.';
const original={schemaVersion:1,contact:{name:'Synthetic candidate'},summary:'Before tailoring',summaryVisible:true,sections:[],
 settings:{template:'ats-classic',paper:'A4',language:'en',font:'Arial',
  bodySize:10.5,headingSize:12,lineSpacing:1.2,margin:'standard',density:'standard',
  accent:'#1d3557',dateStyle:'month-year'}};
const source=(await ok('/resumes?select=id,revision',{
 method:'POST',identity:A,body:{user_id:A,name:'Synthetic source',draft_content:original,
  template_id:'ats-classic',paper_size:'A4',document_language:'en'}}))[0];
const brief=(await ok('/resume_tailoring_sessions?select=id,revision',{
 method:'POST',identity:A,body:{user_id:A,job_title:'Operations Analyst',
  original_job_description:job,initial_job_description:job,requirements:[]}}))[0];
assert.equal(brief.revision,1);
assert.deepEqual(await ok('/resume_tailoring_sessions?select=id&id=eq.'+brief.id,{identity:B}),[]);
const anonymous=await query('/resume_tailoring_sessions?select=id');
assert([401,403].includes(anonymous.status)||(anonymous.status===200&&anonymous.data.length===0));
const forged=await query('/resume_tailoring_sessions?select=id',{method:'POST',identity:B,
 body:{user_id:B,job_title:'Forged',original_job_description:job,initial_job_description:job,source_resume_id:source.id}});
assert(forged.status>=400,'Cross-owner source link must fail');
const proposed=[{id:'31313131-3131-4131-8131-313131313131',text:'Excel experience',
 excerpt:'Required: Excel experience',position:0,category:'tool',priority:'essential',
 relation:'single',origin:'detected',review:'approved'}];
const saved=(await ok('/resume_tailoring_sessions?select=revision&revision=eq.1&id=eq.'+brief.id,{
 method:'PATCH',identity:A,body:{requirements:proposed}}))[0];
assert.equal(saved.revision,2);
const stale=await ok('/resume_tailoring_sessions?select=revision&revision=eq.1&id=eq.'+brief.id,{
 method:'PATCH',identity:A,body:{private_notes:'Stale edit'}});
assert.deepEqual(stale,[]);
// A single owner-checked SQL transaction must insert and link, never create
// an orphan document after another tab changes the job or a stranger calls it.
const rpc='/rpc/create_my_targeted_resume';
const rpcBody={p_session:brief.id,p_revision:2,p_source:source.id,
 p_version:null,p_blank_doc:null,p_expected_source_revision:source.revision};
const before=await ok('/resumes?select=id',{identity:A});
const crossOwner=await query(rpc,{method:'POST',identity:B,body:rpcBody});
assert(crossOwner.status>=400,'A different account must not create a CV for this job');
const outdatedSource=await query(rpc,{method:'POST',identity:A,
 body:{...rpcBody,p_expected_source_revision:source.revision+1}});
assert(outdatedSource.status>=400,'Changed source revision must reject the atomic copy');
const outdated=await query(rpc,{method:'POST',identity:A,body:{...rpcBody,p_revision:1}});
assert(outdated.status>=400,'A stale revision must reject the entire transaction');
assert.equal((await ok('/resumes?select=id',{identity:A})).length,before.length,
 'Failed target creation must never create an orphan CV');
const [linked]=(await ok(rpc,{method:'POST',identity:A,body:rpcBody}));
assert.equal(linked.session_revision,3);
const copy={id:linked.resume_id};
const duplicate=await query(rpc,{method:'POST',identity:A,body:rpcBody});
assert(duplicate.status>=400,'Second submission must not create another target CV');
assert.equal((await ok('/resumes?select=id',{identity:A})).length,before.length+1,
 'Only one targeted CV may be created for a job');

const fresh=await ok('/resume_tailoring_sessions?select=id,requirements,source_snapshot,tailored_resume_id&id=eq.'+brief.id,{
 identity:A});
assert.equal(fresh[0].source_snapshot.summary,'Before tailoring');
assert.equal(fresh[0].requirements[0].review,'approved');
assert.equal(fresh[0].tailored_resume_id,copy.id);
const tamper=await query('/resume_tailoring_sessions?id=eq.'+brief.id,{method:'PATCH',identity:A,
 body:{source_snapshot:{...original,summary:'Tampered baseline'}}});
assert(tamper.status>=400,'Immutable baseline change must be rejected');
const sourceAgain=await ok('/resumes?select=draft_content&id=eq.'+source.id,{identity:A});
assert.equal(sourceAgain[0].draft_content.summary,'Before tailoring');
const targetCopy=await ok('/resumes?select=draft_content&id=eq.'+copy.id,{identity:A});
assert.equal(targetCopy[0].draft_content.summary,'Before tailoring',
 'Target must begin as a faithful, independent snapshot, not rewritten content');
const foreignUpdate=await ok('/resume_tailoring_sessions?select=id&id=eq.'+brief.id,{method:'PATCH',identity:B,
 body:{private_notes:'Foreign tamper'}});
assert.deepEqual(foreignUpdate,[]);
await ok('/resume_tailoring_sessions?id=eq.'+brief.id,{method:'DELETE',identity:A});
assert.equal((await ok('/resumes?select=id&id=eq.'+copy.id,{identity:A})).length,1);
await ok('/resumes?id=eq.'+copy.id,{method:'DELETE',identity:A});
await ok('/resumes?id=eq.'+source.id,{method:'DELETE',identity:A});
console.log('PASS private job briefs, revisions, immutable comparisons, owner isolation, atomic CV cloning/linking, rollback on conflicts and independent deletion');
