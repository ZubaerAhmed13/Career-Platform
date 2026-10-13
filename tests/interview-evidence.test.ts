import {describe,it,expect} from 'vitest';
import {onlySupportedSuggestions} from '../src/lib/career/interview-evidence';
import {trackGuide,focusGuide,interviewFocuses} from '../src/lib/career/interview-coach';
import {interviewTopics} from '../src/lib/career/prompts';

const candidate=(title:string,description:string,quote:string)=>({
 kind:'achievement',title,description,evidence_quote:quote,
});
describe('evidence-based, non-invented candidate facts',()=>{
 it('passes a directly quoted qualitative result',()=>{
  const answer='I redesigned replenishment checklists with our team and received positive feedback.';
  const c=candidate('Improved checklists','received positive feedback','received positive feedback');
  expect(onlySupportedSuggestions([c],answer)).toHaveLength(1);
 });
 it('rejects unquoted new percentages, headcounts and dates',()=>{
  const answer='I helped our team reduce picking errors with new checks.';
  expect(onlySupportedSuggestions([candidate('Reduced errors 35%','Improved quality','reduce picking errors')],answer)).toHaveLength(0);
  expect(onlySupportedSuggestions([candidate('Stock control','Managed 12 staff','helped our team reduce picking errors')],answer)).toHaveLength(0);
  expect(onlySupportedSuggestions([candidate('Stock control 2024','Helped','helped our team reduce picking errors')],answer)).toHaveLength(0);
 });
 it('does not accept quotes from some other conversation answer',()=>{
  expect(onlySupportedSuggestions([candidate('Excel','Used Excel','used Excel daily')],
   'I explained cycle counts today.')).toHaveLength(0);
 });
 it('normalizes duplicates and respects quantity limit',()=>{
  const source='I used Excel in replenishment, I used Excel in replenishment.';
  const c={kind:'skill',title:'Excel',description:'Used Excel',evidence_quote:'I used Excel in replenishment'};
  expect(onlySupportedSuggestions([c,{...c,title:' excel '},c],source)).toHaveLength(1);
 });
});
describe('professional track guides',()=>{
 it('includes every permanent career category track',()=>{
  for(const topic of interviewTopics){
   expect(trackGuide[topic].opener.length).toBeGreaterThan(30);
   expect(trackGuide[topic].goal.length).toBeGreaterThan(30);
  }
 });
 it('keeps all five STAR-E interview dimensions available',()=>{
  expect(interviewFocuses).toEqual(['context','responsibility','action','outcome','evidence']);
  for(const lens of interviewFocuses)expect(focusGuide[lens].guidance.length).toBeGreaterThan(25);
 });
});
