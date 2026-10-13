import type {InterviewTopic} from './prompts';

/**
 * STAR-E: context → personal responsibility → personal actions → observed
 * outcome → supporting evidence. These are prompts, not automatic ratings.
 */
export const interviewFocuses=[
 'context','responsibility','action','outcome','evidence',
] as const;
export type InterviewFocus=typeof interviewFocuses[number];
export const focusGuide:Record<InterviewFocus,{label:string;guidance:string}>={
 context:{label:'Situation and context',guidance:'Describe where and when this happened, the problem and relevant constraints.'},
 responsibility:{label:'Your responsibility',guidance:'Explain precisely what YOU were accountable for, distinguishing your work from the team.'},
 action:{label:'What you actually did',guidance:'Describe your decisions, tools, collaboration, process and the steps you personally performed.'},
 outcome:{label:'Observed outcome',guidance:'Explain what happened; quantify only if you know a trustworthy number. Qualitative results are valid.'},
 evidence:{label:'Supporting evidence',guidance:'Identify a concrete example, document, colleague or output that could substantiate the claim.'},
};
export const trackGuide:Record<InterviewTopic,{title:string;opener:string;goal:string}>={
 experience:{
  title:'Professional experience',
  opener:'Describe one real job or internship: your position, the organization and your main responsibilities.',
  goal:'Clarify role, individual contribution, tools, stakeholders and outcomes.',
 },
 achievements:{
  title:'Achievements and results',
  opener:'Tell me about one specific accomplishment you can explain and support.',
  goal:'Capture the challenge, your contribution and the observed result without inflated numbers.',
 },
 projects:{
  title:'Project deep dive',
  opener:'Choose a real project and explain its objective and what part you personally delivered.',
  goal:'Document scope, ownership, teamwork, methods, outputs and results.',
 },
 skills:{
  title:'Demonstrable skills',
  opener:'Choose a skill you actually used. In which real task or project did you use it?',
  goal:'Connect each skill to a practical task rather than adding unsupported keywords.',
 },
 education:{
  title:'Education and learning',
  opener:'Which qualification or course work is most relevant, and what did you do or learn?',
  goal:'Record accurate credentials, projects and practical application.',
 },
 languages:{
  title:'Languages',
  opener:'Which language have you used for work or study, and in what situations?',
  goal:'Separate proven real usage from any claimed proficiency level.',
 },
 certifications:{
  title:'Certifications',
  opener:'Tell me about a certificate you earned: what it covers and who awarded it.',
  goal:'Clarify issuer, scope and proof without creating new qualifications.',
 },
 volunteering:{
  title:'Volunteering',
  opener:'Describe a real volunteer role and what you personally contributed.',
  goal:'Capture the organization, your actions, responsibilities and observed impact.',
 },
};

export const storyCoachingInstructions=[
 'Interview like a meticulous senior HR interviewer and career evidence analyst, not a generic motivational bot.',
 'Use STAR-E: context/situation, task or personal responsibility, specific actions, observed outcome, and proof.',
 'In every reply ask ONE purposeful follow-up question, ideally targeting the most important missing or vague dimension.',
 'Choose next_focus according to the subject of that NEXT question. Do not always start with context.',
 'Avoid re-asking a detail already answered in the recent conversation.',
 'Differentiate what the candidate personally did from what the team or organization achieved.',
 'An outcome can be qualitative. Never invent a percentage, currency amount, headcount, time saving, title, certification or date.',
 'If numbers are missing, ask whether reliable figures exist, but accept a truthful qualitative result.',
 'If the latest answer contradicts an earlier confirmed record, ask for clarification; do not change the confirmed fact.',
 'Respect "I do not know", career gaps, part-time work, junior experience, volunteering and multilingual backgrounds.',
 'Avoid leading questions that imply the user must have managed a team or achieved a quantified impact.',
 'Any factual suggestion must be directly traceable to the MOST RECENT answer; do not derive a new claim solely from saved context.',
].join('\n');
