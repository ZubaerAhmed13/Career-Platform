import {describe,it,expect,vi,afterEach} from 'vitest';
import {localModelConfiguration,localModelConfigured} from '../src/lib/career/local-model';
vi.mock('server-only',()=>({}));
const vars=(overrides:Record<string,string|undefined>={}):NodeJS.ProcessEnv=>({
 NODE_ENV:'production',
 SELF_HOSTED_LLM_URL:'https://career-model.example.com',
 SELF_HOSTED_LLM_TOKEN:'test-token-must-be-at-least-24-characters',
 SELF_HOSTED_LLM_MODEL:'qwen3:8b',
 ...overrides,
} as NodeJS.ProcessEnv);
describe('private CareerOS inference settings',()=>{
 it('requires production TLS and strong server-only credentials',()=>{
  expect(localModelConfiguration(vars()).model).toBe('qwen3:8b');
  for(const o of [
   {SELF_HOSTED_LLM_TOKEN:''},
   {SELF_HOSTED_LLM_URL:'http://career-model.example.com'},
   {SELF_HOSTED_LLM_URL:'https://127.0.0.1:11434'},
   {SELF_HOSTED_LLM_URL:'https://career-model.example.com/path'},
   {SELF_HOSTED_LLM_URL:'https://user:pass@career-model.example.com'},
   {SELF_HOSTED_LLM_MODEL:'bad model name!'},
  ])expect(localModelConfigured(vars(o))).toBe(false);
 });
 it('allows unexposed loopback development inference',()=>{
  expect(localModelConfigured(vars({
   NODE_ENV:'test',SELF_HOSTED_LLM_URL:'http://127.0.0.1:11434',SELF_HOSTED_LLM_TOKEN:'',
  }))).toBe(true);
 });
});
describe('self-hosted career-only model client',()=>{
 const original={...process.env};
 afterEach(()=>{vi.unstubAllGlobals();process.env={...original};});
 it('sends structured schema and receives local model JSON',async()=>{
  process.env={...process.env,...vars({NODE_ENV:'test',SELF_HOSTED_LLM_URL:'http://127.0.0.1:11434',SELF_HOSTED_LLM_TOKEN:''})};
  const mocked=vi.fn(async (_url:string,_init:RequestInit)=>new Response(JSON.stringify({
   done:true,message:{role:'assistant',content:JSON.stringify({
    scope:'career',reply:'What did you do?',next_focus:'action',suggestions:[],
   })},
  }),{status:200}));
  vi.stubGlobal('fetch',mocked);
  const {requestStructuredCareerAI}=await import('../src/lib/career/provider');
  const result=await requestStructuredCareerAI({
   name:'career_interview',instructions:'Only career questions.',
   input:[{role:'user',content:'I did inventory cycle counts.'}],
   schema:{type:'object'},maxOutputTokens:400,
  });
  expect(result).toMatchObject({scope:'career',next_focus:'action'});
  const [url,options]=mocked.mock.calls[0];
  expect(url).toBe('http://127.0.0.1:11434/api/chat');
  const body=JSON.parse(options.body as string);
  expect(body.model).toBe('qwen3:8b');
  expect(body.stream).toBe(false);
  expect(body.think).toBe(false);
  expect(body.format).toEqual({type:'object'});
  expect(body.messages[0]).toEqual({role:'system',content:'Only career questions.'});
 });
 it('rejects general-purpose model calls before any network request',async()=>{
  process.env={...process.env,...vars({NODE_ENV:'test'})};
  const mock=vi.fn();vi.stubGlobal('fetch',mock);
  const {requestStructuredCareerAI}=await import('../src/lib/career/provider');
  await expect(requestStructuredCareerAI({
   name:'general_chat' as 'career_interview',instructions:'test',
   input:[{role:'user',content:'Tell me a joke.'}],schema:{},
  })).rejects.toThrow('Unsupported');
  expect(mock).not.toHaveBeenCalled();
 });
 it('does not accept malformed model output or redirects',async()=>{
  process.env={...process.env,...vars({NODE_ENV:'test'})};
  const {requestStructuredCareerAI}=await import('../src/lib/career/provider');
  vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify({
   done:true,message:{role:'assistant',content:'Not JSON'},
  }),{status:200})));
  const call=()=>requestStructuredCareerAI({
    name:'career_cv_paste',instructions:'career',
    input:[{role:'user',content:'I used Excel at work.'}],schema:{type:'object'},
  });
  await expect(call()).rejects.toThrow('structured JSON');
  vi.stubGlobal('fetch',vi.fn(async()=>new Response('',{status:302,headers:{location:'https://evil.example'}})));
  await expect(call()).rejects.toThrow('redirect');
 });
});
