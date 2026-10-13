/**
 * Preflight DOCX central-directory bounds before decompressing any content.
 * This is not an antivirus scan or a full archive validator.
 */
export function validateDocxArchive(bytes: Uint8Array) {
 const buf=Buffer.from(bytes);
 const first=Math.max(0,buf.length-65_557);
 let eocd=-1;
 for(let i=buf.length-22;i>=first;i--){
  if(buf.readUInt32LE(i)===0x06054b50){eocd=i;break;}
 }
 if(eocd<0)throw new Error('DOCX has no valid ZIP directory.');
 const count=buf.readUInt16LE(eocd+10);
 const size=buf.readUInt32LE(eocd+12);
 const start=buf.readUInt32LE(eocd+16);
 if(!count||count>100||start+size>eocd||size>buf.length)throw new Error('Unsupported DOCX structure.');
 let pointer=start,totalExpanded=0;
 let hasTypes=false,hasDocument=false;
 for(let i=0;i<count;i++){
  if(pointer+46>eocd||buf.readUInt32LE(pointer)!==0x02014b50)
   throw new Error('Malformed DOCX ZIP directory.');
  const flags=buf.readUInt16LE(pointer+8);
  const compressed=buf.readUInt32LE(pointer+20);
  const expanded=buf.readUInt32LE(pointer+24);
  const filenameLength=buf.readUInt16LE(pointer+28);
  const extra=buf.readUInt16LE(pointer+30);
  const comment=buf.readUInt16LE(pointer+32);
  const next=pointer+46+filenameLength+extra+comment;
  if(next>eocd||flags&1||expanded>5_000_000||expanded>Math.max(1,compressed)*100)
   throw new Error('Encrypted or oversized DOCX entry rejected.');
  totalExpanded+=expanded;
  if(totalExpanded>8_000_000)throw new Error('DOCX expands beyond safe size.');
  const name=buf.subarray(pointer+46,pointer+46+filenameLength).toString('utf8');
  if(name==='[Content_Types].xml')hasTypes=true;
  if(name==='word/document.xml')hasDocument=true;
  if(name.toLowerCase().includes('vbaproject'))throw new Error('Macro-containing document rejected.');
  pointer=next;
 }
 if(!hasTypes||!hasDocument)throw new Error('DOCX missing required Word content.');
}
