import {describe,it,expect} from 'vitest';
import {emptyResume,entryFromRecord,duplicateDraft,formatDate,qualityWarnings,
 resumeDocSchema,safeExportName,templateIds,templateNames} from '../src/lib/resume/schema';
import {makeResumeDocx,resumeLines,resumePlainText,orderedSections} from '../src/lib/resume/exports';
import type {CareerRecord} from '../src/lib/career/schema';

const record:CareerRecord={
 id:'f1111111-1111-4111-8111-111111111111',user_id:'f2222222-2222-4222-8222-222222222222',
 revision:4,created_at:'2026-10-01T00:00:00Z',updated_at:'2026-10-02T00:00:00Z',
 kind:'experience',title:'Inventory operations',organization:'Sample Company',
 location:'City',description:'Maintained stock records without inventing metrics.',
 started_on:'2025-01-01',ended_on:null,is_current:true,details:{role_type:'Working student'},
 source:'manual',status:'confirmed'
};
describe('Resume Studio structured model',()=>{
 it('uses five distinct stable templates with correct defaults',()=>{
  expect(new Set(templateIds).size).toBe(5);
  for(const template of templateIds){expect(templateNames[template].length).toBeGreaterThan(3);
   expect(resumeDocSchema.safeParse(emptyResume(template,'Letter')).success).toBe(true);}
 });
 it('builds real source snapshots and never mutates master records',()=>{
  const before=structuredClone(record);
  const entry=entryFromRecord(record);
  expect(entry.source).toMatchObject({recordId:record.id,revision:4,kind:'experience'});
  expect(entry.extras).toEqual({});
  entry.title='Changed on resume only';
  expect(record).toEqual(before);
 });
 it('defaults to no photo, validates embedded JPEG and preserves user choice',()=>{
  const doc=emptyResume();
  expect(doc.contact.photo).toBe('');
  expect(doc.contact.showPhoto).toBe(false);
  doc.contact.photo='data:image/svg+xml;base64,PHN2Zy8+';doc.contact.showPhoto=true;
  expect(resumeDocSchema.safeParse(doc).success).toBe(false);
  doc.contact.photo='data:image/jpeg;base64,/9j/2Q==';
  expect(resumeDocSchema.safeParse(doc).success).toBe(true);
  const copy=duplicateDraft(doc);
  copy.contact.photo='';copy.contact.showPhoto=false;
  expect(doc.contact.showPhoto).toBe(true);
 });
 it('rejects pending/unapproved sources',()=>{
  expect(()=>entryFromRecord({...record,status:'unreviewed'})).toThrow(/confirmed/);
 });
 it('preserves content through copying and template switching',()=>{
  const d=emptyResume();d.sections[0].entries.push(entryFromRecord(record));
  const copy=duplicateDraft(d);
  copy.settings.template='executive-minimal';copy.sections[0].entries[0].title='New wording';
  expect(d.settings.template).toBe('ats-classic');
  expect(d.sections[0].entries[0].title).toBe('Inventory operations');
  copy.sections[0].entries[0].extras={department:'Finance'};
  expect(d.sections[0].entries[0].extras).toEqual({});
 });
 it('rejects invalid date strings and nonexistent dates',()=>{
  const doc=emptyResume();const entry=entryFromRecord(record);
  entry.startedOn='2026-02-30';doc.sections[0].entries.push(entry);
  expect(resumeDocSchema.safeParse(doc).success).toBe(false);
  entry.startedOn='2026-02-28';expect(resumeDocSchema.safeParse(doc).success).toBe(true);
 });
 it('validates unsafe links, oversized text and duplicate section identifiers',()=>{
  const d=emptyResume();d.contact.website='javascript:alert(1)';
  expect(resumeDocSchema.safeParse(d).success).toBe(false);
  d.contact.website='https://example.org';
  d.summary='x'.repeat(4001);expect(resumeDocSchema.safeParse(d).success).toBe(false);
  d.summary='';d.sections[1].id=d.sections[0].id;
  expect(resumeDocSchema.safeParse(d).success).toBe(false);
 });
 it('rejects duplicated entry and bullet IDs in imported or restored document snapshots',()=>{
  const doc=emptyResume();
  const first=entryFromRecord(record);
  const second=entryFromRecord(record);
  second.id=first.id;
  doc.sections[0].entries.push(first,second);
  expect(resumeDocSchema.safeParse(doc).success).toBe(false);
  second.id=crypto.randomUUID();
  const repeatedBullet=structuredClone(first.bullets[0]);
  second.bullets.push(repeatedBullet);
  expect(resumeDocSchema.safeParse(doc).success).toBe(false);
  second.bullets[0].id=crypto.randomUUID();
  expect(resumeDocSchema.safeParse(doc).success).toBe(true);
 });
 it('warns only through transparent deterministic checks',()=>{
  const d=emptyResume();expect(qualityWarnings(d)).toContain('Add your full name.');
  expect(qualityWarnings(d)).toContain('Add at least one contact method.');
  d.contact.name='Sample';d.contact.email='sample@example.org';
  expect(qualityWarnings(d)).not.toContain('Add your full name.');
 });
 it('applies dates and filenames safely',()=>{
  expect(formatDate('2026-05-01','year')).toBe('2026');
  expect(formatDate('','month-year')).toBe('');
  expect(safeExportName('../secret? token','docx')).not.toContain('..');
  expect(safeExportName('Example Student','pdf')).toBe('Example_Student.pdf');
 });
 it('keeps visible section order and graduate education-first variant',()=>{
  const d=emptyResume();
  d.sections[0].entries.push(entryFromRecord(record));
  const education={...entryFromRecord(record),id:crypto.randomUUID(),source:null,title:'Education'};
  d.sections[1].entries.push(education);
  expect(orderedSections(d)[0].kind).toBe('experience');
  d.settings.template='student-graduate';
  expect(orderedSections(d)[0].kind).toBe('experience'); // preserve deliberate user order
  const fresh=emptyResume('student-graduate');
  expect(fresh.sections[0].kind).toBe('education'); // education-first default
  expect(resumeLines(d).map(l=>l.text).join(' ')).toContain('Education');
 });
 it('exports plain text with bullets and no editor controls',()=>{
  const d=emptyResume();d.contact.name='Test Writer';
  d.sections[0].entries.push(entryFromRecord(record));
  const text=resumePlainText(d);
  expect(text).toContain('Test Writer');
  expect(text).toContain('Inventory operations');
  expect(text).toContain('• Maintained stock records');
  expect(text).not.toContain('Save version');
 });
 it('creates a real ZIP-based OOXML package with editable paragraph text',()=>{
  const d=emptyResume();d.contact.name='Test Writer';
  d.sections[0].entries.push(entryFromRecord(record));
  for(const paper of ['A4','Letter'] as const){
   d.settings.paper=paper;
   const bytes=makeResumeDocx(d);
   expect([...bytes.slice(0,4)]).toEqual([0x50,0x4b,0x03,0x04]);
   const data=new TextDecoder().decode(bytes);
   expect(data).toContain('[Content_Types].xml');
   expect(data).toContain('word/document.xml');
   expect(data).toContain('w:numPr');
   expect(data).toContain('Test Writer');
   expect(data).toContain('Inventory operations');
   expect(bytes.length).toBeGreaterThan(2000);
  }
 });
});
