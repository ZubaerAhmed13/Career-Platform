import {describe,it,expect} from 'vitest';
import {emptyResume} from '../src/lib/resume/schema';
import {reviewResumeBeforeExport} from '../src/lib/resume/export-review';

function sample(){
 const doc=emptyResume();
 doc.contact.name='Example Candidate';
 doc.contact.email='candidate@example.org';
 doc.sections[0].entries.push({
  id:crypto.randomUUID(),title:'Analyst',subtitle:'Example Employer',
  location:'Test City',startedOn:'2025-01-01',endedOn:'',current:true,
  visible:true,extras:{},source:null,bullets:[
   {id:crypto.randomUUID(),text:'Prepared monthly inventory reports.',visible:true}
  ]
 });
 return doc;
}
describe('Local resume pre-export review',()=>{
 it('allows a structurally valid, fully reviewed fictional resume',()=>{
  expect(reviewResumeBeforeExport(sample())).toEqual({errors:[],warnings:[]});
 });
 it('identifies missing contact details, empty resumes and long bullets without blocking truthful export',()=>{
  const doc=emptyResume();
  doc.summary='Prepared student profile.';
  const missing=reviewResumeBeforeExport(doc);
  expect(missing.errors).toEqual([]);
  expect(missing.warnings).toContain('Add your full name.');
  expect(missing.warnings).toContain('The resume has no visible career entries.');
  const longer=sample();
  longer.sections[0].entries[0].bullets[0].text='Described reporting work '.repeat(11);
  expect(reviewResumeBeforeExport(longer).warnings).toContain(
   'One or more bullets exceed 230 characters; review the document layout.');
 });
 it('asks for original evidence for unproven numerical achievements',()=>{
  const doc=sample();
  doc.sections[0].entries[0].bullets[0].text='Improved processing efficiency by 35%.';
  expect(reviewResumeBeforeExport(doc).warnings).toContain(
   'Check percentage achievements against original evidence before using them.');
 });
 it('compares the exact claimed percentage, not merely the presence of any percentage',()=>{
  const doc=sample();
  const entry=doc.sections[0].entries[0];
  entry.source={
   recordId:crypto.randomUUID(),revision:1,kind:'experience',
   capturedAt:'2026-10-22T12:00:00.000Z',
   title:'Analyst',organization:'Example Employer',
   description:'Reduced processing errors by 35% in the approved source.'
  };
  entry.bullets[0].text='Reduced processing errors by 35%.';
  expect(reviewResumeBeforeExport(doc).warnings).not.toContain(
   'Check percentage achievements against original evidence before using them.');
  entry.bullets[0].text='Reduced processing errors by 45%.';
  expect(reviewResumeBeforeExport(doc).warnings).toContain(
   'Check percentage achievements against original evidence before using them.');
 });
 it('blocks invalid URLs, duplicate IDs and impossible dates before PDF/DOCX/text',()=>{
  const doc=sample();
  doc.contact.website='javascript:alert(1)';
  expect(reviewResumeBeforeExport(doc).errors.length).toBeGreaterThan(0);
  doc.contact.website='';
  doc.sections[0].entries[0].startedOn='2026-02-30';
  expect(reviewResumeBeforeExport(doc).errors.length).toBeGreaterThan(0);
 });
});
