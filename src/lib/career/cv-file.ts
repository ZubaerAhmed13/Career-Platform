import 'server-only';
import { scanDocument } from './clamav';
import { validateDocxArchive } from './zip-security';

import { identifyCv, MAX_CV_BYTES } from './cv-format';

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
