/** Browser-safe PDF/DOCX checks. */
export const MAX_LOCAL_CV_BYTES=2*1024*1024;
export const MAX_LOCAL_CV_PAGES=12;
export const MAX_LOCAL_CV_TEXT=4000;
export type LocalCvFormat='pdf'|'docx';

export function identifyLocalCv(bytes:Uint8Array,filename:string):LocalCvFormat{
 if(bytes.length<1||bytes.length>MAX_LOCAL_CV_BYTES)
  throw new Error('Please select a PDF or DOCX of at most 2 MB.');
 const ext=filename.trim().toLowerCase().split('.').pop();
 const pdf=bytes.length>=5&&bytes[0]===37&&bytes[1]===80&&bytes[2]===68&&bytes[3]===70&&bytes[4]===45;
 const zip=bytes.length>=4&&bytes[0]===80&&bytes[1]===75&&bytes[2]===3&&bytes[3]===4;
 if(ext==='pdf'&&pdf)return 'pdf';
 if(ext==='docx'&&zip)return 'docx';
 throw new Error('The selected file extension and PDF/DOCX file signature do not match.');
}
export function validateLocalDocxArchive(bytes:Uint8Array):void{
 if(bytes.length<22)throw new Error('The DOCX archive is incomplete.');
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 const u16=(at:number)=>view.getUint16(at,true);
 const u32=(at:number)=>view.getUint32(at,true);
 let end=-1;
 for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--){
  if(u32(i)===0x06054b50){end=i;break;}
 }
 if(end<0)throw new Error('The DOCX ZIP directory is missing.');
 const count=u16(end+10),size=u32(end+12),start=u32(end+16);
 if(!count||count>100||start+size>end||size>bytes.length)
  throw new Error('DOCX archive exceeds supported structure limits.');
 let cursor=start,expanded=0,types=false,document=false;
 const decoder=new TextDecoder('utf-8',{fatal:true});
 for(let i=0;i<count;i++){
  if(cursor+46>end||u32(cursor)!==0x02014b50)
   throw new Error('Malformed DOCX archive directory.');
  const flags=u16(cursor+8),method=u16(cursor+10);
  const compressed=u32(cursor+20),uncompressed=u32(cursor+24);
  const length=u16(cursor+28),extra=u16(cursor+30),comment=u16(cursor+32);
  const next=cursor+46+length+extra+comment;
  if(next>end||(flags&1)||![0,8].includes(method)||uncompressed>5_000_000||
   uncompressed>Math.max(1,compressed)*100)
   throw new Error('Encrypted or oversized DOCX entries are not supported.');
  expanded+=uncompressed;
  if(expanded>8_000_000)throw new Error('Expanded DOCX limit exceeded.');
  const name=decoder.decode(bytes.subarray(cursor+46,cursor+46+length));
  if(name==='[Content_Types].xml')types=true;
  if(name==='word/document.xml')document=true;
  if(name.toLowerCase().includes('vbaproject')||
   name.startsWith('/')||name.includes('../')||name.includes('..\\'))
   throw new Error('DOCX contains unsupported or suspicious entries.');
  cursor=next;
 }
 if(!types||!document)throw new Error('This file does not contain a standard Word document.');
}
export function validateLocalCvText(text:string):string{
 const normalized=text.replace(/\0/g,'').replace(/\r\n?/g,'\n').trim();
 if(normalized.length<20)throw new Error('No readable text was found. Image-only PDFs need OCR, which is not available.');
 if(normalized.length>MAX_LOCAL_CV_TEXT)
  throw new Error('The extracted document is longer than 4,000 characters. Select a shorter CV section before saving.');
 return normalized;
}
