'use client';
import {useEffect,useRef,useState,useTransition} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {createResumeVersion,restoreResumeVersion,saveResumeDraft} from '@/app/actions/resumes';
import {entryFromRecord,qualityWarnings,templateIds,templateNames,
 type ResumeDoc,type ResumeRow,type ResumeSection,type ResumeEntry,type ResumeVersion} from '@/lib/resume/schema';
import {careerKinds,kindLabels,type CareerKind,type CareerRecord} from '@/lib/career/schema';
import {makeResumeDocx,resumePlainText} from '@/lib/resume/exports';
import {safeExportName} from '@/lib/resume/schema';
import {ResumePreview} from './resume-preview';

type Panel='content'|'design'|'preview';
function shift<T>(items:T[],index:number,delta:number){
 const next=index+delta;if(next<0||next>=items.length)return;
 [items[index],items[next]]=[items[next],items[index]];
}
function download(data:BlobPart,type:string,name:string){
 const url=URL.createObjectURL(new Blob([data],{type}));
 const anchor=document.createElement('a');anchor.href=url;anchor.download=name;anchor.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export function ResumeEditor({row,versions:initialVersions,vault,openVault}:{
 row:ResumeRow;versions:ResumeVersion[];vault:CareerRecord[];openVault:boolean
}){
 const [doc,setDoc]=useState<ResumeDoc>(()=>structuredClone(row.draft_content));
 const [versions,setVersions]=useState(initialVersions);
 const [panel,setPanel]=useState<Panel>('content');
 const [sourceOpen,setSourceOpen]=useState(openVault),[sourceKind,setSourceKind]=useState<CareerKind|'all'>('all');
 const [search,setSearch]=useState(''),[selected,setSelected]=useState<string>(doc.sections[0]?.id??'');
 const [message,setMessage]=useState(''),[status,setStatus]=useState('All changes saved');
 const [previewVersion,setPreviewVersion]=useState<ResumeVersion|null>(null);
 const [versionLabel,setVersionLabel]=useState(''),[busy,startTransition]=useTransition();
 const [mobileZoom,setMobileZoom]=useState(100),[tick,setTick]=useState(0);
 const revisionRef=useRef(row.revision),savingRef=useRef(false),blockedRef=useRef(false);
 const savedRef=useRef(JSON.stringify(row.draft_content)),docRef=useRef(doc);
 const undoRef=useRef<ResumeDoc[]>([]),redoRef=useRef<ResumeDoc[]>([]);
 const router=useRouter();
 docRef.current=doc;
 const dirty=JSON.stringify(doc)!==savedRef.current;
 const section=doc.sections.find(s=>s.id===selected)??doc.sections[0];
 function edit(change:(draft:ResumeDoc)=>void){
  setDoc(prev=>{
   const draft=structuredClone(prev);change(draft);
   if(JSON.stringify(draft)===JSON.stringify(prev))return prev;
   undoRef.current=[...undoRef.current.slice(-29),prev];redoRef.current=[];
   return draft;
  });
  if(!blockedRef.current)setStatus('Unsaved changes');
  setPreviewVersion(null);
 }
 function undo(){const last=undoRef.current.pop();if(!last)return;redoRef.current.push(doc);setDoc(last);setStatus('Unsaved changes');}
 function redo(){const next=redoRef.current.pop();if(!next)return;undoRef.current.push(doc);setDoc(next);setStatus('Unsaved changes');}
 async function save(snapshot:ResumeDoc){
  if(savingRef.current||blockedRef.current)return false;
  savingRef.current=true;setStatus('Saving…');
  try{
   const result=await saveResumeDraft(row.id,revisionRef.current,snapshot);
   if(!result.ok){
    if(result.conflict)blockedRef.current=true;
    setStatus(result.conflict?'Conflicting changes':'Save failed');
    setMessage(result.error);return false;
   }
   revisionRef.current=result.revision!;
   savedRef.current=JSON.stringify(snapshot);
   setStatus(JSON.stringify(docRef.current)===savedRef.current?'All changes saved':'Unsaved changes');
   if(JSON.stringify(docRef.current)!==savedRef.current)setTick(n=>n+1);
   return true;
  }catch{
   setStatus('Save failed');setMessage('Unable to save right now. Your changes remain in this browser.');return false;
  }finally{savingRef.current=false;}
 }
 useEffect(()=>{
  if(!dirty||savingRef.current||blockedRef.current)return;
  const timeout=setTimeout(()=>{void save(doc);},1000);
  return ()=>clearTimeout(timeout);
 // tick re-runs after a save finished while more edits were made.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[doc,tick]);
 const canWork=!previewVersion;
 function addEntry(sid:string){
  edit(d=>{
   const target=d.sections.find(s=>s.id===sid);if(!target||target.entries.length>=70)return;
   target.entries.push({id:crypto.randomUUID(),title:'',subtitle:'',location:'',startedOn:'',endedOn:'',
    current:false,visible:true,bullets:[],source:null});
  });
 }
 function patchEntry(sid:string,eid:string,key:keyof Omit<ResumeEntry,'id'|'source'|'bullets'>,value:string|boolean){
  edit(d=>{const e=d.sections.find(s=>s.id===sid)?.entries.find(item=>item.id===eid);if(e)(e as unknown as Record<string,unknown>)[key]=value;});
 }
 function addFromVault(record:CareerRecord){
  if(doc.sections.some(s=>s.entries.some(e=>e.source?.recordId===record.id))){
   setMessage('This record is already included in this resume.');return;
  }
  edit(d=>{
   const section=d.sections.find(s=>s.kind===record.kind);
   if(section&&section.entries.length<70){section.entries.push(entryFromRecord(record));section.visible=true;setSelected(section.id);}
  });
  setMessage('Added a snapshot from Career Vault. Editing this resume will not change the source.');
 }
 function exportDoc(format:'docx'|'txt',item:ResumeDoc=previewVersion?.snapshot_content??doc){
  const base=item.contact.name||row.name;
  if(format==='txt')download(resumePlainText(item),'text/plain;charset=utf-8',safeExportName(base,'txt'));
  else {
   const bytes=makeResumeDocx(item);
   const copy=new Uint8Array(bytes.length);copy.set(bytes);
   download(copy.buffer,'application/vnd.openxmlformats-officedocument.wordprocessingml.document',safeExportName(base,'docx'));
  }
 }
 async function version(){
  if(savingRef.current){setMessage('A save is in progress. Try again once it completes.');return;}
  if(dirty&&!await save(docRef.current))return;
  startTransition(async()=>{
   const result=await createResumeVersion(row.id,revisionRef.current,versionLabel);
   if(!result.ok){setMessage(result.error);return;}
   setVersions(v=>[{
    id:crypto.randomUUID(),resume_id:row.id,user_id:row.user_id,version_number:result.version!,
    label:versionLabel,snapshot_content:structuredClone(docRef.current),created_at:new Date().toISOString()
   },...v]); // optimistic listing; refresh replaces synthetic ID with stored ID
   setVersionLabel('');setMessage('Saved immutable version #'+result.version+'.');
   router.refresh();
  });
 }
 function restore(version:ResumeVersion){
  if(dirty&&!window.confirm('Restore an earlier version? Unsaved edits in this tab will be replaced.'))return;
  if(!window.confirm('Restore version #'+version.version_number+' into your current draft? The historical version will remain unchanged.'))return;
  startTransition(async()=>{
   const result=await restoreResumeVersion(row.id,version.id,revisionRef.current);
   if(!result.ok){setMessage(result.error);return;}
   revisionRef.current=result.revision!;
   const copy=structuredClone(version.snapshot_content);
   undoRef.current.push(docRef.current);redoRef.current=[];
   savedRef.current=JSON.stringify(copy);setDoc(copy);
   blockedRef.current=false;setPreviewVersion(null);setSelected(copy.sections[0]?.id??'');
   setStatus('All changes saved');setMessage('Draft restored. Original saved version preserved.');
  });
 }
 function addBullet(sid:string,eid:string){
  edit(d=>{const e=d.sections.find(s=>s.id===sid)?.entries.find(x=>x.id===eid);
   if(e&&e.bullets.length<40)e.bullets.push({id:crypto.randomUUID(),text:'',visible:true});});
 }
 const isPreview=panel==='preview',isDesign=panel==='design';
 const display=previewVersion?.snapshot_content??doc;
 const filteredVault=vault.filter(record=>(sourceKind==='all'||record.kind===sourceKind)&&
  (record.title+' '+record.organization+' '+record.description).toLowerCase().includes(search.toLowerCase()));
 return <div className="resume-studio-editor stack">
  <header className="resume-editor-top">
   <div><Link href="/resume-studio" className="subtle">← Resume library</Link>
    <h1 className="heading" style={{margin:'5px 0'}}>{row.name}</h1>
    <p className="subtle" role="status" aria-live="polite">{status}{dirty?' · changes in this tab':''}</p>
   </div>
   <div className="resume-top-actions">
    <button className="button secondary" disabled={!undoRef.current.length} onClick={undo}>Undo</button>
    <button className="button secondary" disabled={!redoRef.current.length} onClick={redo}>Redo</button>
    <button className="button secondary" disabled={busy||savingRef.current||blockedRef.current} onClick={()=>void save(doc)}>Save now</button>
    <Link className="button secondary" href={'/resume-studio/'+row.id+'/print'+(previewVersion?'?version='+previewVersion.id:'')} target="_blank">Print / Save PDF</Link>
    <button className="button secondary" onClick={()=>exportDoc('docx')}>Download DOCX</button>
    <button className="button secondary" onClick={()=>exportDoc('txt')}>Plain text</button>
   </div>
  </header>
  {blockedRef.current&&<div className="card stack" role="alert"><strong>Version conflict detected</strong>
   <p>Your changes are still in this tab. Open the latest draft in another tab to compare it, or export your current text before reloading.</p>
   <div><button className="button secondary" onClick={()=>router.refresh()}>Check latest on server</button>
    <button className="button secondary" onClick={()=>window.location.reload()}>Discard this tab’s edits and reload</button></div></div>}
  {message&&<p className="muted-card" role="status">{message}</p>}
  <nav aria-label="Editor views" className="resume-mobile-tabs">
   {(['content','design','preview'] as const).map(tab=><button key={tab} type="button" className={panel===tab?'button':'button secondary'}
     aria-current={panel===tab?'page':undefined} onClick={()=>setPanel(tab)}>{tab[0].toUpperCase()+tab.slice(1)}</button>)}
  </nav>
  <div className="resume-editor-grid">
   <div className={'resume-editor-panel resume-content-panel '+(isPreview||isDesign?'resume-mobile-hidden':'')}>
    <section className="card stack">
     <h2 style={{margin:0}}>Contact information</h2>
     <p className="subtle">Only fields you show will appear on this resume. A full street address is not necessary.</p>
     <div className="resume-form-grid">
      {(['name','headline','email','phone','location','linkedin','portfolio','github','website'] as const).map(key=>
       <label className="form-row" key={key}><span className="label">{key==='name'?'Full name':key==='headline'?'Professional headline':key[0].toUpperCase()+key.slice(1)}</span>
        <input className="field" type={key==='email'?'email':'text'} maxLength={key==='email'?254:key==='name'?160:500}
         value={doc.contact[key]} onChange={e=>edit(d=>{d.contact[key]=e.target.value;})}/>
        {key!=='name'&&<span className="resume-visibility"><input aria-label={'Show '+key} type="checkbox"
         checked={!doc.contact.hidden.includes(key)}
         onChange={e=>edit(d=>{d.contact.hidden=e.target.checked?
          d.contact.hidden.filter(v=>v!==key):[...d.contact.hidden,key];})}/> Show on resume</span>}
       </label>)}
     </div>
    </section>
    <section className="card stack">
     <div className="resume-inline-header"><h2>Professional summary</h2><label className="resume-visibility">
      <input type="checkbox" checked={doc.summaryVisible} onChange={e=>edit(d=>{d.summaryVisible=e.target.checked;})}/> Show</label></div>
     <textarea className="field" rows={5} maxLength={4000} value={doc.summary}
      onChange={e=>edit(d=>{d.summary=e.target.value;})} placeholder="Brief factual overview of your experience, strengths and target work."/>
     <small className="subtle">{doc.summary.length}/4000 characters · Written by you, not generated.</small>
    </section>
    <section className="card stack">
     <div className="resume-inline-header"><h2>Resume sections</h2>
      <button className="button secondary" onClick={()=>{const id=crypto.randomUUID();edit(d=>d.sections.push({id,kind:'custom',title:'Additional Information',visible:true,entries:[]}));setSelected(id);}}>+ Custom section</button></div>
     <div className="resume-sections-list">
      {doc.sections.map((s,i)=><div key={s.id} className="resume-section-row">
       <button className={'resume-select-section '+(s.id===section?.id?'active':'')} onClick={()=>setSelected(s.id)}>{s.title} ({s.entries.length})</button>
       <label title={'Show '+s.title}><input type="checkbox" checked={s.visible} onChange={e=>edit(d=>{d.sections[i].visible=e.target.checked;})}/></label>
       <button title="Move up" aria-label={'Move '+s.title+' up'} disabled={i===0} onClick={()=>edit(d=>shift(d.sections,i,-1))}>↑</button>
       <button title="Move down" aria-label={'Move '+s.title+' down'} disabled={i===doc.sections.length-1} onClick={()=>edit(d=>shift(d.sections,i,1))}>↓</button>
       {s.kind==='custom'&&<button aria-label={'Remove '+s.title} onClick={()=>{if(window.confirm('Remove this custom section and its entries?'))edit(d=>{d.sections.splice(i,1);});}}>×</button>}
      </div>)}
     </div>
     {section&&<div className="stack resume-section-form">
      <label className="form-row"><span className="label">Section heading</span><input className="field" maxLength={100} value={section.title}
       onChange={e=>edit(d=>{const s=d.sections.find(x=>x.id===section.id);if(s)s.title=e.target.value;})}/></label>
      <div className="resume-inline-header"><h3>{section.title} entries</h3>
       <button className="button secondary" onClick={()=>addEntry(section.id)}>+ Manual entry</button></div>
      {!section.entries.length&&<p className="subtle">No entries. Add your own information or select approved Career Vault facts below.</p>}
      {section.entries.map((entry,j)=><article className="resume-entry-editor stack" key={entry.id}>
       <div className="resume-inline-header"><strong>Entry {j+1} {entry.source?'· Vault snapshot':'· Resume-only'}</strong>
        <div className="resume-mini-actions">
         <button aria-label="Move entry up" disabled={j===0} onClick={()=>edit(d=>shift(d.sections.find(s=>s.id===section.id)!.entries,j,-1))}>↑</button>
         <button aria-label="Move entry down" disabled={j===section.entries.length-1} onClick={()=>edit(d=>shift(d.sections.find(s=>s.id===section.id)!.entries,j,1))}>↓</button>
         <button aria-label="Remove entry" onClick={()=>edit(d=>{d.sections.find(s=>s.id===section.id)!.entries.splice(j,1);})}>×</button>
        </div>
       </div>
       {entry.source&&<p className="subtle" style={{fontSize:12}}>Source record: {entry.source.recordId.slice(0,8)} · revision {entry.source.revision}. Document-specific edits do not modify the Vault.</p>}
       <label className="resume-visibility"><input type="checkbox" checked={entry.visible} onChange={e=>patchEntry(section.id,entry.id,'visible',e.target.checked)}/> Show entry</label>
       <div className="resume-form-grid">
        {([
         ['title','Title / degree / skill'],['subtitle','Employer / institution / context'],
         ['location','Location'],['startedOn','Start date (YYYY-MM-DD)'],['endedOn','End date (YYYY-MM-DD)']
        ] as const).map(([key,label])=><label className="form-row" key={key}>
         <span className="label">{label}</span><input className="field" maxLength={key==='startedOn'||key==='endedOn'?10:220}
          value={entry[key]} onChange={e=>patchEntry(section.id,entry.id,key,e.target.value)}/></label>)}
       </div>
       <label className="resume-visibility"><input type="checkbox" checked={entry.current}
        onChange={e=>patchEntry(section.id,entry.id,'current',e.target.checked)}/> Present / ongoing</label>
       <div className="resume-inline-header"><strong>Bullet points</strong>
        <button className="button secondary" onClick={()=>addBullet(section.id,entry.id)}>+ Bullet</button></div>
       <p className="subtle" style={{margin:0,fontSize:12}}>Use Action + Contribution + Result where accurate. Never invent metrics.</p>
       {entry.bullets.map((bullet,k)=><div className="resume-bullet-editor" key={bullet.id}>
        <textarea className="field" rows={2} value={bullet.text} maxLength={1200} aria-label={'Bullet '+(k+1)}
         onChange={e=>edit(d=>{d.sections.find(s=>s.id===section.id)!.entries.find(x=>x.id===entry.id)!.bullets[k].text=e.target.value;})}/>
        <div className="resume-mini-actions"><label title="Show bullet"><input type="checkbox" checked={bullet.visible} onChange={e=>edit(d=>{d.sections.find(s=>s.id===section.id)!.entries.find(x=>x.id===entry.id)!.bullets[k].visible=e.target.checked;})}/></label>
         <button aria-label="Move bullet up" disabled={k===0} onClick={()=>edit(d=>shift(d.sections.find(s=>s.id===section.id)!.entries.find(x=>x.id===entry.id)!.bullets,k,-1))}>↑</button>
         <button aria-label="Move bullet down" disabled={k===entry.bullets.length-1} onClick={()=>edit(d=>shift(d.sections.find(s=>s.id===section.id)!.entries.find(x=>x.id===entry.id)!.bullets,k,1))}>↓</button>
         <button aria-label="Remove bullet" onClick={()=>edit(d=>{d.sections.find(s=>s.id===section.id)!.entries.find(x=>x.id===entry.id)!.bullets.splice(k,1);})}>×</button>
        </div>
       </div>)}
      </article>)}
     </div>}
    </section>
    <section className="card stack">
     <div className="resume-inline-header"><h2>Career Vault facts</h2>
      <button className="button secondary" onClick={()=>setSourceOpen(o=>!o)}>{sourceOpen?'Close':'Browse confirmed records'}</button></div>
     <p className="subtle">Choose exact facts to snapshot. Pending suggestions are excluded; master records never change.</p>
     {sourceOpen&&<div className="stack">
      <input className="field" aria-label="Search confirmed Vault facts" placeholder="Search by job, project or skill" value={search} onChange={e=>setSearch(e.target.value)}/>
      <select aria-label="Filter Vault category" className="field" value={sourceKind} onChange={e=>setSourceKind(e.target.value as typeof sourceKind)}>
       <option value="all">All categories</option>{careerKinds.map(kind=><option value={kind} key={kind}>{kindLabels[kind]}</option>)}</select>
      <div className="resume-vault-list">{filteredVault.map(record=><div className="resume-vault-row" key={record.id}>
       <div><strong>{record.title}</strong><p className="subtle" style={{margin:0,fontSize:12}}>{kindLabels[record.kind]} · {record.organization||'No organisation'}</p></div>
       <button className="button secondary" onClick={()=>addFromVault(record)}>Add</button>
      </div>)}
      {!filteredVault.length&&<p className="subtle">No matching approved Career Vault records.</p>}</div>
     </div>}
    </section>
   </div>
   <aside className={'resume-editor-panel resume-design-panel '+(!isDesign?'resume-mobile-hidden':'')}>
    <section className="card stack"><h2 style={{margin:0}}>Document design</h2>
     <p className="subtle">Switch templates without changing resume content.</p>
     <label className="form-row"><span className="label">Template</span>
      <select className="field" value={doc.settings.template} onChange={e=>edit(d=>{d.settings.template=e.target.value as typeof d.settings.template;})}>
       {templateIds.map(id=><option key={id} value={id}>{templateNames[id]}</option>)}</select></label>
     <div className="resume-form-grid">
      <label className="form-row"><span className="label">Paper</span><select className="field" value={doc.settings.paper}
       onChange={e=>edit(d=>{d.settings.paper=e.target.value as typeof d.settings.paper;})}><option>A4</option><option>Letter</option></select></label>
      <label className="form-row"><span className="label">Document headings</span><select className="field" value={doc.settings.language}
       onChange={e=>edit(d=>{d.settings.language=e.target.value as 'en'|'de';})}><option value="en">English</option><option value="de">German</option></select></label>
      <label className="form-row"><span className="label">Font</span><select className="field" value={doc.settings.font}
       onChange={e=>edit(d=>{d.settings.font=e.target.value as typeof d.settings.font;})}>
        {(['Arial','Georgia','Times New Roman','Calibri'] as const).map(f=><option key={f}>{f}</option>)}</select></label>
      <label className="form-row"><span className="label">Margins</span><select className="field" value={doc.settings.margin}
       onChange={e=>edit(d=>{d.settings.margin=e.target.value as typeof d.settings.margin;})}><option value="standard">Standard</option><option value="compact">Compact</option></select></label>
      <label className="form-row"><span className="label">Density</span><select className="field" value={doc.settings.density}
       onChange={e=>edit(d=>{d.settings.density=e.target.value as typeof d.settings.density;})}><option value="standard">Standard</option><option value="compact">Compact</option></select></label>
      <label className="form-row"><span className="label">Date format</span><select className="field" value={doc.settings.dateStyle}
       onChange={e=>edit(d=>{d.settings.dateStyle=e.target.value as typeof d.settings.dateStyle;})}><option value="month-year">Month / year</option><option value="year">Year only</option></select></label>
     </div>
     {([['bodySize','Body text',9,12,.5],['headingSize','Heading size',11,17,1],['lineSpacing','Line height',1.05,1.6,.05]] as const).map(([key,label,min,max,step])=>
      <label className="form-row" key={key}><span className="label">{label}: {doc.settings[key]}</span>
       <input aria-label={label} type="range" min={min} max={max} step={step} value={doc.settings[key]}
        onChange={e=>edit(d=>{d.settings[key]=Number(e.target.value);})}/></label>)}
     <label className="form-row"><span className="label">Accent colour</span>
      <select className="field" value={doc.settings.accent} onChange={e=>edit(d=>{d.settings.accent=e.target.value as typeof d.settings.accent;})}>
       <option value="#1d3557">Midnight blue</option><option value="#345de3">Professional blue</option>
       <option value="#334155">Slate</option><option value="#0f766e">Deep teal</option><option value="#000000">Black</option></select></label>
     <p className="subtle">The app interface stays in English. Switching heading language does not translate your written content.</p>
    </section>
    <section className="card stack"><h2>Document checks</h2>
     {qualityWarnings(doc).length?<ul>{qualityWarnings(doc).map((w,i)=><li key={i}>{w}</li>)}</ul>:
      <p className="subtle">No basic formatting or completeness warnings. This does not guarantee ATS acceptance.</p>}
    </section>
    <section className="card stack"><h2>Saved versions</h2>
     <p className="subtle">Create an immutable copy of the currently saved draft. Older versions can be previewed and restored.</p>
     <label className="form-row"><span className="label">Version label (optional)</span>
      <input className="field" maxLength={120} value={versionLabel} onChange={e=>setVersionLabel(e.target.value)} placeholder="e.g. Working student · October"/></label>
     <button className="button" disabled={busy||savingRef.current||blockedRef.current} onClick={()=>void version()}>Save version</button>
     <div className="resume-version-list">{versions.map(v=><div className="resume-version-row" key={v.id}>
      <div><strong>#{v.version_number} {v.label}</strong><small className="subtle">{new Date(v.created_at).toLocaleString()}</small></div>
      <div className="resume-mini-actions">
       <button onClick={()=>{setPreviewVersion(v);setPanel('preview');}}>Preview</button>
       <button disabled={busy||v.id.length!==36||v.snapshot_content===undefined} onClick={()=>restore(v)}>Restore</button>
      </div>
     </div>)}
     {!versions.length&&<p className="subtle">No saved versions yet.</p>}</div>
    </section>
   </aside>
   <div className={'resume-preview-panel '+(!isPreview?'resume-mobile-hidden':'')}>
    <div className="resume-preview-toolbar">
     <strong>{previewVersion?'Historical version #'+previewVersion.version_number:'Live preview'}</strong>
     {previewVersion&&<button className="button secondary" onClick={()=>setPreviewVersion(null)}>Back to live draft</button>}
     <label className="resume-preview-zoom">Zoom <select className="field" value={mobileZoom} onChange={e=>setMobileZoom(Number(e.target.value))}>
      <option value={75}>75%</option><option value={100}>100%</option><option value={125}>125%</option></select></label>
    </div>
    <div className="resume-preview-scroll"><div style={{zoom:mobileZoom/100}}><ResumePreview doc={display} fit/></div></div>
    <p className="subtle" style={{fontSize:12}}>Preview flows across pages. Use Print / Save PDF for final pagination and margins.</p>
   </div>
  </div>
 </div>;
}
