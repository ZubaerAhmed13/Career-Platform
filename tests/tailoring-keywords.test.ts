import {describe,it,expect} from 'vitest';
import {inspectKeywordCoverage} from '../src/lib/tailoring/keywords';
import {newManualRequirement} from '../src/lib/tailoring/requirements';
import {emptyResume} from '../src/lib/resume/schema';
import type {CareerRecord} from '../src/lib/career/schema';
const record:CareerRecord={
 id:crypto.randomUUID(),user_id:crypto.randomUUID(),kind:'experience',title:'Stock control',
 description:'Used Excel for daily reporting.',organization:'Test',location:'',
 details:{},source:'manual',status:'confirmed',revision:1,started_on:null,ended_on:null,
 is_current:false,created_at:new Date().toISOString(),updated_at:new Date().toISOString()
};
describe('Explicit job keyword inspection',()=>{
 it('does not claim a confirmed Vault skill is on the resume until included',()=>{
  const requirement={...newManualRequirement('Microsoft Excel proficiency'),category:'tool' as const};
  const doc=emptyResume();
  expect(inspectKeywordCoverage([requirement],doc,[record])[0].status).toBe('confirmed-missing');
  doc.summary='Excel used for reporting';
  expect(inspectKeywordCoverage([requirement],doc,[record])[0].status).toBe('present');
  expect(record.description).toBe('Used Excel for daily reporting.');
 });
 it('never uses generic operations work as SAP FI/CO evidence',()=>{
  const requirement={...newManualRequirement('Advanced SAP FI/CO'),category:'tool' as const};
  const result=inspectKeywordCoverage([requirement],emptyResume(),[record]);
  expect(result.some(term=>term.status==='unsupported')).toBe(true);
 });
 it('ignores requirements not yet approved by the user',()=>{
  const r={...newManualRequirement('Power BI'),category:'tool' as const,review:'candidate' as const};
  expect(inspectKeywordCoverage([r],emptyResume(),[record])).toHaveLength(0);
 });
});
