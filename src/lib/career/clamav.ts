import 'server-only';
import { createConnection } from 'node:net';

// Never parse files from users without an actual reachable malware scanner.
// CLAMAV_HOST must point to a trusted *internal* scanner; do not expose it
// publicly or configure it to accept network traffic from arbitrary clients.
export class ScanFailed extends Error {}
export function scanningConfigured() {
  return Boolean(process.env.CLAMAV_HOST?.trim());
}

export async function scanDocument(data: Buffer): Promise<void> {
  const host=process.env.CLAMAV_HOST?.trim();
  const port=Number(process.env.CLAMAV_PORT || 3310);
  if(!host || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new ScanFailed('Virus scanner not configured: uploads are disabled.');
  }
  if(data.length===0 || data.length>2*1024*1024) throw new ScanFailed('File is too large.');

  const result=await new Promise<string>((resolve,reject)=>{
    const socket=createConnection({host,port});
    let buffer='';
    let completed=false;
    const end=(error?:Error,response?:string)=>{
      if(completed)return;
      completed=true;
      socket.destroy();
      if(error)reject(error);
      else resolve(response??'');
    };
    socket.setTimeout(8_000,()=>end(new ScanFailed('Virus scan timed out.')));
    socket.once('error',()=>end(new ScanFailed('Virus scanner could not be reached.')));
    socket.once('connect',()=>{
      // ClamAV clamd protocol: zINSTREAM\0 followed by big-endian lengths.
      socket.write(Buffer.from('zINSTREAM\0'));
      for(let start=0;start<data.length;start+=64*1024){
        const chunk=data.subarray(start,start+64*1024);
        const len=Buffer.alloc(4);
        len.writeUInt32BE(chunk.length);
        socket.write(len);
        socket.write(chunk);
      }
      socket.write(Buffer.alloc(4));
    });
    socket.on('data',(part:Buffer)=>{
      buffer+=part.toString('utf8');
      if(buffer.length>4096)return end(new ScanFailed('Unexpected virus scanner response.'));
      if(buffer.includes('\0')||buffer.includes('\n'))end(undefined,buffer);
    });
    socket.once('end',()=>end(undefined,buffer));
  });
  if(!/(?:^|\n|^stream: )stream: OK\b|stream: OK\b/.test(result) || result.includes('FOUND')) {
    throw new ScanFailed('File failed antivirus scanning or scanner result was inconclusive.');
  }
}
