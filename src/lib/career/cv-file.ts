import 'server-only';
import { scanDocument } from './clamav';
import { scanGatewayConfig,scanGatewayConfigured } from './scan-gateway-config';
import { validateDocxArchive } from './zip-security';
import { identifyCv, MAX_CV_BYTES, type CvFormat } from './cv-format';

/**
 * In production every scanned CV is parsed on a separate restricted worker.
 * The Vercel process never opens the untrusted PDF/DOCX archive itself.
 */
export async function extractScannedCv(file:File):Promise<{text:string;format:CvFormat}>{
 if(file.size===0||file.size>MAX_CV_BYTES)throw new Error('File must be between 1 byte and 2 MB.');
 const bytes=Buffer.from(await file.arrayBuffer());
 const format=identifyCv(bytes,file.name);
 if(scanGatewayConfigured())return extractPrivateCv(bytes,format);
 if(process.env.NODE_ENV==='production')
  throw new Error('Private sandboxed CV scanning and extraction is not configured.');
 // Nonproduction-only fallback for integration testing with local clamd.
 await scanDocument(bytes);
 return extractDevelopmentCv(bytes,format);
}
async function extractPrivateCv(bytes:Buffer,format:CvFormat){
 const config=scanGatewayConfig();
 let response:Response;
 try{
  response=await fetch(config.extractUrl,{
   method:'POST',redirect:'manual',cache:'no-store',
   headers:{
    'Content-Type':'application/octet-stream',
    'X-CV-Format':format,
    Authorization:config.authorization,
   },
   body:new Uint8Array(bytes),
   signal:AbortSignal.timeout(45_000),
  });
 }catch{throw new Error('Private CV scanner/parser is unreachable or timed out.');}
 if(response.status>=300&&response.status<400)throw new Error('Private parser redirect rejected.');
 if(response.status!==200)throw new Error('File failed secure scan or isolated extraction.');
 if(Number(response.headers.get('content-length')||'0')>20_000)
  throw new Error('Invalid private extraction response.');
 let data:unknown;
 try{
  const text=await response.text();
  if(text.length>20_000)throw new Error('Response too large');
  data=JSON.parse(text);
 }catch{throw new Error('Invalid private extraction response.');}
 if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('Invalid private extraction response.');
 const result=data as {clean?:unknown;format?:unknown;text?:unknown};
 if(result.clean!==true||result.format!==format||typeof result.text!=='string')
  throw new Error('Private extraction did not provide a verified clean result.');
 const extracted=result.text.replace(/\0/g,'').trim();
 if(extracted.length<20||extracted.length>4000)
  throw new Error('Extracted text exceeds the safe 20–4,000 character review limit.');
 return {text:extracted,format};
}
async function extractDevelopmentCv(bytes:Buffer,format:CvFormat){
 let text='';
 if(format==='pdf'){
  const {getDocumentProxy,extractText}=await import('unpdf');
  const document=await getDocumentProxy(new Uint8Array(bytes),{maxImageSize:4_194_304});
  try{
   if(document.numPages<1||document.numPages>12)throw new Error('PDF must contain at most 12 pages.');
   const extracted=await extractText(document,{mergePages:true});
   text=typeof extracted.text==='string'?extracted.text:'';
  }finally{await (document as unknown as {destroy?:()=>Promise<void>}).destroy?.();}
 }else{
  validateDocxArchive(bytes);
  const mammoth=await import('mammoth');
  text=(await mammoth.extractRawText({buffer:bytes})).value;
 }
 const normalized=text.replace(/\0/g,'').trim();
 if(normalized.length<20)throw new Error('No readable text found. Scanned/image-only PDFs are not yet supported.');
 if(normalized.length>4000)throw new Error('Extracted text exceeds the 4,000-character review limit. Please import a shorter CV section.');
 return {text:normalized,format};
}
