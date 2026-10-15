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
  const bytes=makeResumeDocx(doc);
  validateLocalDocxArchive(bytes);
  const parsed=await extractRawText({buffer:Buffer.from(bytes)});
  expect(parsed.value).toContain('Zoë Résumé');
  expect(parsed.value).toContain('International analysis');
  expect(parsed.value).toContain('Prepared a bilingual project report.');
  expect(parsed.value).toContain('Compared costs and markets.');
  expect(parsed.value.indexOf('International analysis')).toBeLessThan(parsed.value.indexOf('Compared costs'));
 });
});
