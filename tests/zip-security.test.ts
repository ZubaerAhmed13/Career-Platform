import {describe,it,expect} from 'vitest';
import {validateDocxArchive} from '../src/lib/career/zip-security';

function fakeZip(entries:{name:string;compressed:number;expanded:number}[]){
 const chunks:Buffer[]=[];
 let size=0;
 for(const entry of entries){
  const filename=Buffer.from(entry.name);
  const central=Buffer.alloc(46+filename.length);
  central.writeUInt32LE(0x02014b50,0);
  central.writeUInt32LE(entry.compressed,20);
  central.writeUInt32LE(entry.expanded,24);
  central.writeUInt16LE(filename.length,28);
  filename.copy(central,46);
  chunks.push(central);size+=central.length;
 }
 const end=Buffer.alloc(22);
 end.writeUInt32LE(0x06054b50,0);
 end.writeUInt16LE(entries.length,8);end.writeUInt16LE(entries.length,10);
 end.writeUInt32LE(size,12);end.writeUInt32LE(0,16);
 return Buffer.concat([...chunks,end]);
}

describe('DOCX ZIP resource preflight',()=>{
 it('accepts a minimal bounded central directory',()=>{
  const doc=fakeZip([{name:'[Content_Types].xml',compressed:200,expanded:500},
   {name:'word/document.xml',compressed:500,expanded:2000}]);
  expect(()=>validateDocxArchive(doc)).not.toThrow();
 });
 it('rejects large or suspicious expansion and missing Word content',()=>{
  expect(()=>validateDocxArchive(fakeZip([{name:'word/document.xml',compressed:1,expanded:3_000_000},
   {name:'[Content_Types].xml',compressed:2,expanded:20}]))).toThrow();
  expect(()=>validateDocxArchive(fakeZip([{name:'file.txt',compressed:10,expanded:20}]))).toThrow();
 });
 it('rejects macro-containing documents',()=>{
  expect(()=>validateDocxArchive(fakeZip([{name:'[Content_Types].xml',compressed:100,expanded:100},
   {name:'word/document.xml',compressed:100,expanded:100},
   {name:'word/vbaProject.bin',compressed:100,expanded:100}]))).toThrow();
 });
});
