import { z } from 'zod';
import { careerKind, kindLabels, type CareerRecord } from '../career/schema';
import {detailFields} from '../career/record-fields';

export const templateIds = ['ats-classic','modern-professional','student-graduate','european-clean','executive-minimal'] as const;
export const paperSizes = ['A4','Letter'] as const;
export const resumeKinds = [...careerKind.options, 'custom'] as const;
export type ResumeKind = typeof resumeKinds[number];
export const templateNames: Record<typeof templateIds[number],string> = {
 'ats-classic':'ATS Classic','modern-professional':'Modern Professional',
 'student-graduate':'Student & Graduate','european-clean':'European Clean',
 'executive-minimal':'Executive Minimal'
};
const short = (max: number) => z.string().max(max);
const optionalDate=z.string().max(10).refine(value=>{
 if(!value)return true;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const date=new Date(value+'T12:00:00Z');
 return !Number.isNaN(date.getTime())&&date.toISOString().slice(0,10)===value;
},'Use a valid date in YYYY-MM-DD format');
export const embeddedPhotoSchema=z.union([z.literal(''),z.string().max(92000).regex(/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/,'Only browser-processed JPEG images are accepted')]);
const link = z.union([z.literal(''),z.url().max(500).refine(url=>/^https:\/\/|^http:\/\//i.test(url),'Only HTTP(S) links are allowed')]);
export const contactSchema = z.object({
 name:short(160).default(''), headline:short(200).default(''),
 photo:embeddedPhotoSchema.default(''),showPhoto:z.boolean().default(false),
 email:z.union([z.literal(''),z.email().max(254)]).default(''),
 phone:short(80).default(''),location:short(180).default(''),
 linkedin:link.default(''),portfolio:link.default(''),github:link.default(''),website:link.default(''),
 hidden:z.array(z.enum(['headline','email','phone','location','linkedin','portfolio','github','website'])).max(8).default([])
});
export const bulletSchema=z.object({id:z.uuid(),text:short(1200),visible:z.boolean()});
export const sourceSchema=z.object({
 recordId:z.uuid(), revision:z.number().int().positive(),kind:careerKind,
 capturedAt:z.iso.datetime(),title:short(180),organization:short(180).default(''),
 description:short(8000).default('')
});
export const entrySchema=z.object({
 id:z.uuid(),title:short(220),subtitle:short(220).default(''),location:short(180).default(''),
 startedOn:optionalDate.default(''),endedOn:optionalDate.default(''),
 current:z.boolean().default(false),visible:z.boolean().default(true),
 bullets:z.array(bulletSchema).max(40).default([]),
 extras:z.record(z.string().max(50),z.string().max(900)).refine(v=>Object.keys(v).length<=20).default({}),
 source:sourceSchema.nullable().default(null)
});
export const sectionSchema=z.object({
 id:z.uuid(),kind:z.enum(resumeKinds),title:short(100).min(1),visible:z.boolean().default(true),
 entries:z.array(entrySchema).max(70).default([])
});
export const resumeSettingsSchema=z.object({
 template:z.enum(templateIds).default('ats-classic'),
 paper:z.enum(paperSizes).default('A4'),
 language:z.enum(['en','de']).default('en'),
 font:z.enum(['Arial','Georgia','Times New Roman','Calibri']).default('Arial'),
 bodySize:z.number().min(9).max(12).default(10.5),
 headingSize:z.number().min(11).max(17).default(12),
 lineSpacing:z.number().min(1.05).max(1.6).default(1.2),
 margin:z.enum(['standard','compact']).default('standard'),
 density:z.enum(['standard','compact']).default('standard'),
 accent:z.enum(['#1d3557','#345de3','#334155','#0f766e','#000000']).default('#1d3557'),
 dateStyle:z.enum(['month-year','year']).default('month-year')
});
export const resumeDocSchema=z.object({
 schemaVersion:z.literal(1),
 contact:contactSchema,
 summary:short(4000),
 summaryVisible:z.boolean(),
 sections:z.array(sectionSchema).max(25),
 settings:resumeSettingsSchema
}).superRefine((doc,ctx)=>{
 const sections=new Set<string>(),entries=new Set<string>(),bullets=new Set<string>();
 for(const [sectionIndex,section] of doc.sections.entries()){
  if(sections.has(section.id))ctx.addIssue({
   code:'custom',path:['sections',sectionIndex,'id'],message:'Duplicate section ID'
  });
  sections.add(section.id);
  for(const [entryIndex,entry] of section.entries.entries()){
   if(entries.has(entry.id))ctx.addIssue({
    code:'custom',path:['sections',sectionIndex,'entries',entryIndex,'id'],message:'Duplicate entry ID'
   });
   entries.add(entry.id);
   for(const [bulletIndex,bullet] of entry.bullets.entries()){
    if(bullets.has(bullet.id))ctx.addIssue({
     code:'custom',path:['sections',sectionIndex,'entries',entryIndex,'bullets',bulletIndex,'id'],
     message:'Duplicate bullet ID'
    });
    bullets.add(bullet.id);
   }
  }
 }
}).refine(v=>JSON.stringify(v).length<=180000,'Resume exceeds 180 KB');
export type ResumeDoc=z.infer<typeof resumeDocSchema>;
export type ResumeEntry=ResumeDoc['sections'][number]['entries'][number];
export type ResumeSection=ResumeDoc['sections'][number];
export type ResumeSettings=ResumeDoc['settings'];
export type ResumeRow={
 id:string;user_id:string;name:string;focus_label:string;draft_content:ResumeDoc;
 template_id:ResumeSettings['template'];paper_size:ResumeSettings['paper'];
 document_language:ResumeSettings['language'];revision:number;
 created_at:string;updated_at:string
};
export type ResumeVersion={
 id:string;user_id:string;resume_id:string;version_number:number;label:string;
 snapshot_content:ResumeDoc;created_at:string
};
const headings:Record<Exclude<ResumeKind,'custom'>,string>={
 experience:'Experience',education:'Education',skill:'Skills',language:'Languages',
 project:'Projects',achievement:'Achievements',certification:'Certifications',volunteering:'Volunteering'
};
export function emptyResume(template:ResumeSettings['template']='ats-classic',paper:ResumeSettings['paper']='A4'):ResumeDoc {
 return {schemaVersion:1,contact:{name:'',headline:'',photo:'',showPhoto:false,email:'',phone:'',location:'',linkedin:'',portfolio:'',github:'',website:'',hidden:[]},
 summary:'',summaryVisible:true,
 sections:(Object.keys(headings) as Exclude<ResumeKind,'custom'>[])
  .sort((a,b)=>template==='student-graduate'?
   (['education','project','experience'].indexOf(a)<0?99:['education','project','experience'].indexOf(a))-
   (['education','project','experience'].indexOf(b)<0?99:['education','project','experience'].indexOf(b)):0)
  .map(kind=>({
  id:crypto.randomUUID(),kind,title:headings[kind],visible:true,entries:[]
 })),
 settings:{template,paper,language:'en',font:'Arial',bodySize:10.5,headingSize:12,
  lineSpacing:1.2,margin:'standard',density:'standard',accent:'#1d3557',dateStyle:'month-year'}
 };
}
export const resumeExtraFields:Record<ResumeKind,readonly {key:string;label:string;maxLength:number}[]> = {
 experience:detailFields.experience,education:[
  ...detailFields.education,{key:'expected_graduation',label:'Expected graduation',maxLength:100}
 ],skill:detailFields.skill,language:detailFields.language,project:detailFields.project,
 achievement:detailFields.achievement,certification:detailFields.certification,
 volunteering:detailFields.volunteering,custom:[]
};
export function displayExtraLabel(kind:ResumeKind,key:string){
 return resumeExtraFields[kind].find(field=>field.key===key)?.label??
  key.replace(/_/g,' ').replace(/^./,c=>c.toUpperCase());
}
export function entryFromRecord(record:CareerRecord):ResumeEntry {
 if(record.status!=='confirmed')throw new Error('Only confirmed Career Vault records can be selected.');
 const known=new Set(resumeExtraFields[record.kind].map(f=>f.key));
 const extras=Object.fromEntries(Object.entries(record.details??{}).filter(([key,value])=>known.has(key)&&typeof value==='string'&&value.trim()).map(([key,value])=>[key,value.slice(0,900)]));
 const other=Object.entries(record.details??{}).filter(([key,value])=>!known.has(key)&&typeof value==='string'&&value.trim()).map(([key,value])=>key+': '+value).join('\n');
 const description=[record.description,other].filter(Boolean).join('\n');
 return {id:crypto.randomUUID(),title:record.title,subtitle:record.organization,
  location:record.location,startedOn:record.started_on??'',endedOn:record.ended_on??'',
  current:record.is_current,visible:true,extras,
  bullets:description.split(/\r?\n/).map(s=>s.trim().replace(/^[-•]\s*/,'')).filter(Boolean).slice(0,40)
   .map(text=>({id:crypto.randomUUID(),text:text.slice(0,1200),visible:true})),
  source:{recordId:record.id,revision:record.revision,kind:record.kind,
   capturedAt:new Date().toISOString(),title:record.title,organization:record.organization,
   description:record.description}
 };
}
export function duplicateDraft(doc:ResumeDoc):ResumeDoc {
 return structuredClone(doc);
}
export function safeExportName(name:string,extension:'docx'|'txt'|'pdf'){
 const base=name.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9 _-]/g,'').replace(/\s+/g,'_').slice(0,80).replace(/^[_-]+|[_-]+$/g,'')||'Resume';
 return base+'.'+extension;
}
export function formatDate(value:string,style:ResumeSettings['dateStyle']='month-year',language:ResumeSettings['language']='en'){
 if(!value)return '';
 const date=/^\d{4}-\d{2}-\d{2}$/.test(value)?new Date(value+'T12:00:00Z'):null;
 if(!date||isNaN(date.getTime()))return value;
 return style==='year'?String(date.getUTCFullYear()):
  new Intl.DateTimeFormat(language==='de'?'de-DE':'en-US',{year:'numeric',month:'short',timeZone:'UTC'}).format(date);
}
export function qualityWarnings(doc:ResumeDoc){
 const items:string[]=[];
 if(!doc.contact.name.trim())items.push('Add your full name.');
 if(!doc.contact.email&&!doc.contact.phone)items.push('Add at least one contact method.');
 if(doc.summary.length>850&&doc.summaryVisible)items.push('Your summary may be difficult to scan. Consider shortening it.');
 const used=new Set<string>();
 for(const section of doc.sections.filter(s=>s.visible)){
  const key=section.title.trim().toLowerCase();
  if(used.has(key))items.push('Duplicate section heading: '+section.title);
  used.add(key);
  for(const entry of section.entries.filter(e=>e.visible)){
   if(!entry.title.trim())items.push('An entry in '+section.title+' needs a title.');
   if(entry.endedOn&&entry.startedOn&&entry.startedOn>entry.endedOn)items.push('Check dates in '+entry.title+'.');
  }
  if(section.kind==='custom'&&!section.entries.some(e=>e.visible))items.push('Custom section '+section.title+' is empty.');
 }
 return items;
}
export const sectionLabels:Record<Exclude<ResumeKind,'custom'>,string>=Object.fromEntries(
 Object.keys(kindLabels).map(k=>[k,headings[k as Exclude<ResumeKind,'custom'>]])
) as Record<Exclude<ResumeKind,'custom'>,string>;
