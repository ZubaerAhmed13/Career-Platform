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

