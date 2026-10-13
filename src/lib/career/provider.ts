import 'server-only';
import {isCareerAIPurpose,type CareerAIPurpose} from './ai-purpose';
import {localModelConfiguration,LocalModelConfigurationError} from './local-model';

/** Owned Ollama inference only; no commercial model API or fallback. */
export class AIUnavailableError extends Error {}
export async function requestStructuredCareerAI({
 instructions,input,schema,name,maxOutputTokens=700,
}:{
 instructions:string;
 input:Array<{role:'user'|'assistant';content:string}>;
 schema:Record<string,unknown>;
 name:CareerAIPurpose;maxOutputTokens?:number;
}):Promise<unknown>{
 if(!isCareerAIPurpose(name))throw new AIUnavailableError('Unsupported CareerOS AI operation.');
 if(!input.length||input.length>12||
    input.some(m=>m.role!=='user'&&m.role!=='assistant')||
    !Number.isInteger(maxOutputTokens)||maxOutputTokens<1||maxOutputTokens>900)
   throw new AIUnavailableError('Invalid CareerOS AI input.');
 let cfg:ReturnType<typeof localModelConfiguration>;
 try{cfg=localModelConfiguration();}
 catch(e){throw new AIUnavailableError(e instanceof LocalModelConfigurationError?e.message:'Self-hosted AI is not configured.');}
 const request={
  model:cfg.model,
  messages:[
   {role:'system',content:instructions},
   ...input.map(item=>({role:item.role,content:item.content.slice(0,5000)})),
  ],
  stream:false,format:schema,think:false,
  options:{temperature:0.1,num_predict:maxOutputTokens,num_ctx:8192},
  keep_alive:'5m',
 };
 let response:Response;
 try{
  response=await fetch(cfg.origin+'/api/chat',{
   method:'POST',redirect:'manual',cache:'no-store',
   headers:{
    'Content-Type':'application/json',
    ...(cfg.authorization?{Authorization:cfg.authorization}:{}),
   },
   signal:AbortSignal.timeout(45000),
   body:JSON.stringify(request),
  });
 }catch{throw new AIUnavailableError('Private CareerOS model unavailable or timed out.');}
 if(response.status>=300&&response.status<400)
   throw new AIUnavailableError('Private model refused a redirect.');
 if(!response.ok)throw new AIUnavailableError('Private model gateway rejected the request ('+response.status+').');
 if(Number(response.headers.get('content-length')??'0')>65_536)
   throw new AIUnavailableError('Private model returned too much data.');
 let raw:string;
 try{raw=await response.text();}catch{throw new AIUnavailableError('Invalid self-hosted model response.');}
 if(raw.length>65_536)throw new AIUnavailableError('Private model returned too much data.');
 let obj:unknown;
 try{obj=JSON.parse(raw);}catch{throw new AIUnavailableError('Private model returned invalid JSON.');}
 if(!obj||typeof obj!=='object')throw new AIUnavailableError('Invalid self-hosted model response.');
 const json=obj as {done?:boolean;message?:{role?:string;content?:string}};
 if(json.done!==true||json.message?.role!=='assistant'||
   typeof json.message.content!=='string'||!json.message.content.trim())
   throw new AIUnavailableError('Private model output was incomplete.');
 try{return JSON.parse(json.message.content) as unknown;}
 catch{throw new AIUnavailableError('Private model did not return structured JSON.');}
}
