import {describe,it,expect} from 'vitest';
import {careerAIPurposes,isCareerAIPurpose,careerAIScope,careerOnlyReply} from '../src/lib/career/ai-purpose';
import {interviewTopics,topicPrompts,interviewInstructions} from '../src/lib/career/prompts';

describe('dedicated CareerOS AI purpose',()=>{
 it('exposes only interviewing and CV evidence extraction',()=>{
  expect(careerAIPurposes).toEqual(['career_interview','career_cv_paste']);
  for(const purpose of careerAIPurposes)expect(isCareerAIPurpose(purpose)).toBe(true);
  for(const other of ['chat','general_chat','code_writer','web_search','job_apply','resume_auto_publish'])
   expect(isCareerAIPurpose(other)).toBe(false);
 });
 it('covers all eight Career Vault categories',()=>{
  expect(interviewTopics).toEqual([
    'experience','achievements','projects','skills','education',
    'languages','certifications','volunteering',
  ]);
  for(const key of interviewTopics)expect(topicPrompts[key].length).toBeGreaterThan(50);
 });
 it('never authorizes automatic confirmation or fabricated credentials',()=>{
  const excluded=careerAIScope.excluded.join(' ').toLowerCase();
  expect(excluded).toContain('general-purpose chat');
  expect(excluded).toContain('automatically confirming');
  expect(excluded).toContain('inventing');
  expect(interviewInstructions).toContain('untrusted data');
  expect(careerOnlyReply).toContain('only to help document');
 });
});
