/**
 * This module defines the only AI operations approved for CareerOS Step 2.
 * No general chat endpoint, browsing, job application automation or hidden
 * mutation of verified career facts may be added through this provider.
 */
export const careerAIPurposes=['career_interview','career_cv_paste'] as const;
export type CareerAIPurpose=typeof careerAIPurposes[number];

export const careerOnlyReply=
 'I’m here only to help document your real career background. Tell me about your work experience, education, skills, projects, achievements, certifications, languages or volunteering, and I’ll ask a focused follow-up question.';

export function isCareerAIPurpose(value:string):value is CareerAIPurpose {
 return (careerAIPurposes as readonly string[]).includes(value);
}

export const careerAIScope=Object.freeze({
 allowed:[
  'Ask focused follow-up questions to clarify the user’s real career history.',
  'Extract potential facts from user-submitted career text and CVs.',
  'Provide source excerpts for every suggested fact.',
  'Send all proposals to the human approval queue; never modify confirmed facts.',
 ] as const,
 excluded:[
  'General-purpose chat, entertainment, homework or broad web research.',
  'Job applications, automated outreach, or third-party account access.',
  'Inventing qualifications, employers, dates, salary, metrics or accomplishments.',
  'Automatically confirming or overwriting Career Vault records.',
 ] as const,
});
