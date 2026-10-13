/// <reference lib="webworker" />
import {
 identifyLocalCv,validateLocalDocxArchive,
 MAX_LOCAL_CV_PAGES,type LocalCvFormat,
} from '../lib/career/browser-cv-security';

type RequestPayload={buffer:ArrayBuffer;name:string};
type WorkerResult={format:LocalCvFormat;text:string};
const worker=self as DedicatedWorkerGlobalScope;

/** Browser-local parsing only: no network calls, AI SDK or Supabase. */
worker.onmessage=async({data}:MessageEvent<RequestPayload>)=>{
 try{
  if(!(data?.buffer instanceof ArrayBuffer)||typeof data.name!=='string')
   throw new Error('Invalid local document.');
  const binary=new Uint8Array(data.buffer);
  const format=identifyLocalCv(binary,data.name);
  let text='';
  if(format==='pdf'){
   const {getDocumentProxy,extractText}=await import('unpdf');
   const document=await getDocumentProxy(binary,{
    maxImageSize:4_194_304,isEvalSupported:false,stopAtErrors:true,
   });
   try{
    if(document.numPages<1||document.numPages>MAX_LOCAL_CV_PAGES)
     throw new Error('Only text-based PDFs of at most 12 pages are supported.');
    const result=await extractText(document,{mergePages:true});
    text=typeof result.text==='string'?result.text:'';
   }finally{await document.destroy?.();}
  }else{
   validateLocalDocxArchive(binary);
   const imported=await import('mammoth/mammoth.browser');
   const mammoth=imported.default??imported;
   const result=await mammoth.extractRawText({arrayBuffer:data.buffer});
   text=result.value;
  }
  const normalized=text.replace(/\0/g,'').replace(/\r\n?/g,'\n').trim();
  if(normalized.length<20)throw new Error('No readable text was found. Image-only PDFs require OCR.');
  if(normalized.length>100_000)throw new Error('Extracted document is excessively long. Select a shorter source.');
  const answer:WorkerResult={format,text:normalized};
  worker.postMessage({ok:true,result:answer});
 }catch(error){
  const message=error instanceof Error?error.message:'Document could not be read locally.';
  const permitted=/at most 2 MB|file signature|archive|DOCX|12 pages|No readable|4,000 characters|PDFs|Encrypted|unsupported|standard Word/.test(message);
  worker.postMessage({ok:false,error:permitted?message:'Could not read that document locally. Please try another text-based PDF/DOCX.'});
 }
};
