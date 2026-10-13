// Minimal private-network scanner adapter. No persistence, logs of file bytes,
// file names, or upload metadata. Caddy supplies HTTPS bearer authorization.
import http from 'node:http';
import net from 'node:net';

export const MAX_UPLOAD=2*1024*1024;
export async function scanWithClamd(bytes,{host='clamav',port=3310,timeout=15000}={}){
 if(!(bytes instanceof Buffer)||bytes.length<1||bytes.length>MAX_UPLOAD)
  throw new Error('Invalid file length');
 return new Promise((resolve,reject)=>{
  const socket=net.createConnection({host,port});
  let done=false,verdict='';
  const finish=(err,value)=>{
   if(done)return;done=true;socket.destroy();
   if(err)reject(err);else resolve(value);
  };
  socket.setTimeout(timeout,()=>finish(new Error('Scanner timeout')));
  socket.once('error',()=>finish(new Error('Scanner unavailable')));
  socket.once('connect',()=>{
   socket.write(Buffer.from('zINSTREAM\0'));
   for(let i=0;i<bytes.length;i+=65536){
    const chunk=bytes.subarray(i,i+65536);
    const n=Buffer.alloc(4);n.writeUInt32BE(chunk.length);
    socket.write(n);socket.write(chunk);
   }
   socket.write(Buffer.alloc(4));
  });
  socket.on('data',(chunk)=>{
   verdict+=chunk.toString('utf8');
   if(verdict.length>4096)return finish(new Error('Invalid scanner verdict'));
   if(verdict.includes('\0')||verdict.includes('\n')){
    finish(null, /^stream: OK(?:\r?\n|\0)?$/.test(verdict));
   }
  });
  socket.once('end',()=>finish(null,/^stream: OK(?:\r?\n|\0)?$/.test(verdict)));
 });
}
export function scannerHandler({scan=scanWithClamd}={}){
 return async(req,res)=>{
  const reply=(status,clean=false)=>{
   res.writeHead(status,{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'});
   res.end(JSON.stringify({clean}));
  };
  if(req.method!=='POST'||req.url!=='/scan'||req.headers['content-type']!=='application/octet-stream'){
   reply(404);return;
  }
  const length=Number(req.headers['content-length']||0);
  if(!Number.isSafeInteger(length)||length<1||length>MAX_UPLOAD){
   reply(413);req.resume();return;
  }
  let size=0;const chunks=[];
  try{
   for await(const chunk of req){
    size+=chunk.length;
    if(size>MAX_UPLOAD)throw new Error('Oversized document');
    chunks.push(chunk);
   }
   if(size!==length)throw new Error('Incomplete upload');
   const clean=await scan(Buffer.concat(chunks,size));
   reply(clean===true?200:422,clean===true);
  }catch{
   if(!res.writableEnded)reply(503);
  }
 };
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 const server=http.createServer(scannerHandler());
 server.requestTimeout=15000;
 server.headersTimeout=15000;
 server.listen(3088,'0.0.0.0');
}
