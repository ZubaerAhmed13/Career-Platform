import {describe,it,expect} from 'vitest';
import {careerKinds,recordSchema,evidenceSchema,vaultCounts} from '../src/lib/career/schema';
import {validateInterviewOutput} from '../src/lib/career/ai-validation';

describe('Career Vault schema',()=>{
 it('offers each relevant record type',()=>{expect(careerKinds).toHaveLength(8);});
 it('requires a real title and valid date order',()=>{
  expect(recordSchema.safeParse({kind:'experience',title:''}).success).toBe(false);
  expect(recordSchema.safeParse({kind:'experience',title:'Analyst',started_on:'2025-06-01',ended_on:'2025-01-01'}).success).toBe(false);
  expect(recordSchema.safeParse({kind:'experience',title:'Analyst',is_current:true,ended_on:'2025-01-01'}).success).toBe(false);
 });
 it('accepts international characters',()=>{
  const data=recordSchema.parse({kind:'experience',title:'Führungskraft 東京',organization:'Université de Paris'});
  expect(data.title).toBe('Führungskraft 東京');
 });
 it('rejects overly long excerpts and non-web source links',()=>{
  expect(evidenceSchema.safeParse({title:'Record',evidence_type:'url',source_url:'javascript:alert(1)'}).success).toBe(false);
  expect(evidenceSchema.safeParse({title:'Record',evidence_type:'note',excerpt:'x'.repeat(4001)}).success).toBe(false);
 });
 it('counts real saved categories instead of fabricated completion',()=>{
  const counts=vaultCounts([{kind:'experience',status:'confirmed'},{kind:'skill',status:'unreviewed'}]);
  expect(counts.total).toBe(2);expect(counts.pending).toBe(1);
  expect(counts.counts.experience).toBe(1);expect(counts.counts.certification).toBe(0);
 });
});
describe('AI validation and career evidence',()=>{
 const answer='I led inventory checks and used Excel daily for replenishment decisions.';
 it('accepts schema-valid responses without auto-confirming facts',()=>{
  const result=validateInterviewOutput({scope:'career',reply:'What did you improve?',suggestions:[{
   kind:'skill',title:'Excel',description:'Used Excel for replenishment decisions.',
   evidence_quote:'used Excel daily',
  }]},answer);
  expect(result.suggestions).toHaveLength(1);
 });
 it('removes suggestions without a verbatim user quote',()=>{
  const result=validateInterviewOutput({scope:'career',reply:'Tell me more.',suggestions:[{
    kind:'achievement',title:'Reduced costs 40%',description:'Fabricated metric',
    evidence_quote:'reduced costs by 40%',
  }]},answer);
  expect(result.suggestions).toHaveLength(0);
 });
 it('refuses off-topic requests without copying a model-generated general answer',()=>{
  const result=validateInterviewOutput({scope:'off_topic',reply:'Here is unrelated advice',
   suggestions:[{kind:'skill',title:'Fake result',description:'Never approve this',evidence_quote:'used Excel daily'}]},answer);
  expect(result.scope).toBe('off_topic');
  expect(result.reply).toContain('only to help document your real career');
  expect(result.suggestions).toEqual([]);
 });
 it('rejects unrecognized intent classifications',()=>{
  expect(()=>validateInterviewOutput({scope:'general_chat',reply:'Chat',suggestions:[]},answer)).toThrow();
 });
 it('rejects malformed AI output',()=>{
  expect(()=>validateInterviewOutput({scope:'career',reply:'',suggestions:[{}]},answer)).toThrow();
  expect(()=>validateInterviewOutput({scope:'career',reply:'Hi',suggestions:[]},answer)).not.toThrow();
 });
});
