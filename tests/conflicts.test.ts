import {describe,it,expect} from 'vitest';
import {potentialCareerConflicts} from '../src/lib/career/conflicts';
const records=[
 {id:'1',kind:'experience' as const,title:'Working Student Operations',organization:'Example GmbH'},
 {id:'2',kind:'skill' as const,title:'Excel',organization:''},
 {id:'3',kind:'experience' as const,title:'Project Manager',organization:'Other AG'},
];
describe('non-destructive duplicate candidate checks',()=>{
 it('flags reordered matching job titles',()=>{
  const matches=potentialCareerConflicts({kind:'experience',title:'Operations Working Student',description:'A previous role'},records);
  expect(matches.map(r=>r.id)).toEqual(['1']);
 });
 it('flags an employer even when role titles differ',()=>{
  const matches=potentialCareerConflicts({kind:'experience',title:'Inventory Coordinator',description:'Worked at Example GmbH'},records);
  expect(matches.map(r=>r.id)).toEqual(['1']);
 });
 it('never matches a different category just because the title overlaps',()=>{
  const matches=potentialCareerConflicts({kind:'skill',title:'Operations Working Student',description:'I used this'},records);
  expect(matches).toHaveLength(0);
 });
});
