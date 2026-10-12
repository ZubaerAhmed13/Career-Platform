import {describe,it,expect} from 'vitest';
import {selectInterviewContext} from '../src/lib/career/context';
const records=[
 {kind:'experience',title:'Part-time employment',description:'Worked in operations'},
 {kind:'skill',title:'Excel',description:'Reporting'},
 {kind:'project',title:'University innovation challenge',description:'Project coordination'},
 {kind:'education',title:'Business degree',description:'Formal training'},
];
describe('bounded contextual AI interviewing',()=>{
 it('prioritizes project, education and related skills for project questions',()=>{
  const selected=selectInterviewContext(records,'projects',3);
  expect(selected.map(x=>x.kind)).toEqual(['project','education','skill']);
 });
 it('prioritizes real jobs when asking about experience',()=>{
  expect(selectInterviewContext(records,'experience',1)[0].kind).toBe('experience');
 });
 it('never invents records or returns more than eight',()=>{
  expect(selectInterviewContext(records,'skills',99)).toHaveLength(4);
  expect(selectInterviewContext([],'education')).toEqual([]);
 });
});
