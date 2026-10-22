import {describe,it,expect} from 'vitest';
import {extractRequirements,newManualRequirement,splitRequirement,mergeRequirements,reviseRequirement} from '../src/lib/tailoring/requirements';
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
 it('requires explicit approval after changing the meaning of an accepted criterion',()=>{
  const original={...newManualRequirement('Experience with Microsoft Excel'),review:'approved' as const};
  const changed=reviseRequirement(original,{text:'Advanced SAP FI/CO experience'});
  expect(changed).toMatchObject({review:'candidate',origin:'user'});
  expect(original.review).toBe('approved');
  expect(reviseRequirement(original,{priority:'essential'}).review).toBe('candidate');
  expect(reviseRequirement(original,{review:'rejected'}).review).toBe('rejected');
  expect(reviseRequirement(original,{text:original.text}).review).toBe('approved');
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
 it('leaves mixed mandatory and preferred requirements unclassified for human review',()=>{
  const extracted=extractRequirements('Microsoft Excel required; Power BI preferred');
  expect(extracted).toHaveLength(1);
  expect(extracted[0]).toMatchObject({
   priority:'unclassified',relation:'compound',review:'candidate'
  });
  // A requirement with a single explicit priority retains that priority.
  expect(extractRequirements('Microsoft Excel required')[0].priority).toBe('essential');
  expect(extractRequirements('Power BI preferred')[0].priority).toBe('preferred');
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
 it('quotes the actual matched Career Vault field rather than an unrelated description',()=>{
  const record={...fact('skill','Reporting','Produced routine reporting notes.'),
   details:{software:'Power BI'}};
  const found=findEvidence(requirement('Power BI','tool'),[record]);
  expect(found.status).toBe('direct');
  expect(found.matches[0].excerpt).toContain('Detail · software: Power BI');
  expect(found.matches[0].excerpt).not.toContain('Produced routine reporting notes.');
 });
 it('does not count company names or unrelated activity as tool proficiency',()=>{
  const namedEmployer={...fact('experience','Customer service','Managed customer enquiries.'),
   organization:'Excel Analytics Limited'};
  expect(findEvidence(requirement('Microsoft Excel experience'),[namedEmployer]).status).toBe('none');
  const passingMention=fact('experience','Customer service',
   'Managed customer enquiries. Familiar with Excel.');
  expect(findEvidence(requirement('Microsoft Excel experience'),[passingMention]).status).toBe('related');
  const supported=fact('experience','Stock analyst','Created inventory reports using Microsoft Excel.');
  expect(findEvidence(requirement('Microsoft Excel experience'),[supported]).status).toBe('direct');
 });
 it('flags under-qualified German rather than claiming fluency',()=>{
  expect(detectLanguageGap('Business-fluent German required','German A1')).toMatch(/not supported/);
  expect(findEvidence(requirement('Business-fluent German required','language'),
   [fact('language','German','German A1')]).status).toBe('none');
 });
 it('never treats C2 as native or German A1 as fluent when ad says fluently',()=>{
  const nativeRequirement=requirement('Native German speaker required','language');
  expect(findEvidence(nativeRequirement,[fact('language','German','German C2')]).status).toBe('none');
  expect(findEvidence(nativeRequirement,[fact('language','German','German native speaker')]).status).toBe('direct');
  const fluentRequirement=requirement('Must speak German fluently','language');
  expect(findEvidence(fluentRequirement,[fact('language','German','German A1')]).status).toBe('none');
  expect(findEvidence(fluentRequirement,[fact('language','German','German C1')]).status).toBe('direct');
  const cefrRequirement=requirement('German B2 required','language');
  expect(findEvidence(cefrRequirement,[fact('language','German','German B1')]).status).toBe('none');
  expect(findEvidence(cefrRequirement,[fact('language','German','German fluent')]).status).toBe('none');
  expect(findEvidence(cefrRequirement,[fact('language','German','German C1')]).status).toBe('direct');
 });
 it('does not read explicit non-native or not-fluent descriptions as positive proficiency',()=>{
  const nativeReq=requirement('Native German speaker required','language');
  expect(findEvidence(nativeReq,[fact('language','German','German non-native speaker C2')]).status).toBe('none');
  expect(findEvidence(nativeReq,[fact('language','German','German not a native speaker')]).status).toBe('none');
  const fluentReq=requirement('Fluent German required','language');
  expect(findEvidence(fluentReq,[fact('language','German','German not fluent')]).status).toBe('none');
  expect(findEvidence(fluentReq,[fact('language','German','German fluent')]).status).toBe('direct');
 });
 it('understands equivalent German and English language labels without inventing proficiency',()=>{
  const germanInDeutsch=fact('language','Deutsch','Deutsch A1');
  expect(findEvidence(requirement('Fluent German required','language'),[germanInDeutsch]).status).toBe('none');
  const englishRecord=fact('language','Englisch','Englisch C1');
  expect(findEvidence(requirement('English B2 required','language'),[englishRecord]).status).toBe('direct');
  const germanC1=fact('language','Deutsch','Deutsch C1');
  expect(findEvidence(requirement('German B2 required','language'),[germanC1]).status).toBe('direct');
 });
 it('ignores unreviewed facts and counts only approved job criteria',()=>{
  const a=requirement('Microsoft Excel'),b={...requirement('Oracle'),review:'candidate' as const};
  const rows=[findEvidence(a,[fact('skill','Excel','Skilled with Excel'),fact('skill','Oracle','Oracle','unreviewed')]),
   findEvidence(b,[])];
  expect(coverage(rows)).toMatchObject({total:1,direct:1,missing:0,essential:1,essentialDirect:1,
   preferred:0,preferredDirect:0,essentialAttention:0,preferredAttention:0});
 });

 it('reports hidden fields, portrait controls, bullet edits and document design changes',()=>{
  const original=emptyResume(),target=structuredClone(original);
  original.sections[0].entries.push({
   id:crypto.randomUUID(),title:'Role',subtitle:'',location:'',startedOn:'',endedOn:'',
   current:false,visible:true,extras:{},source:null,
   bullets:[{id:crypto.randomUUID(),text:'Performed reporting',visible:true}]
  });
  target.sections=structuredClone(original.sections);
  target.contact.linkedin='https://example.org/profile';
  target.contact.hidden.push('linkedin');
  target.contact.showPhoto=true;
  target.summaryVisible=false;
  target.settings.paper='Letter';
  target.settings.font='Georgia';
  target.sections[0].visible=false;
  target.sections[0].entries[0].visible=false;
  target.sections[0].entries[0].bullets[0].text='Updated reporting';
  const labels=compareResume(original,target).map(change=>change.label);
  for(const expected of [
   'Contact: linkedin','Contact field visibility','Portrait visibility',
   'Professional summary visibility','Design setting: paper','Design setting: font',
   'Section visibility: '+original.sections[0].title,
   'Entry visibility: Role','Entry bullets: Role'
  ])expect(labels).toContain(expected);
  expect(original.sections[0].entries[0].bullets[0].text).toBe('Performed reporting');
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
