import {describe,it,expect,vi,afterEach} from 'vitest';
vi.mock('server-only',()=>({}));
describe('production CV extraction never parses binaries in app process',()=>{
 const backup={...process.env};
 afterEach(()=>{vi.unstubAllGlobals();process.env={...backup};});
 const document=()=>new File([Buffer.from('%PDF-1.4\nsample text-based pdf')],'career.pdf',{type:'application/pdf'});
 function configure(){
  process.env={...backup,NODE_ENV:'production',
   CV_SCAN_GATEWAY_URL:'https://scan.example.com',
   CV_SCAN_GATEWAY_TOKEN:'test-only-private-credential-0123456789'};
 }
 it('accepts only matching explicit clean + bounded parser output',async()=>{
  configure();
  const mock=vi.fn(async(_url:string,_opts:RequestInit)=>new Response(JSON.stringify({
   clean:true,format:'pdf',text:'Work Experience\nI maintained and audited inventory stock levels.',
  }),{status:200}));
  vi.stubGlobal('fetch',mock);
  const {extractScannedCv}=await import('../src/lib/career/cv-file');
  const result=await extractScannedCv(document());
  expect(result.format).toBe('pdf');
  expect(result.text).toContain('audited inventory');
  const [url,options]=mock.mock.calls[0];
  expect(url).toBe('https://scan.example.com/extract');
  expect((options.headers as Record<string,string>).Authorization).toMatch(/^Bearer /);
  expect((options.headers as Record<string,string>)['X-CV-Format']).toBe('pdf');
 });
 it('rejects a false clean claim, format mismatch or provider failure',async()=>{
  configure();
  const {extractScannedCv}=await import('../src/lib/career/cv-file');
  for(const payload of [
   {clean:false,format:'pdf',text:'I maintained inventory records successfully.'},
   {clean:true,format:'docx',text:'I maintained inventory records successfully.'},
   {clean:true,format:'pdf',text:'short'},
  ]){
   vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(payload),{status:200})));
   await expect(extractScannedCv(document())).rejects.toThrow();
  }
  vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify({clean:false}),{status:422})));
  await expect(extractScannedCv(document())).rejects.toThrow('failed secure scan');
 });
 it('fails closed when parser gateway is not configured',async()=>{
  process.env={...backup,NODE_ENV:'production',
   CV_SCAN_GATEWAY_URL:'',CV_SCAN_GATEWAY_TOKEN:''};
  const {extractScannedCv}=await import('../src/lib/career/cv-file');
  await expect(extractScannedCv(document())).rejects.toThrow('not configured');
 });
});
