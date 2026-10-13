import {describe,it,expect,vi,afterEach} from 'vitest';
import {scanGatewayConfig,scanGatewayConfigured} from '../src/lib/career/scan-gateway-config';
vi.mock('server-only',()=>({}));
const settings=(extra:Record<string,string|undefined>={})=>({
 CV_SCAN_GATEWAY_URL:'https://scan.example.com',
 CV_SCAN_GATEWAY_TOKEN:'test-token-longer-than-32-characters-do-not-use',
 ...extra,
} as NodeJS.ProcessEnv);
describe('scanner gateway config',()=>{
 it('requires a strong token and HTTPS DNS-only origin',()=>{
  expect(scanGatewayConfig(settings()).url).toBe('https://scan.example.com/scan');
  for(const config of [
   {CV_SCAN_GATEWAY_TOKEN:''},{CV_SCAN_GATEWAY_URL:'http://scan.example.com'},
   {CV_SCAN_GATEWAY_URL:'https://localhost'},
   {CV_SCAN_GATEWAY_URL:'https://127.0.0.1:3310'},
   {CV_SCAN_GATEWAY_URL:'https://scan.example.com/api'},
   {CV_SCAN_GATEWAY_URL:'https://user:pass@scan.example.com'},
  ])expect(scanGatewayConfigured(settings(config))).toBe(false);
 });
});
describe('HTTPS gateway scan fail-closed',()=>{
 const original={...process.env};
 afterEach(()=>{vi.unstubAllGlobals();process.env={...original};});
 it('requires clean:true from verified 200 response only',async()=>{
  process.env={...original,...settings(),NODE_ENV:'production'};
  const {scanDocument}=await import('../src/lib/career/clamav');
  for(const [status,clean,valid] of [
   [200,true,true],[200,false,false],[422,false,false],[503,false,false],
  ] as const){
   vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify({clean}),{status})));
   if(valid)await expect(scanDocument(Buffer.from('test'))).resolves.toBeUndefined();
   else await expect(scanDocument(Buffer.from('test'))).rejects.toThrow();
  }
  vi.stubGlobal('fetch',vi.fn(async()=>new Response('',{status:302,headers:{location:'https://untrusted.example'}})));
  await expect(scanDocument(Buffer.from('test'))).rejects.toThrow('redirect');
 });
 it('rejects scanner outage and uploads over 2 MiB',async()=>{
  process.env={...original,...settings(),NODE_ENV:'production'};
  const {scanDocument}=await import('../src/lib/career/clamav');
  vi.stubGlobal('fetch',vi.fn(async()=>{throw Error('down')}));
  await expect(scanDocument(Buffer.from('test'))).rejects.toThrow('unreachable');
  await expect(scanDocument(Buffer.alloc(2*1024*1024+1))).rejects.toThrow('2 MB');
 });
});
