'use client';
import {useActionState,useEffect,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import {importBrowserCvText} from '@/app/actions/career-local-import';
import {careerKinds,kindLabels,type CareerKind} from '@/lib/career/schema';
import {MAX_LOCAL_CV_BYTES,MAX_LOCAL_CV_TEXT,type LocalCvFormat} from '@/lib/career/browser-cv-security';

type ExtractResult={format:LocalCvFormat;text:string};
type LocalWorkerMessage={careerCvReply:true;ok:boolean;result?:ExtractResult;error?:string};

/** This workflow NEVER submits file bytes to any endpoint or Supabase bucket. */
function extractLocally(file:File,attach:(worker:Worker|null,completedWorker?:Worker)=>void):Promise<ExtractResult>{
 return new Promise((resolve,reject)=>{
  const worker=new Worker(new URL('../../workers/browser-cv.worker.ts',import.meta.url),{type:'module'});
  attach(worker);
  let complete=false;
  const settle=(error?:Error,result?:ExtractResult)=>{
   if(complete)return;
   complete=true;
   clearTimeout(timer);
   worker.terminate();
   attach(null,worker);
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
 const [state,action,pending]=useActionState(importBrowserCvText,{});
 const [file,setFile]=useState<File|null>(null);
 const [format,setFormat]=useState<LocalCvFormat|null>(null);
 const [text,setText]=useState('');
 const [status,setStatus]=useState<'idle'|'reading'|'ready'|'error'>('idle');
 const [problem,setProblem]=useState('');
 const [kind,setKind]=useState<CareerKind>('experience');
 const workerRef=useRef<Worker|null>(null);
 const readerGeneration=useRef(0);
 const router=useRouter();
 useEffect(()=>{if(state.message)router.refresh();},[state.message,router]);
 useEffect(()=>()=>{workerRef.current?.terminate();},[]);
 async function readFile(){
  if(!file){setProblem('Choose a PDF or DOCX first.');return;}
  if(file.size===0||file.size>MAX_LOCAL_CV_BYTES){
   setProblem('Choose a PDF or DOCX of at most 2 MB.');
   setStatus('error');return;
  }
  const generation=++readerGeneration.current;
  setStatus('reading');setProblem('');setText('');setFormat(null);
  try{
   const result=await extractLocally(file,(worker,completedWorker)=>{
    if(!completedWorker||workerRef.current===completedWorker)workerRef.current=worker;
   });
   if(generation!==readerGeneration.current)return;
   setText(result.text);setFormat(result.format);setStatus('ready');
  }catch(error){
   if(generation!==readerGeneration.current)return;
   setStatus('error');setProblem(error instanceof Error?error.message:'Local extraction failed.');
  }
 }
 const tooLong=text.length>MAX_LOCAL_CV_TEXT;
 const valid=status==='ready'&&text.trim().length>=20&&!tooLong;
 return <section className="card stack" id="local-cv-import">
  <p className="eyebrow">No additional server required</p>
  <h2>Import PDF or DOCX on this device</h2>
  <p className="subtle">Your document is opened inside a temporary browser worker. The PDF/DOCX file stays on this device: it is <strong>not sent to Vercel, Supabase, antivirus scanning or AI</strong>. Only the text you choose to save is sent to your private Supabase review queue, and every suggested fact needs your approval.</p>
  <div className="form-row">
   <label className="label" htmlFor="local-cv-file">Choose PDF or DOCX (up to 2 MB)</label>
   <input className="field" id="local-cv-file" type="file"
    accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    onChange={event=>{
     ++readerGeneration.current;
     workerRef.current?.terminate();workerRef.current=null;
     setFile(event.target.files?.[0]??null);
     setStatus('idle');setProblem('');setText('');setFormat(null);
    }}/>
  </div>
  <button type="button" className="button secondary"
   disabled={!file||status==='reading'||pending} onClick={readFile}>
   {status==='reading'?'Reading on your device…':'Extract text locally'}
  </button>
  <p className="subtle" role="status" aria-live="polite">
   {status==='reading'?'Reading your document in a temporary local worker. Nothing is being uploaded.':
    status==='ready'?'Local extraction complete: '+format?.toUpperCase()+'. Review and edit the text before saving.':
    'Works with text-based PDFs of up to 12 pages and standard DOCX files. Image-only scans need OCR and are not supported yet.'}
  </p>
  {problem&&<p className="error" role="alert">{problem}</p>}
  {status==='ready'&&<form action={action} className="stack">
   <div className="form-row">
    <label className="label" htmlFor="local-cv-preview">Review and edit the extracted text</label>
    <textarea id="local-cv-preview" className="field" name="resume_text" rows={10}
     value={text} onChange={event=>setText(event.target.value)} required/>
    <p className={tooLong?'error':'subtle'}>
     {text.length.toLocaleString()} / {MAX_LOCAL_CV_TEXT.toLocaleString()} characters to save.
     {tooLong?' Remove unwanted sections, keeping no more than 4,000 characters.':''}
    </p>
   </div>
   <div className="form-row">
    <label className="label" htmlFor="local-cv-kind">Category if no section headings are found</label>
    <select id="local-cv-kind" className="field" name="kind" value={kind}
     onChange={event=>setKind(event.target.value as CareerKind)}>
     {careerKinds.map(k=><option value={k} key={k}>{kindLabels[k]}</option>)}
    </select>
   </div>
   <p className="subtle">Recognized sections are split into up to six unconfirmed suggestions. Otherwise, the selected excerpt is saved as one pending item. No employers, dates, skills or results are invented.</p>
   <label><input type="checkbox" name="confirm_source" value="yes" required/> I have permission to use this CV text.</label>
   <label><input type="checkbox" name="confirm_review" value="yes" required/> I understand only this edited text is sent to Supabase, and I must approve each fact before it is confirmed.</label>
   <button className="button" disabled={pending||!valid}>
    {pending?'Saving draft facts…':'Save selected text to my review queue'}
   </button>
   {state.error&&<p className="error" role="alert">{state.error}</p>}
   {state.message&&<p className="success" role="status">{state.message}</p>}
  </form>}
  <p className="subtle">Privacy note: local extraction avoids uploading the original file, but it is not antivirus scanning. Only open files you trust; the browser parser still processes untrusted document content. This option does not use the self-hosted AI model.</p>
 </section>;
}
