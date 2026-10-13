import {describe,it,expect} from 'vitest';
import {extractCareerSections} from '../src/lib/career/cv-sections';
describe('provider-free source-backed CV segmentation',()=>{
 it('splits section-labelled professional facts into pending candidates',()=>{
  const text='Work Experience\nOperations Associate at Example GmbH\nInventory and replenishment\n\nEducation\nMaster of Entrepreneurship\nExample University\n\nProjects\nCustomer experience research\nInterviewed students';
  const result=extractCareerSections(text);
  expect(result.recognized).toBe(true);
  expect(result.suggestions.map(s=>s.kind)).toEqual(['experience','education','project']);
  expect(result.suggestions[0].title).toBe('Operations Associate at Example GmbH');
  expect(result.suggestions[0].description).toContain('Inventory and replenishment');
  for(const s of result.suggestions)expect(text).toContain(s.evidence_quote);
 });
 it('recognizes skill and language lists without making up proficiency',()=>{
  const result=extractCareerSections('Technical Skills: Excel, SQL, SAP reporting\nLanguages: English, German, French',6);
  expect(result.suggestions.map(s=>s.title)).toEqual(['Excel','SQL','SAP reporting','English','German','French']);
  expect(result.suggestions[4].description).not.toContain('C1');
 });
 it('does not fabricate records for unrecognizable CV text',()=>{
  const result=extractCareerSections('I helped my department coordinate its daily operations.');
  expect(result.recognized).toBe(false);
  expect(result.suggestions).toEqual([]);
 });
 it('caps output and reports omitted candidates',()=>{
  const input='Skills: Alpha, Bravo, Charlie, Delta, Echo, Foxtrot, Golf, Hotel';
  const result=extractCareerSections(input);
  expect(result.suggestions).toHaveLength(6);
  expect(result.omitted).toBe(2);
 });
});


describe('source-quote integrity for CV punctuation and short skills',()=>{
 it('keeps an explicit standalone short skill with its original heading as evidence',()=>{
  const text='Skills: SQL\n\nEducation\nBusiness degree at University';
  const result=extractCareerSections(text);
  expect(result.suggestions.map(s=>s.title)).toContain('SQL');
  expect(text).toContain(result.suggestions.find(s=>s.title==='SQL')?.evidence_quote??'not found');
 });
 it('avoids normalized multi-line quotes that are absent from the source',()=>{
  const text='Work Experience\r\n  - Operations support at Example GmbH\r\n    Manual stock counts and audits';
  const result=extractCareerSections(text);
  expect(result.suggestions.length).toBeGreaterThan(0);
  for(const item of result.suggestions)expect(text).toContain(item.evidence_quote);
 });
});


describe('conservative labeled structured fields',()=>{
 it('extracts explicitly labelled employer, location and ISO start/end dates only',()=>{
  const input=[
   'Work Experience',
   'Working student — Inventory',
   'Employer: Example GmbH',
   'Location: Worms',
   'Start: 2025-02-01',
   'End: 2026-07-31',
   'I performed stock checks and replenishment.',
  ].join('\n');
  const result=extractCareerSections(input);
  expect(result.suggestions).toHaveLength(1);
  expect(result.suggestions[0]).toMatchObject({
   kind:'experience',organization:'Example GmbH',
   location:'Worms',started_on:'2025-02-01',
   ended_on:'2026-07-31',is_current:false,
  });
  expect(input).toContain(result.suggestions[0].evidence_quote);
 });
 it('does not turn ambiguous or invalid dates into fabricated dates',()=>{
  const input=[
   'Education',
   'Master of Example',
   'Institution: University of Example',
   'Start: October 2024',
   'End: 2025-02-30',
   'Coursework in business analysis.',
  ].join('\n');
  const proposal=extractCareerSections(input).suggestions[0];
  expect(proposal.organization).toBe('University of Example');
  expect(proposal.started_on).toBe(null);
  expect(proposal.ended_on).toBe(null);
 });
 it('accepts only explicitly current dates with no end date inferred',()=>{
  const input=[
   'Work Experience',
   'Operations associate',
   'Organization: Example Cooperative',
   'Start: 2025-09-01',
   'End: Present',
   'I monitored product replenishment.',
  ].join('\n');
  const result=extractCareerSections(input).suggestions[0];
  expect(result.is_current).toBe(true);
  expect(result.started_on).toBe('2025-09-01');
  expect(result.ended_on).toBe(null);
 });
});
