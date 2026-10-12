'use client';
import { useActionState } from 'react';
import { importScannedCv } from '@/app/actions/career-file-import';
import { careerKinds, kindLabels } from '@/lib/career/schema';

export function CvUploadForm({scannerReady}:{scannerReady:boolean}){
 const [state,action,pending]=useActionState(importScannedCv,{});
 if(!scannerReady)return <section className="muted-card" role="status">
  <strong>PDF and DOCX import is disabled</strong>
  <p>Secure antivirus scanning is not configured. Use pasted text or manual record entry instead. No document is uploaded to public storage.</p>
 </section>;
 return <form action={action} className="card stack">
  <h2>Import a scanned CV section (PDF or DOCX)</h2>
  <p className="subtle">Maximum 2 MB, 12 PDF pages, 4,000 extracted characters. Files are scanned before text extraction. The file is not saved, and extracted text requires review.</p>
  <label className="label" htmlFor="cv-binary">Select document</label>
  <input className="field" type="file" name="file" id="cv-binary" required
    accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"/>
  <label className="label" htmlFor="cv-import-kind">Suggested category</label>
  <select className="field" name="kind" id="cv-import-kind">
   {careerKinds.map(k=><option key={k} value={k}>{kindLabels[k]}</option>)}
  </select>
  <label><input type="checkbox" name="consent" value="yes" required/> I own or may process this file, and consent to server-side antivirus scanning and text extraction for private review.</label>
  <button className="button" disabled={pending}>{pending?'Scanning and extracting…':'Scan and import as unreviewed text'}</button>
  {state.error&&<p role="alert" className="error">{state.error}</p>}
  {state.message&&<p role="status" className="success">{state.message}</p>}
 </form>;
}
