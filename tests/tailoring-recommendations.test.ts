import {describe,it,expect} from 'vitest';
import {contentSuggestions,wordingPrompts,sourceChangeWarnings} from '../src/lib/tailoring/recommendations';
import {findEvidence} from '../src/lib/tailoring/matching';
import {emptyResume} from '../src/lib/resume/schema';
import {newManualRequirement} from '../src/lib/tailoring/requirements';
import type {CareerRecord} from '../src/lib/career/schema';

const record:CareerRecord={
 id:'88888888-8888-4888-8888-888888888888',user_id:'99999999-9999-4999-8999-999999999999',
 kind:'experience',title:'Stock control',description:'Performed cycle counts and used Excel for reporting.',
 organization:'Synthetic test',location:'',details:{},status:'confirmed',source:'manual',revision:3,
 is_current:false,started_on:null,ended_on:null,created_at:'2026-01-01T00:00:00.000Z',
 updated_at:'2026-01-02T00:00:00.000Z'
};
describe('Evidence-backed content recommendations',()=>{
 it('recommends only confirmed records linked to approved criteria',()=>{
  const requirement={...newManualRequirement('Microsoft Excel'),category:'tool' as const};
  const rows=[findEvidence(requirement,[record])];
  const found=contentSuggestions(rows,[record],null);
  expect(found).toHaveLength(1);
  expect(found[0].recordId).toBe(record.id);
  expect(found[0].requirements).toContain('Microsoft Excel');
  const unreviewed={...record,status:'unreviewed' as const};
  expect(contentSuggestions(rows,[unreviewed],null)).toHaveLength(0);
 });
 it('does not duplicate already selected source facts',()=>{
  const doc=emptyResume();
  doc.sections.find(s=>s.kind==='experience')!.entries.push({
   id:crypto.randomUUID(),title:record.title,subtitle:'',location:'',startedOn:'',endedOn:'',
   current:false,visible:true,extras:{},bullets:[],source:{
    recordId:record.id,revision:record.revision,kind:record.kind,
    capturedAt:'2026-01-01T00:00:00.000Z',title:record.title,
    organization:record.organization,description:record.description
   }
  });
  expect(contentSuggestions([findEvidence({...newManualRequirement('Excel'),category:'tool'},[record])],
   [record],doc)).toEqual([]);
  expect(sourceChangeWarnings(doc,[{...record,revision:4}])).toHaveLength(1);
 });
 it('offers writing advice without silently rewriting or inventing achievements',()=>{
  const doc=emptyResume();
  doc.sections[0].entries.push({
   id:crypto.randomUUID(),title:'Role',subtitle:'',location:'',startedOn:'',endedOn:'',
   current:false,visible:true,extras:{},source:null,bullets:[
    {id:crypto.randomUUID(),visible:true,text:'Responsible for inventory work'},
    {id:crypto.randomUUID(),visible:true,text:'Increased revenue by 35%'}
   ]
  });
  const prompts=wordingPrompts(doc);
  expect(prompts.some(p=>p.message.includes('action verb'))).toBe(true);
  expect(prompts.some(p=>p.message.includes('numerical result'))).toBe(true);
  expect(doc.sections[0].entries[0].bullets[1].text).toBe('Increased revenue by 35%');
 });
});
