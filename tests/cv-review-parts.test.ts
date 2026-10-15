import {describe,it,expect} from 'vitest';
import {planCvReviewParts} from '../src/lib/career/cv-review-parts';
import {extractCareerSections} from '../src/lib/career/cv-sections';

describe('full-length private CV review planner',()=>{
 it('preserves every original character without uploading or truncating',()=>{
  const text='Work Experience\n'+('Verified responsibilities and project outcomes\n'.repeat(220))+'\nEducation\nDegree in finance';
  const parts=planCvReviewParts(text);
  expect(parts.length).toBeGreaterThan(1);
  expect(parts.map(p=>p.original).join('')).toBe(text);
  for(const part of parts)expect(part.text.length).toBeLessThanOrEqual(4000);
  expect(parts[0].label).toContain('of '+parts.length);
 });
 it('keeps source headings when a section continues across review parts',()=>{
  const text='Work Experience\n'+('Audited cycle counts across shifts.\n'.repeat(170));
  const parts=planCvReviewParts(text);
  expect(parts.length).toBeGreaterThan(1);
  expect(parts[1].text).toMatch(/^Work Experience\n/);
  expect(parts.map(p=>p.original).join('')).toBe(text);
 });
 it('handles a long, uninterrupted line without losing text',()=>{
  const original='Education\n'+('Relevant finance coursework '.repeat(430));
  const parts=planCvReviewParts(original);
  expect(parts.map(p=>p.original).join('')).toBe(original);
  expect(parts.every(p=>p.text.length<=4000)).toBe(true);
 });
 it('rejects unreadable or extreme input instead of silently dropping it',()=>{
  expect(()=>planCvReviewParts('short')).toThrow();
  expect(()=>planCvReviewParts('A'.repeat(100001))).toThrow();
 });
 it('can parse more than six source-backed candidates without changing default pasted-text limits',()=>{
  const text='Skills: Alpha, Bravo, Charlie, Delta, Echo, Foxtrot, Golf, Hotel';
  expect(extractCareerSections(text).suggestions).toHaveLength(6);
  const larger=extractCareerSections(text,20);
  expect(larger.suggestions).toHaveLength(8);
  expect(larger.omitted).toBe(0);
  larger.suggestions.forEach(candidate=>expect(text).toContain(candidate.evidence_quote));
 });
});
