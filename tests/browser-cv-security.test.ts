import {describe,it,expect} from 'vitest';
import {
 MAX_LOCAL_CV_BYTES,identifyLocalCv,validateLocalDocxArchive,validateLocalCvText,
} from '../src/lib/career/browser-cv-security';

function sampleDocx(){
 const names=['[Content_Types].xml','word/document.xml'];
 const parts:Buffer[]=[],central:Buffer[]=[];
 let offset=0;
 for(const name of names){
  const str=Buffer.from(name),data=Buffer.from('<document>Career text</document>');
  const local=Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50,0);
  local.writeUInt16LE(20,4);
  local.writeUInt32LE(data.length,18);local.writeUInt32LE(data.length,22);
  local.writeUInt16LE(str.length,26);
  parts.push(local,str,data);
  const cd=Buffer.alloc(46);
  cd.writeUInt32LE(0x02014b50,0);
  cd.writeUInt16LE(20,4);cd.writeUInt16LE(20,6);
  cd.writeUInt32LE(data.length,20);cd.writeUInt32LE(data.length,24);
  cd.writeUInt16LE(str.length,28);cd.writeUInt32LE(offset,42);
  central.push(cd,str);
  offset+=local.length+str.length+data.length;
 }
 const directory=Buffer.concat(central);
 const eocd=Buffer.alloc(22);
 eocd.writeUInt32LE(0x06054b50,0);
 eocd.writeUInt16LE(names.length,8);eocd.writeUInt16LE(names.length,10);
 eocd.writeUInt32LE(directory.length,12);eocd.writeUInt32LE(offset,16);
 return new Uint8Array(Buffer.concat([...parts,directory,eocd]));
}
describe('browser-local file preflight, before any upload',()=>{
 it('accepts PDF or DOCX only when magic bytes and extension agree',()=>{
  expect(identifyLocalCv(new Uint8Array(Buffer.from('%PDF-1.4\nexample')),'CV.PDF')).toBe('pdf');
  const docx=sampleDocx();
  expect(identifyLocalCv(docx,'resume.docx')).toBe('docx');
  expect(()=>identifyLocalCv(docx,'resume.pdf')).toThrow('signature');
  expect(()=>identifyLocalCv(new Uint8Array(Buffer.from('not-a-pdf')),'resume.pdf')).toThrow();
  expect(()=>identifyLocalCv(new Uint8Array(Buffer.alloc(MAX_LOCAL_CV_BYTES+1)),'resume.docx')).toThrow('2 MB');
 });
 it('preflights the DOCX directory and rejects missing Word XML or zip bombs',()=>{
  expect(()=>validateLocalDocxArchive(sampleDocx())).not.toThrow();
  const modified=sampleDocx();
  const view=new DataView(modified.buffer);
  // First central directory expanded-size field is changed to >5 MB.
  const start=view.getUint32(modified.length-6,true);
  view.setUint32(start+24,6_000_000,true);
  expect(()=>validateLocalDocxArchive(modified)).toThrow('oversized');
  const invalid=new Uint8Array([80,75,3,4,0,0,0,0]);
  expect(()=>validateLocalDocxArchive(invalid)).toThrow();
 });
 it('rejects unreadable and oversize extracted text before persistence',()=>{
  expect(validateLocalCvText('  Work Experience\nI monitored stock accuracy.\r\n'))
   .toContain('I monitored stock accuracy.');
  expect(()=>validateLocalCvText('image')).toThrow('No readable');
  expect(()=>validateLocalCvText('A'.repeat(4001))).toThrow('4,000');
 });
});
