import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {extractText,identifyInput,cvParserHandler,MAX_CV_BYTES} from './cv-parser.mjs';
test('rejects bogus PDF/DOCX bytes and oversized documents before parsing',async()=>{
 assert.throws(()=>identifyInput(Buffer.from('not a pdf'),'pdf'));
 assert.throws(()=>identifyInput(Buffer.from('PK\x03\x04'),'pdf'));
 assert.throws(()=>identifyInput(Buffer.alloc(MAX_CV_BYTES+1),'docx'));
 await assert.rejects(()=>extractText(Buffer.from('%PDF-123'),'docx'));
 await assert.rejects(()=>extractText(Buffer.from('PK\x03\x04'),'docx'));
});
test('enforces PDF page and extracted-character limits',async()=>{
 const valid=Buffer.from('%PDF-1.4\nexample fixture');
 const loader=async()=>({
  getDocumentProxy:async()=>({numPages:2,destroy:async()=>{}}),
  extractText:async()=>({text:'Work Experience\nI maintained stock accuracy with cycle counts.'}),
 });
 assert.equal((await extractText(valid,'pdf',{pdfLoad:loader})).format,'pdf');
 const tooMany=async()=>({
  getDocumentProxy:async()=>({numPages:13,destroy:async()=>{}}),
  extractText:async()=>({text:'Should never reach extraction.'}),
 });
 await assert.rejects(()=>extractText(valid,'pdf',{pdfLoad:tooMany}),/page limit/);
});

function minimalTextPdf(message){
 const pieces=['%PDF-1.4\n'];
 const offsets=[0];
 const put=(id,data)=>{
  offsets[id]=Buffer.byteLength(pieces.join(''),'latin1');
  pieces.push(id+' 0 obj\n'+data+'\nendobj\n');
 };
 put(1,'<< /Type /Catalog /Pages 2 0 R >>');
 put(2,'<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
 put(3,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>');
 put(4,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
 const stream='BT /F1 12 Tf 72 720 Td ('+message+') Tj ET';
 put(5,'<< /Length '+Buffer.byteLength(stream,'latin1')+' >>\nstream\n'+stream+'\nendstream');
 const xref=Buffer.byteLength(pieces.join(''),'latin1');
 pieces.push('xref\n0 6\n0000000000 65535 f \n');
 for(let i=1;i<=5;i++)pieces.push(String(offsets[i]).padStart(10,'0')+' 00000 n \n');
 pieces.push('trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF\n');
 return Buffer.from(pieces.join(''),'latin1');
}
function crc32(input){
 let crc=0xffffffff;
 for(const byte of input){
  crc^=byte;
  for(let i=0;i<8;i++)crc=crc&1?((crc>>>1)^0xedb88320):(crc>>>1);
 }
 return (crc^0xffffffff)>>>0;
}
function minimalDocx(message){
 const files={
  '[Content_Types].xml':'<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
  '_rels/.rels':'<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
  'word/document.xml':'<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>'+message+'</w:t></w:r></w:p></w:body></w:document>',
 };
 const entries=[],central=[];let offset=0;
 for(const [name,contents] of Object.entries(files)){
  const nameBuf=Buffer.from(name,'utf8'),data=Buffer.from(contents,'utf8'),crc=crc32(data);
  const header=Buffer.alloc(30);
  header.writeUInt32LE(0x04034b50,0);header.writeUInt16LE(20,4);
  header.writeUInt32LE(crc,14);header.writeUInt32LE(data.length,18);
  header.writeUInt32LE(data.length,22);header.writeUInt16LE(nameBuf.length,26);
  entries.push(header,nameBuf,data);
  const c=Buffer.alloc(46);
  c.writeUInt32LE(0x02014b50,0);c.writeUInt16LE(20,4);c.writeUInt16LE(20,6);
  c.writeUInt32LE(crc,16);c.writeUInt32LE(data.length,20);c.writeUInt32LE(data.length,24);
  c.writeUInt16LE(nameBuf.length,28);c.writeUInt32LE(offset,42);
  central.push(c,nameBuf);
  offset+=header.length+nameBuf.length+data.length;
 }
 const centralData=Buffer.concat(central);
 const eocd=Buffer.alloc(22);
 eocd.writeUInt32LE(0x06054b50,0);
 eocd.writeUInt16LE(3,8);eocd.writeUInt16LE(3,10);
 eocd.writeUInt32LE(centralData.length,12);eocd.writeUInt32LE(offset,16);
 return Buffer.concat([...entries,centralData,eocd]);
}
test('extracts real text from an ordinary text-layer PDF using unpdf',async()=>{
 const file=minimalTextPdf('Work Experience I completed inventory checks and stock audits');
 const result=await extractText(file,'pdf');
 assert.match(result.text,/inventory checks/);
 assert.equal(result.format,'pdf');
});
test('extracts real text from an ordinary DOCX using mammoth',async()=>{
 const file=minimalDocx('Work Experience I completed inventory checks and stock audits');
 const result=await extractText(file,'docx');
 assert.match(result.text,/inventory checks/);
 assert.equal(result.format,'docx');
});

test('isolated parser accepts only structured requests',async()=>{
 const server=http.createServer(cvParserHandler({extract:async(bytes,format)=>({
  format,text:'Work Experience\nI performed inventory cycle counts at my workplace.',
 })}));
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const endpoint='http://127.0.0.1:'+server.address().port+'/extract';
 try{
  const rejected=await fetch(endpoint,{method:'GET'});
  assert.equal(rejected.status,404);
  const invalid=await fetch(endpoint,{method:'POST',
   body:Buffer.alloc(MAX_CV_BYTES+1),
   headers:{'content-type':'application/octet-stream','x-cv-format':'pdf'}});
  assert.equal(invalid.status,413);
  const good=await fetch(endpoint,{method:'POST',body:Buffer.from('%PDF-1.4\nminimal'),
   headers:{'content-type':'application/octet-stream','x-cv-format':'pdf'}});
  assert.equal(good.status,200);
  assert.match((await good.json()).text,/inventory cycle counts/);
 }finally{server.closeAllConnections();await new Promise(done=>server.close(done));}
});
