/**
 * Isolated, non-privileged CV text extraction service.
 * Reachable ONLY from the scanning adapter over a Docker-internal network.
 * The caller MUST scan the document with ClamAV before invoking this worker.
 */
import http from 'node:http';

export const MAX_CV_BYTES=2*1024*1024;
export const MAX_EXTRACTED_CHARS=4000;

export function identifyInput(bytes,format){
 if(!Buffer.isBuffer(bytes)||bytes.length<1||bytes.length>MAX_CV_BYTES)
  throw new Error('File must be 1 byte–2 MiB.');
 if(format==='pdf'&&bytes.subarray(0,5).toString('ascii')==='%PDF-')return 'pdf';
 if(format==='docx'&&bytes.length>=4&&bytes[0]===0x50&&bytes[1]===0x4b&&bytes[2]===3&&bytes[3]===4)return 'docx';
 throw new Error('PDF/DOCX file signature does not match category.');
}
export function validateDocxArchive(bytes){
 if(bytes.length<22)throw new Error('Invalid DOCX archive.');
 const start=Math.max(0,bytes.length-65557);
 let eocd=-1;
 for(let i=bytes.length-22;i>=start;i--){
  if(bytes.readUInt32LE(i)===0x06054b50){eocd=i;break;}
 }
 if(eocd<0)throw new Error('DOCX has no valid ZIP directory.');
 const count=bytes.readUInt16LE(eocd+10),
       size=bytes.readUInt32LE(eocd+12),
       directory=bytes.readUInt32LE(eocd+16);
 if(count<1||count>100||directory+size>eocd)throw new Error('DOCX structure too large.');
 let offset=directory,total=0,types=false,document=false;
 for(let i=0;i<count;i++){
  if(offset+46>eocd||bytes.readUInt32LE(offset)!==0x02014b50)
   throw new Error('Invalid DOCX directory entry.');
  const flags=bytes.readUInt16LE(offset+8),compressed=bytes.readUInt32LE(offset+20),
   uncompressed=bytes.readUInt32LE(offset+24),fileNameLen=bytes.readUInt16LE(offset+28),
   extra=bytes.readUInt16LE(offset+30),comment=bytes.readUInt16LE(offset+32),
   next=offset+46+fileNameLen+extra+comment;
  if(next>eocd||(flags&1)||uncompressed>5_000_000||
    uncompressed>Math.max(1,compressed)*100)throw new Error('Suspicious DOCX entry rejected.');
  total+=uncompressed;
  if(total>8_000_000)throw new Error('Expanded DOCX size limit exceeded.');
  const name=bytes.subarray(offset+46,offset+46+fileNameLen).toString('utf8');
  if(name==='[Content_Types].xml')types=true;
  if(name==='word/document.xml')document=true;
  if(name.toLocaleLowerCase().includes('vbaproject'))throw new Error('Macro-containing DOCX rejected.');
  offset=next;
 }
 if(!types||!document)throw new Error('DOCX is missing Word text content.');
}
export async function extractText(bytes,format,{pdfLoad,docxLoad}={}){
 const type=identifyInput(bytes,format);
 let text='';
 if(type==='pdf'){
  const {getDocumentProxy,extractText}=pdfLoad?await pdfLoad():await import('unpdf');
  const document=await getDocumentProxy(new Uint8Array(bytes),{maxImageSize:4194304});
  try{
   if(document.numPages<1||document.numPages>12)throw new Error('PDF page limit exceeded.');
   const response=await extractText(document,{mergePages:true});
   text=typeof response.text==='string'?response.text:'';
  }finally{await document.destroy?.();}
 }else{
  validateDocxArchive(bytes);
  const imported=docxLoad?await docxLoad():await import('mammoth');
  const mammoth=imported.default??imported;
  text=(await mammoth.extractRawText({buffer:bytes})).value;
 }
 const normalized=text.replace(/\0/g,'').trim();
 if(normalized.length<20||normalized.length>MAX_EXTRACTED_CHARS)
  throw new Error('Extracted CV text must contain 20–4,000 characters.');
 return {format:type,text:normalized};
}
export function cvParserHandler({extract=extractText}={}){
 return async(req,res)=>{
  const reply=(status,result)=>{
   res.writeHead(status,{
    'content-type':'application/json','cache-control':'no-store',
    'x-content-type-options':'nosniff',
   });
   res.end(JSON.stringify(result));
  };
  if(req.method!=='POST'||req.url!=='/extract'||
   req.headers['content-type']!=='application/octet-stream'){
   reply(404,{error:'Unavailable'});return;
  }
  const declared=Number(req.headers['content-length']||0),format=req.headers['x-cv-format'];
  if(!Number.isSafeInteger(declared)||declared<1||declared>MAX_CV_BYTES||
    (format!=='pdf'&&format!=='docx')){
   reply(413,{error:'Invalid document size or format.'});req.resume();return;
  }
  let count=0;const parts=[];
  try{
   for await(const chunk of req){
    count+=chunk.length;
    if(count>MAX_CV_BYTES)throw new Error('Document too large.');
    parts.push(chunk);
   }
   if(count!==declared)throw new Error('Document truncated.');
   const result=await extract(Buffer.concat(parts,count),format);
   if(!result||result.format!==format||typeof result.text!=='string'||
      result.text.length<20||result.text.length>MAX_EXTRACTED_CHARS)
     throw new Error('Extraction result invalid.');
   reply(200,result);
  }catch{
   if(!res.writableEnded)reply(422,{error:'Document extraction could not be completed safely.'});
  }
 };
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 const server=http.createServer(cvParserHandler());
 server.requestTimeout=20_000;
 server.headersTimeout=10_000;
 server.listen(3089,'0.0.0.0');
}
