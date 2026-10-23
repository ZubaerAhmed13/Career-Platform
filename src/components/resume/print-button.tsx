'use client';
import type {ResumeExportReview} from '@/lib/resume/export-review';

/** The direct print route must never silently bypass the local export preflight.
 * Warnings are explicitly overridable; invalid documents block the print action. */
export function ResumePrintButton({review}:{review:ResumeExportReview}){
 const blocked=review.errors.length>0;
 function print(){
  if(blocked)return;
  if(review.warnings.length&&!window.confirm(
   'Before printing, review these items:\n\n• '+review.warnings.join('\n• ')+
   '\n\nContinue and open your print dialog anyway?'
  ))return;
  window.print();
 }
 return <div className="stack" style={{gap:8}}>
  {review.errors.length>0&&<div role="alert">
   <strong>Print blocked until the document is corrected.</strong>
   <ul>{review.errors.map((error,i)=><li key={i}>{error}</li>)}</ul>
  </div>}
  {review.warnings.length>0&&<div role="status">
   <strong>Review these items before printing:</strong>
   <ul>{review.warnings.map((warning,i)=><li key={i}>{warning}</li>)}</ul>
  </div>}
  <button className="button" type="button" disabled={blocked} onClick={print}>Print / Save as PDF</button>
 </div>;
}
