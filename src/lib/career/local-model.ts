/**
 * Runtime settings for privately operated model weights and inference.
 * Never accept URL or token from browser forms or user model messages.
 */
export class LocalModelConfigurationError extends Error {}
export type LocalModelConfiguration={origin:string;model:string;authorization:string|null};
export function localModelConfiguration(env:NodeJS.ProcessEnv=process.env):LocalModelConfiguration{
 const raw=env.SELF_HOSTED_LLM_URL?.trim();
 if(!raw)throw new LocalModelConfigurationError('Self-hosted CareerOS model URL is not configured.');
 let url:URL;
 try{url=new URL(raw);}catch{throw new LocalModelConfigurationError('Invalid self-hosted model URL.');}
 if(url.pathname!=='/'||url.search||url.hash||url.username||url.password)
  throw new LocalModelConfigurationError('Model URL must be an origin without credentials, path or query.');
 const local=['localhost','127.0.0.1','[::1]'].includes(url.hostname);
 if(env.NODE_ENV==='production'){
  if(url.protocol!=='https:'||local||url.hostname.endsWith('.local')||/^[0-9.]+$/.test(url.hostname))
   throw new LocalModelConfigurationError('Production requires an HTTPS model gateway domain.');
 }else if(url.protocol!=='https:'&&!(url.protocol==='http:'&&local)){
  throw new LocalModelConfigurationError('HTTP is allowed only for development on loopback.');
 }
 const token=env.SELF_HOSTED_LLM_TOKEN?.trim()||null;
 if((!local||env.NODE_ENV==='production')&&(!token||token.length<24)){
  throw new LocalModelConfigurationError('Self-hosted gateway requires a strong server-side bearer token.');
 }
 if(token&&(/[\r\n]/.test(token)||token.length>1024))
  throw new LocalModelConfigurationError('Invalid private gateway credential.');
 const model=env.SELF_HOSTED_LLM_MODEL?.trim()||'qwen3:8b';
 if(!/^[a-zA-Z0-9_.:/-]{1,120}$/.test(model))
  throw new LocalModelConfigurationError('Invalid self-hosted model identifier.');
 return {origin:url.origin,model,authorization:token?'Bearer '+token:null};
}
export function localModelConfigured(env:NodeJS.ProcessEnv=process.env):boolean{
 try{localModelConfiguration(env);return true;}catch{return false;}
}
