import {describe,it,expect} from 'vitest';
import {careerKinds,recordSchema} from '../src/lib/career/schema';
import {collectRecordDetails,detailFields} from '../src/lib/career/record-fields';

describe('category-specific Career Vault details',()=>{
 it('supports all eight categories with concrete fields',()=>{
  for(const kind of careerKinds)expect(detailFields[kind].length).toBeGreaterThanOrEqual(2);
 });
 it('saves structured education facts without inventing missing fields',()=>{
  const data=new FormData();
  data.set('detail_field_of_study','Entrepreneurship');
  data.set('detail_grade','1.9 (German scale)');
  const details=collectRecordDetails('education',data);
  expect(details).toEqual({field_of_study:'Entrepreneurship',grade:'1.9 (German scale)'});
  expect(recordSchema.parse({kind:'education',title:'Master',details}).details).toEqual(details);
 });
 it('preserves unrelated metadata and clears fields deliberately',()=>{
  const data=new FormData();
  data.set('detail_proficiency','B1');
  const details=collectRecordDetails('language',data,{
   provenance:'manual',proficiency:'C1',team_size:'4',method:'legacy',
  },'skill');
  expect(details).toEqual({provenance:'manual',method:'legacy',proficiency:'B1'});
  data.set('detail_proficiency','');
  expect(collectRecordDetails('language',data,details)?.proficiency).toBeUndefined();
 });
 it('rejects oversized and non-string values; does not persist stale category details',()=>{
  const data=new FormData();
  data.set('detail_measurable_outcomes','x'.repeat(501));
  expect(collectRecordDetails('experience',data)).toBeNull();
  data.delete('detail_measurable_outcomes');
  data.set('detail_department',new File(['x'],'x.txt'));
  expect(collectRecordDetails('experience',data)).toBeNull();
  data.delete('detail_department');
  expect(collectRecordDetails('project',data,{proficiency:'C1',legacy_note:'source'}))
   .toEqual({legacy_note:'source'});
 });
});
