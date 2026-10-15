'use client';
import {useEffect,useRef,useState,useTransition,type FormEvent} from 'react';
import {useRouter} from 'next/navigation';
import {importBrowserCvText} from '@/app/actions/career-local-import';
import {careerKinds,kindLabels,type CareerKind} from '@/lib/career/schema';
import {MAX_LOCAL_CV_BYTES,MAX_LOCAL_CV_TEXT,type LocalCvFormat} from '@/lib/career/browser-cv-security';
import {planCvReviewParts,type CvReviewPart} from '@/lib/career/cv-review-parts';

type ExtractResult={format:LocalCvFormat;text:string};
type LocalWorkerMessage={careerCvReply:true;ok:boolean;result?:ExtractResult;error?:string};

/** Never transmits document bytes: the worker reads only on this device. */
function extractLocally(file:File,attach:(worker:Worker|null,completedWorker?:Worker)=>void):Promise<ExtractResult>{
 return new Promise((resolve,reject)=>{
  const worker=new Worker(new URL('../../workers/browser-cv.worker.ts',import.meta.url),{type:'module'});
  attach(worker);
  let complete=false;
  const settle=(error?:Error,result?:ExtractResult)=>{
   if(complete)return;
   complete=true;clearTimeout(timer);worker.terminate();attach(null,worker);
   if(error)reject(error);else if(result)resolve(result);
  };
  const timer=setTimeout(()=>settle(new Error('Local extraction took too long. Try a smaller file.')),30_000);
  worker.onmessage=(event:MessageEvent<LocalWorkerMessage>)=>{
   const message=event.data;
   if(message?.careerCvReply!==true||typeof message.ok!=='boolean')return;
   if(message.ok&&message.result)settle(undefined,message.result);
   else settle(new Error(message.error||'Local document extraction failed.'));
  };
  worker.onerror=()=>settle(new Error('The local document reader encountered an error.'));
  file.arrayBuffer().then(bytes=>{
   if(complete)return;
   worker.postMessage({careerCvRequest:true,buffer:bytes,name:file.name},[bytes]);
  }).catch(()=>settle(new Error('Could not read the document from your device.')));
 });
}

