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
