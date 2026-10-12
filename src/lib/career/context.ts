import type { InterviewTopic } from './prompts';

export type InterviewContextRecord={kind:string;title:string;description:string};

/** Select bounded, topic-relevant confirmed records without inventing context. */
const preference:Record<InterviewTopic,readonly string[]>={
 experience:['experience','achievement','skill','project'],
 achievements:['achievement','experience','project','skill'],
 projects:['project','education','achievement','skill'],
 skills:['skill','experience','project','certification'],
 education:['education','project','certification','skill'],
};
export function selectInterviewContext(
 records:InterviewContextRecord[],topic:InterviewTopic,max=8,
):InterviewContextRecord[]{
 const order=preference[topic];
 return records
  .map((record,index)=>({record,index,rank:order.indexOf(record.kind)}))
  .sort((a,b)=>{
   const priorityA=a.rank===-1?100:a.rank;
   const priorityB=b.rank===-1?100:b.rank;
   return priorityA-priorityB||a.index-b.index;
  })
  .slice(0,Math.max(0,Math.min(max,8)))
  .map(v=>v.record);
}
