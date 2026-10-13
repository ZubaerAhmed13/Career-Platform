import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import http from 'node:http';
import {scannerHandler,scanWithClamd,MAX_UPLOAD} from './scan-server.mjs';

async function withFakeClamd(response,callback){
 const fake=net.createServer(s=>{
  s.on('data',(chunk)=>{if(chunk.includes(Buffer.alloc(4)))s.end(response);});
 });
 await new Promise(done=>fake.listen(0,'127.0.0.1',done));
 try{return await callback(fake.address().port);}finally{
  await new Promise(done=>fake.close(done));
 }
}
test('only an explicit ClamAV clean verdict is accepted',async()=>{
 for(const [verdict,expected] of [['stream: OK\0',true],['stream: Eicar-Test-Signature FOUND\0',false],['stream: read ERROR\0',false]]){
  await withFakeClamd(Buffer.from(verdict),async port=>{
   const clean=await scanWithClamd(Buffer.from('valid tiny file'),{host:'127.0.0.1',port});
   assert.equal(clean,expected);
  });
 }
});
test('HTTP handler permits clean small files only, with no original returned',async()=>{
 const handler=scannerHandler({scan:async bytes=>bytes.toString()==='clean'});
 const server=http.createServer(handler);
 await new Promise(done=>server.listen(0,'127.0.0.1',done));
 const url='http://127.0.0.1:'+server.address().port+'/scan';
 try{
  for(const [body,status] of [['clean',200],['infected',422]]){
   const res=await fetch(url,{method:'POST',headers:{'content-type':'application/octet-stream'},body});
   assert.equal(res.status,status);
   const data=await res.json();
   assert.equal(data.clean,status===200);
  }
  const empty=await fetch(url,{method:'POST',headers:{'content-type':'application/octet-stream'},body:''});
  assert.equal(empty.status,413);
  const large=await fetch(url,{method:'POST',headers:{'content-type':'application/octet-stream'},body:Buffer.alloc(MAX_UPLOAD+1)});
  assert.equal(large.status,413);
  const blocked=await fetch(url,{method:'GET'});
  assert.equal(blocked.status,404);
 }finally{
  server.closeAllConnections();
  await new Promise(done=>server.close(done));
 }
});
test('daemon unavailability fails closed',async()=>{
 const handler=scannerHandler({scan:async()=>{throw new Error('offline')}});
 const server=http.createServer(handler);
 await new Promise(done=>server.listen(0,'127.0.0.1',done));
 try{
  const res=await fetch('http://127.0.0.1:'+server.address().port+'/scan',{
   method:'POST',body:'some document',
   headers:{'content-type':'application/octet-stream'}});
  assert.equal(res.status,503);
  assert.equal((await res.json()).clean,false);
 }finally{
  server.closeAllConnections();
  await new Promise(done=>server.close(done));
 }
});

test('PDF/DOCX extraction goes to parser ONLY after a verified clean scan',async()=>{
 let parseCalls=0;
 const serve=async scan=>{
  const server=http.createServer(scannerHandler({
   scan,
   extract:async(_bytes,format)=>{
    parseCalls++;
    return {format,text:'Work Experience\nI performed accurate stock cycle counts.'};
   },
  }));
  await new Promise(done=>server.listen(0,'127.0.0.1',done));
  return server;
 };
 for(const isClean of [false,true]){
  const before=parseCalls;
  const server=await serve(async()=>isClean);
  try{
   const res=await fetch('http://127.0.0.1:'+server.address().port+'/extract',{
    method:'POST',body:'%PDF-1.4\nminimal',
    headers:{'content-type':'application/octet-stream','x-cv-format':'pdf'},
   });
   assert.equal(res.status,isClean?200:422);
   const result=await res.json();
   if(isClean){
    assert.equal(result.clean,true);
    assert.equal(result.format,'pdf');
    assert.match(result.text,/cycle counts/);
    assert.equal(parseCalls,before+1);
   }else{
    assert.equal(result.clean,false);
    assert.equal(parseCalls,before);
   }
  }finally{server.closeAllConnections();await new Promise(done=>server.close(done));}
 }
});
test('isolated parser failure never reports success',async()=>{
 const server=http.createServer(scannerHandler({
  scan:async()=>true,
  extract:async()=>{throw Error('worker timeout')},
 }));
 await new Promise(done=>server.listen(0,'127.0.0.1',done));
 try{
  const res=await fetch('http://127.0.0.1:'+server.address().port+'/extract',{
   method:'POST',body:'%PDF-1.4',
   headers:{'content-type':'application/octet-stream','x-cv-format':'pdf'},
  });
  assert.equal(res.status,503);
  assert.equal((await res.json()).clean,false);
 }finally{server.closeAllConnections();await new Promise(done=>server.close(done));}
});
