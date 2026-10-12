import 'server-only';
import { scanDocument } from './clamav';
import { validateDocxArchive } from './zip-security';

export const MAX_CV_BYTES=2*1024*1024;
export type CvFormat='pdf'|'docx';

export function identifyCv(bytes: Uint8Array, filename:string):CvFormat {
  const extension=filename.toLowerCase().split('.').pop();
  if(bytes.length===0||bytes.length>MAX_CV_BYTES)throw new Error('Upload must be 2 MB or smaller.');
  const pdf=bytes.length>=5&&Buffer.from(bytes.subarray(0,5)).toString('ascii')==='%PDF-';
  const zip=bytes.length>=4&&bytes[0]===0x50&&bytes[1]===0x4b&&bytes[2]===0x03&&bytes[3]===0x04;
  if(extension==='pdf'&&pdf)return 'pdf';
  if(extension==='docx'&&zip)return 'docx';
  throw new Error('Only matching PDF or DOCX documents are supported.');
}

export async function extractScannedCv(file:File){
  if(file.size===0||file.size>MAX_CV_BYTES)throw new Error('File must be between 1 byte and 2 MB.');
  const bytes=Buffer.from(await file.arrayBuffer());
  const format=identifyCv(bytes,file.name);
  // Fail-closed: no parsing, text extraction or persistence without clean scan.
  await scanDocument(bytes);
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
    const result=await mammoth.extractRawText({buffer:bytes});
    text=result.value;
  }
  const normalized=text.replace(/\0/g,'').trim();
  if(normalized.length<20)throw new Error('No readable text found. Scanned/image-only PDFs are not yet supported.');
  if(normalized.length>4000)throw new Error('Extracted text exceeds the 4,000-character review limit. Please import a shorter CV section.');
  return {text:normalized,format};
}
