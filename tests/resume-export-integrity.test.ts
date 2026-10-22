import {describe,it,expect} from 'vitest';
import {extractRawText} from 'mammoth';
import {emptyResume,entryFromRecord} from '../src/lib/resume/schema';
import {makeResumeDocx} from '../src/lib/resume/exports';
import {validateLocalDocxArchive} from '../src/lib/career/browser-cv-security';
import type {CareerRecord} from '../src/lib/career/schema';

describe('real editable DOCX integrity',()=>{
 it('opens with a separate Word-compatible parser and preserves order, bullets and Unicode',async()=>{
  const doc=emptyResume('european-clean','A4');
  doc.contact.name='Zoë Résumé';
  doc.contact.email='zoe@example.org';
  const example={
   id:crypto.randomUUID(),user_id:crypto.randomUUID(),revision:1,
   created_at:new Date().toISOString(),updated_at:new Date().toISOString(),
   kind:'project',title:'International analysis',organization:'Example University',
   location:'Brüssel',description:'Prepared a bilingual project report.\nCompared costs and markets.',
   started_on:'2024-01-01',ended_on:'2024-12-31',is_current:false,
   details:{},status:'confirmed',source:'manual'
  } satisfies CareerRecord;
  doc.sections.find(s=>s.kind==='project')!.entries.push(entryFromRecord(example));
  doc.contact.photo='data:image/jpeg;base64,'+Buffer.from([0xff,0xd8,0xff,0xd9]).toString('base64');
  doc.contact.showPhoto=true;
  const bytes=makeResumeDocx(doc);
  validateLocalDocxArchive(bytes);
  expect(new TextDecoder().decode(bytes)).toContain('word/media/portrait.jpg');
  expect(new TextDecoder().decode(bytes)).toContain('a:blip r:embed="rId3"');
  const parsed=await extractRawText({buffer:Buffer.from(bytes)});
  expect(parsed.value).toContain('Zoë Résumé');
  expect(parsed.value).toContain('International analysis');
  expect(parsed.value).toContain('Prepared a bilingual project report.');
  expect(parsed.value).toContain('Compared costs and markets.');
  expect(parsed.value.indexOf('International analysis')).toBeLessThan(parsed.value.indexOf('Compared costs'));
 });

 it('preserves five distinctive editable template styles and page choices without losing content',async()=>{
  const themes=['ats-classic','modern-professional','student-graduate',
   'european-clean','executive-minimal'] as const;
  const outputs=new Set<string>();
  for(const template of themes){
   const doc=emptyResume(template,'A4');
   doc.settings.accent='#0f766e';
   doc.contact.name='Sample Candidate';
   doc.contact.headline='Finance and operations';
   doc.contact.email='test@example.org';
   doc.summary='Validated fictional professional profile.';
   doc.sections.find(s=>s.kind==='experience')!.entries.push(entryFromRecord({
    id:crypto.randomUUID(),user_id:crypto.randomUUID(),revision:1,
    created_at:'2026-10-22T12:00:00.000Z',updated_at:'2026-10-22T12:00:00.000Z',
    kind:'experience',status:'confirmed',source:'manual',
    title:'Operations Analyst',organization:'Example Employer',location:'Test City',
    description:'Prepared a weekly report.',started_on:'2025-01-01',ended_on:null,
    is_current:true,details:{}
   }));
   const bytes=makeResumeDocx(doc);
   validateLocalDocxArchive(bytes);
   const zip=new TextDecoder().decode(bytes);
   const start=zip.indexOf('<w:styles '),end=zip.indexOf('</w:styles>')+'</w:styles>'.length;
   const styles=zip.slice(start,end);
   expect(start).toBeGreaterThan(-1);
   for(const id of ['Normal','Name','Headline','Contact','Section','Entry','Meta','Summary','Bullet'])
    expect(styles).toContain('w:styleId="'+id+'"');
   expect(zip).toContain('<w:pgMar w:top="907"');
   expect(zip).toContain('w:pStyle w:val="Bullet"');
   if(template==='ats-classic'){
    expect(styles).toContain('<w:color w:val="000000"/>');
    expect(styles).toContain('w:sz="8"');
   }
   if(template==='modern-professional')
    expect(styles).toContain('<w:left w:val="single"');
   if(template==='student-graduate')
    expect(styles).toContain('<w:jc w:val="center"/>');
   if(template==='european-clean')
    expect(styles).toContain('<w:shd w:val="clear" w:fill="EEF2F7"/>');
   if(template==='executive-minimal')
    expect(styles).toContain('<w:caps/>');
   const parsed=await extractRawText({buffer:Buffer.from(bytes)});
   expect(parsed.value).toContain('Sample Candidate');
   expect(parsed.value).toContain('Operations Analyst');
   expect(parsed.value).toContain('Prepared a weekly report.');
   outputs.add(styles);
  }
  expect(outputs.size).toBe(5);
  const compact=emptyResume('ats-classic','Letter');
  compact.settings.margin='compact';
  const zipped=new TextDecoder().decode(makeResumeDocx(compact));
  expect(zipped).toContain('<w:pgSz w:w="12240" w:h="15840"/>');
  expect(zipped).toContain('<w:pgMar w:top="624"');
 });

});