export function BrowserCvImport(){
 const [file,setFile]=useState<File|null>(null);
 const [format,setFormat]=useState<LocalCvFormat|null>(null);
 const [parts,setParts]=useState<CvReviewPart[]>([]);
 const [selected,setSelected]=useState(0);
 const [saved,setSaved]=useState<number[]>([]);
 const [status,setStatus]=useState<'idle'|'reading'|'ready'|'error'>('idle');
 const [problem,setProblem]=useState('');
 const [notice,setNotice]=useState('');
 const [kind,setKind]=useState<CareerKind>('experience');
 const [pending,startTransition]=useTransition();
 const workerRef=useRef<Worker|null>(null);
 const readerGeneration=useRef(0);
 const router=useRouter();
 useEffect(()=>()=>{workerRef.current?.terminate();},[]);
 async function readFile(){
  if(!file){setProblem('Choose a PDF or DOCX first.');return;}
  if(file.size===0||file.size>MAX_LOCAL_CV_BYTES){
   setProblem('Choose a PDF or DOCX of at most 2 MB.');setStatus('error');return;
  }
  const generation=++readerGeneration.current;
  setStatus('reading');setProblem('');setNotice('');setParts([]);setSaved([]);setSelected(0);setFormat(null);
  try{
   const result=await extractLocally(file,(worker,completedWorker)=>{
    if(!completedWorker||workerRef.current===completedWorker)workerRef.current=worker;
   });
   if(generation!==readerGeneration.current)return;
   const planned=planCvReviewParts(result.text);
   setParts(planned);setFormat(result.format);setStatus('ready');
  }catch(error){
   if(generation!==readerGeneration.current)return;
   setStatus('error');setProblem(error instanceof Error?error.message:'Local extraction failed.');
  }
 }
 const selectedPart=parts[selected];
 const text=selectedPart?.text??'';
 const tooLong=text.length>MAX_LOCAL_CV_TEXT;
 const valid=status==='ready'&&text.trim().length>=20&&!tooLong&&!saved.includes(selected);
 const allSaved=parts.length>0&&saved.length===parts.length;
 function submitReview(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(!valid||pending)return;
  const data=new FormData(event.currentTarget);
  const partIndex=selected;
  setProblem('');setNotice('');
  startTransition(async()=>{
   try{
    const result=await importBrowserCvText({},data);
    if(result.error){setProblem(result.error);return;}
    if(result.message){
     const nextSaved=[...new Set([...saved,partIndex])];
     setSaved(nextSaved);
     setNotice(result.message);
     router.refresh();
     const next=parts.findIndex((_,i)=>!nextSaved.includes(i));
     if(next>=0)setSelected(next);
    }
   }catch{setProblem('Could not save this section. Please retry; your text is still on this device.');}
  });
 }
 return <section className="card stack" id="local-cv-import">
  <p className="eyebrow">Browser-only document reading · no AI required</p>
  <h2>Import a complete PDF or DOCX, section by section</h2>
  <p className="subtle">The original file stays on your device in a temporary browser worker. Review each section before explicitly sending its text to your private Supabase review queue. No document bytes are uploaded, and imported claims never become confirmed without your approval.</p>
  <div className="form-row">
   <label className="label" htmlFor="local-cv-file">Choose PDF or DOCX (up to 2 MB)</label>
   <input className="field" id="local-cv-file" type="file"
    accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    onChange={event=>{
     ++readerGeneration.current;workerRef.current?.terminate();workerRef.current=null;
     setFile(event.target.files?.[0]??null);setStatus('idle');setProblem('');
     setParts([]);setSaved([]);setSelected(0);setFormat(null);setNotice('');
    }}/>
  </div>
  <button type="button" className="button secondary"
   disabled={!file||status==='reading'||pending} onClick={readFile}>
   {status==='reading'?'Reading on your device…':'Extract text locally'}
  </button>
  <p className="subtle" role="status" aria-live="polite">
   {status==='reading'?'Reading your document locally; no upload is taking place.':
    status==='ready'?'Local extraction complete: '+format?.toUpperCase()+'. '+parts.length+' review '+(parts.length===1?'part':'parts')+' prepared.':
    'Text-based PDFs up to 12 pages and standard DOCX files work; image-only scans need OCR (not currently available).'}
  </p>
  {status==='ready'&&parts.length>0&&<>
   <div className="muted-card" role="status" aria-live="polite">
    <strong>{saved.length} of {parts.length} parts saved to the pending review queue</strong>
    <div role="progressbar" aria-label="CV review parts saved" aria-valuemin={0}
     aria-valuemax={parts.length} aria-valuenow={saved.length}
     style={{background:'var(--line)',height:9,borderRadius:9,marginTop:10,overflow:'hidden'}}>
      <div style={{width:(saved.length/parts.length*100)+'%',height:'100%',background:'var(--accent)'}}/>
    </div>
    <p className="subtle">Progress is kept on this page until you leave or reload. Saved suggestions persist in your account; unsaved edits do not. Import volume is limited to 30 proposals per hour.</p>
   </div>
   <div className="form-row">
    <label className="label" htmlFor="local-cv-section">Review part</label>
    <select className="field" id="local-cv-section" value={selected} disabled={pending}
     onChange={e=>{setSelected(Number(e.target.value));setProblem('');setNotice('');}}>
     {parts.map((part,i)=><option key={i} value={i}>{part.label}{saved.includes(i)?' — saved':''}</option>)}
    </select>
   </div>
   <form onSubmit={submitReview} className="stack">
    <div className="form-row">
     <label className="label" htmlFor="local-cv-preview">Review and edit {selectedPart.label}</label>
     <textarea id="local-cv-preview" className="field" name="resume_text" rows={10}
      value={text} disabled={saved.includes(selected)||pending}
      onChange={event=>setParts(previous=>previous.map((part,i)=>i===selected?{...part,text:event.target.value}:part))} required/>
     <p className={tooLong?'error':'subtle'}>{text.length.toLocaleString()} / {MAX_LOCAL_CV_TEXT.toLocaleString()} characters in this part.
      {tooLong?' Shorten this part before saving.':''}</p>
    </div>
    <div className="form-row">
     <label className="label" htmlFor="local-cv-kind">Category if no section heading is present</label>
     <select id="local-cv-kind" className="field" name="kind" value={kind}
      disabled={pending||saved.includes(selected)}
      onChange={event=>setKind(event.target.value as CareerKind)}>
      {careerKinds.map(k=><option value={k} key={k}>{kindLabels[k]}</option>)}
     </select>
    </div>
    <p className="subtle">Section headings are used conservatively. The server creates at most 20 source-backed candidates per part and refuses overflowing sections rather than silently discarding facts. Split long lists into smaller reviews if prompted.</p>
    {!saved.includes(selected)&&<>
     <label><input type="checkbox" name="confirm_source" value="yes" required/> I have permission to use this CV text.</label>
     <label><input type="checkbox" name="confirm_review" value="yes" required/> I understand only this edited text is sent to Supabase and every claim needs approval.</label>
     <button className="button" disabled={!valid||pending}>{pending?'Saving draft facts…':'Save selected text to my review queue'}</button>
    </>}
    {saved.includes(selected)&&<p className="success">This part was submitted for review. Check pending suggestions below before approving any facts.</p>}
   </form>
   <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
    <button type="button" className="button secondary" disabled={selected===0||pending} onClick={()=>setSelected(i=>i-1)}>Previous part</button>
    <button type="button" className="button secondary" disabled={selected===parts.length-1||pending} onClick={()=>setSelected(i=>i+1)}>Next part</button>
   </div>
   {allSaved&&<p className="success" role="status">All parts were submitted for review. No imported fact has been automatically confirmed.</p>}
  </>}
  {problem&&<p className="error" role="alert">{problem}</p>}
  {notice&&<p className="success" role="status">{notice}</p>}
  <p className="subtle">Security note: browser extraction is not malware scanning. Only use documents you trust; keep the review tab open until all intended parts are submitted. This flow needs neither hosting changes nor an AI model.</p>
 </section>;
}
