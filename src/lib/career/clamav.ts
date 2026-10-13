import 'server-only';
import { createConnection } from 'node:net';
import { isCleanClamAVVerdict } from './clamav-verdict';
import {scanGatewayConfig,scanGatewayConfigured} from './scan-gateway-config';

export class ScanFailed extends Error {}
export const MAX_SCAN_BYTES=2*1024*1024;

/**
 * Production Vercel runtime uses an authenticated HTTPS gateway; direct
 * clamd TCP is reserved for a trusted private local development network.
 * Neither path stores uploaded binary content or accepts an unknown verdict.
 */
export function scanningConfigured(){
 if(scanGatewayConfigured())return true;
 return process.env.NODE_ENV!=='production'&&Boolean(process.env.CLAMAV_HOST?.trim());
}
export async function scanDocument(data:Buffer):Promise<void>{
 if(!data.length||data.length>MAX_SCAN_BYTES)throw new ScanFailed('File must be between 1 byte and 2 MB.');
 if(process.env.CV_SCAN_GATEWAY_URL?.trim()){
  await scanViaGateway(data);
  return;
 }
 if(process.env.NODE_ENV==='production')
  throw new ScanFailed('Secure HTTPS scanner not configured: uploads disabled.');
 await scanViaPrivateClamd(data);
}
async function scanViaGateway(data:Buffer):Promise<void>{
 let config:ReturnType<typeof scanGatewayConfig>;
 try{config=scanGatewayConfig();}
 catch{throw new ScanFailed('Private scanner is not correctly configured.');}
 let response:Response;
 try{
  response=await fetch(config.url,{
   method:'POST',redirect:'manual',cache:'no-store',
   headers:{'Content-Type':'application/octet-stream',Authorization:config.authorization},
   body:new Uint8Array(data),signal:AbortSignal.timeout(30_000),
  });
 }catch{throw new ScanFailed('Secure antivirus scanner is unreachable or timed out.');}
 if(response.status>=300&&response.status<400)throw new ScanFailed('Antivirus scanner redirect rejected.');
 if(response.status!==200)throw new ScanFailed('File failed antivirus scanning or scanner was unavailable.');
 if(Number(response.headers.get('content-length')??'0')>256)throw new ScanFailed('Invalid scanner response.');
 let payload:unknown;
 try{
  const body=await response.text();
  if(body.length>256)throw new ScanFailed('Invalid scanner response.');
  payload=JSON.parse(body);
 }catch{throw new ScanFailed('Invalid scanner response.');}
 if(!payload||typeof payload!=='object'||Array.isArray(payload)||
    (payload as Record<string,unknown>).clean!==true)
  throw new ScanFailed('File did not pass verified antivirus scanning.');
}
async function scanViaPrivateClamd(data:Buffer):Promise<void>{
 const host=process.env.CLAMAV_HOST?.trim();
 const port=Number(process.env.CLAMAV_PORT||3310);
 if(!host||!Number.isInteger(port)||port<1||port>65535)
  throw new ScanFailed('Trusted local antivirus scanner is not configured.');
 const result=await new Promise<string>((resolve,reject)=>{
  const socket=createConnection({host,port});let result='';let finished=false;
  const end=(error?:Error,response?:string)=>{
   if(finished)return;finished=true;socket.destroy();
   if(error)reject(error);else resolve(response??'');
  };
  socket.setTimeout(8_000,()=>end(new ScanFailed('Virus scan timed out.')));
  socket.once('error',()=>end(new ScanFailed('Virus scanner could not be reached.')));
  socket.once('connect',()=>{
   socket.write(Buffer.from('zINSTREAM\0'));
   for(let i=0;i<data.length;i+=64*1024){
    const bytes=data.subarray(i,i+64*1024),size=Buffer.alloc(4);
    size.writeUInt32BE(bytes.length);socket.write(size);socket.write(bytes);
   }
   socket.write(Buffer.alloc(4));
  });
  socket.on('data',(part:Buffer)=>{
   result+=part.toString('utf8');
   if(result.length>4096)return end(new ScanFailed('Unexpected scanner verdict.'));
   if(result.includes('\0')||result.includes('\n'))end(undefined,result);
  });
  socket.once('end',()=>end(undefined,result));
 });
 if(!isCleanClamAVVerdict(result))
  throw new ScanFailed('File failed antivirus scanning or scanner result was inconclusive.');
}
