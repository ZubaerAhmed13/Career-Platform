import {describe,it,expect} from 'vitest';
import {extractRequirements,newManualRequirement,splitRequirement,mergeRequirements} from '../src/lib/tailoring/requirements';
import {jobBriefSchema} from '../src/lib/tailoring/schema';
import {findEvidence,coverage,detectLanguageGap,compareResume} from '../src/lib/tailoring/matching';
import {emptyResume} from '../src/lib/resume/schema';
import type {CareerRecord} from '../src/lib/career/schema';
import type {JobRequirement} from '../src/lib/tailoring/schema';

function fact(kind:CareerRecord['kind'],title:string,description:string,status:CareerRecord['status']='confirmed'):CareerRecord{
 return {id:crypto.randomUUID(),user_id:crypto.randomUUID(),revision:2,
  kind,title,description,organization:'Test Organisation',location:'',
  details:{},status,source:'manual',started_on:null,ended_on:null,is_current:false,
  created_at:new Date().toISOString(),updated_at:new Date().toISOString()};
}
function requirement(text:string,category:JobRequirement['category']='tool'):JobRequirement{
 return {...newManualRequirement(text),category,priority:'essential'};
}
describe('Job-targeted resume intelligence without models',()=>{
 it('extracts source lines, preserves priority, OR conditions and candidate state',()=>{
  const content='What you bring:\n- Microsoft Excel experience required\n- SAP or Oracle knowledge preferred\n- Bachelor degree or equivalent experience\n';
  const items=extractRequirements(content);
  expect(items).toHaveLength(3);
  expect(items[0]).toMatchObject({priority:'essential',review:'candidate',origin:'detected'});
  expect(items[0].excerpt).toContain('Microsoft Excel');
  expect(content.slice(items[0].position)).toContain('Microsoft Excel');
  expect(items[1]).toMatchObject({priority:'preferred',relation:'alternative'});
  expect(items[2].relation).toBe('alternative');
 });
 it('requires human review again after splitting or merging requirements',()=>{
  const source={...newManualRequirement('Excel and PowerPoint'),review:'approved' as const,priority:'essential' as const};
  const split=splitRequirement(source,'Excel','PowerPoint');
  expect(split).toHaveLength(2);
  expect(split[0].review).toBe('candidate');
  expect(split[1].priority).toBe('unclassified');
  expect(new Set(split.map(v=>v.id)).size).toBe(2);
  const merged=mergeRequirements(split[0],split[1]);
  expect(merged.review).toBe('candidate');
  expect(merged.relation).toBe('compound');
  expect(merged.origin).toBe('user');
  expect(()=>splitRequirement(source,'','PowerPoint')).toThrow();
 });
 it('preserves working-hour numbers while recognising proficiency and certification words',()=>{
  const source='20 working hours per week required\nProficiency in stakeholder communication essential\nCertification is preferred';
  const items=extractRequirements(source);
  expect(items.some(x=>x.text.startsWith('20 working hours'))).toBe(true);
  expect(items.some(x=>x.text.startsWith('Proficiency'))).toBe(true);
  expect(items.some(x=>x.text.startsWith('Certification'))).toBe(true);
 });
 it('does not silently classify optional as mandatory',()=>{
  const r=extractRequirements('Preferred: Proficiency using Power BI and Excel.');
  expect(r[0].priority).toBe('preferred');
 });
 it('validates limits, URL scheme, unique requirements, source and manual labelling',()=>{
  const r=newManualRequirement('Confirmed project coordination');
  const input={jobTitle:'Analyst',originalDescription:'This is a genuine long example job description with tasks and expectations.',requirements:[r]};
  expect(jobBriefSchema.safeParse(input).success).toBe(true);
  expect(jobBriefSchema.safeParse({...input,requirements:[r,r]}).success).toBe(false);
  expect(jobBriefSchema.safeParse({...input,jobUrl:'file:///etc/passwd'}).success).toBe(false);
  expect(jobBriefSchema.safeParse({...input,originalDescription:'tiny'}).success).toBe(false);
  expect(r.origin).toBe('user');
 });
 it('matches explicit credentials only in the corresponding approved category',()=>{
  const degree=fact('education','Bachelor of Business Administration','Completed Bachelor degree in Business');
  expect(findEvidence(requirement('Bachelor degree','qualification'),[degree]).status).toBe('direct');
  const ongoing={...degree,is_current:true};
  expect(findEvidence(requirement('Bachelor degree','qualification'),[ongoing]).status).toBe('related');
  const cert=fact('certification','PMP','Project Management Professional (PMP) certificate');
  expect(findEvidence(requirement('PMP certification','certification'),[cert]).status).toBe('direct');
 });
 it('does not invent SAP competence or regulated qualifications',()=>{
  const records=[fact('experience','Warehouse','Maintained inventory records')];
  expect(findEvidence(requirement('Advanced SAP FI/CO experience'),records).status).toBe('none');
  expect(findEvidence(requirement('Qualified tax adviser certification','certification'),
   [fact('education','BBA in Finance','Degree in Finance')]).status).toBe('none');
 });
 it('distinguishes documented Excel work and controlled inventory synonyms',()=>{
  const records=[fact('experience','Operations','Used Excel for inventory reporting'),
   fact('experience','Stock control','Performed cycle counts weekly')];
  expect(findEvidence(requirement('Microsoft Excel experience'),records).status).toBe('direct');
  expect(findEvidence(requirement('Inventory cycle counting','skill'),records).matches).toHaveLength(1);
 });
 it('flags under-qualified German rather than claiming fluency',()=>{
  expect(detectLanguageGap('Business-fluent German required','German A1')).toMatch(/not supported/);
  expect(findEvidence(requirement('Business-fluent German required','language'),
   [fact('language','German','German A1')]).status).toBe('none');
 });
 it('ignores unreviewed facts and counts only approved job criteria',()=>{
  const a=requirement('Microsoft Excel'),b={...requirement('Oracle'),review:'candidate' as const};
  const rows=[findEvidence(a,[fact('skill','Excel','Skilled with Excel'),fact('skill','Oracle','Oracle','unreviewed')]),
   findEvidence(b,[])];
  expect(coverage(rows)).toMatchObject({total:1,direct:1,missing:0,essential:1,essentialDirect:1});
 });
 it('maintains source snapshot and enumerates differences instead of arbitrary match scores',()=>{
  const original=emptyResume(),copy=structuredClone(original);
  copy.summary='User-written professional summary';
  copy.sections.reverse();
  const report=compareResume(original,copy);
  expect(report.some(change=>change.kind==='changed'&&change.label==='Professional summary')).toBe(true);
  expect(report.some(change=>change.kind==='moved')).toBe(true);
  expect(original.summary).toBe('');
 });
});
