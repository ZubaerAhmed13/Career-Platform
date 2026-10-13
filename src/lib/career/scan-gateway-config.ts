/** Protected HTTPS scan service used from stateless web hosting (e.g. Vercel). */
export class ScanGatewayConfigurationError extends Error {}
export type ScanGatewayConfig={url:string;extractUrl:string;authorization:string};
export function scanGatewayConfig(env:NodeJS.ProcessEnv=process.env):ScanGatewayConfig{
 const value=env.CV_SCAN_GATEWAY_URL?.trim();
 const token=env.CV_SCAN_GATEWAY_TOKEN?.trim();
 if(!value)throw new ScanGatewayConfigurationError('Private HTTPS scanner URL is not configured.');
 let url:URL;
 try{url=new URL(value);}catch{throw new ScanGatewayConfigurationError('Invalid private scan gateway URL.');}
 if(url.protocol!=='https:'||url.username||url.password||url.hash||url.search||
   url.pathname!=='/'||url.hostname==='localhost'||url.hostname==='127.0.0.1'||
   /^\d{1,3}(?:\.\d{1,3}){3}$/.test(url.hostname)||
   url.hostname.endsWith('.local'))
   throw new ScanGatewayConfigurationError('Scanner must use a valid HTTPS DNS origin with no credentials or path.');
 if(!token||token.length<32||token.length>1024||/[\r\n]/.test(token))
  throw new ScanGatewayConfigurationError('Private scanner gateway token is missing or invalid.');
 return {url:url.origin+'/scan',extractUrl:url.origin+'/extract',authorization:'Bearer '+token};
}
export function scanGatewayConfigured(env:NodeJS.ProcessEnv=process.env):boolean{
 try{scanGatewayConfig(env);return true;}catch{return false;}
}
