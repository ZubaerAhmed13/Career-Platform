import {z} from 'zod';
import type {ResumeDoc} from '@/lib/resume/schema';

export const requirementCategories=['qualification','experience','skill','tool','language','certification','responsibility','industry','hours','mobility','other'] as const;
export const requirementPriorities=['essential','preferred','unclassified'] as const;
export const requirementSchema=z.object({
 id:z.uuid(),text:z.string().trim().min(2).max(1200),
 excerpt:z.string().max(1500),position:z.number().int().min(-1).max(60000),
 category:z.enum(requirementCategories),priority:z.enum(requirementPriorities),
 relation:z.enum(['single','alternative','compound']).default('single'),
 origin:z.enum(['detected','user']),review:z.enum(['candidate','approved','rejected']),
});
export type JobRequirement=z.infer<typeof requirementSchema>;
export const jobBriefSchema=z.object({
 jobTitle:z.string().trim().min(1).max(180),
 employerName:z.string().trim().max(180).default(''),
 location:z.string().trim().max(180).default(''),
 employmentType:z.string().trim().max(100).default(''),
 jobUrl:z.union([z.literal(''),z.url().max(1500).refine(s=>/^https?:\/\//i.test(s))]).default(''),
 originalDescription:z.string().min(40).max(50000).refine(v=>v.trim().length>=40,'Provide a complete job description'),
 notes:z.string().max(4000).default(''),
 requirements:z.array(requirementSchema).max(100),
}).superRefine((value,ctx)=>{
 const ids=new Set<string>();
 for(const [index,item] of value.requirements.entries()){
  if(ids.has(item.id))ctx.addIssue({code:'custom',path:['requirements',index,'id'],message:'Duplicate requirement ID'});
  ids.add(item.id);
 }
}).refine(v=>JSON.stringify(v.requirements).length<=70000,'Requirements exceed maximum size');
export type JobBrief=z.infer<typeof jobBriefSchema>;
export type TailoringRow={
 id:string;user_id:string;job_title:string;employer_name:string;job_location:string;
 employment_type:string;job_url:string;original_job_description:string;private_notes:string;
 requirements:JobRequirement[];source_resume_id:string|null;source_resume_revision:number|null;
 source_snapshot:ResumeDoc|null;tailored_resume_id:string|null;
 revision:number;created_at:string;updated_at:string;
};
export function briefFromRow(row:TailoringRow):JobBrief{
 return jobBriefSchema.parse({
  jobTitle:row.job_title,employerName:row.employer_name,location:row.job_location,
  employmentType:row.employment_type,jobUrl:row.job_url,
  originalDescription:row.original_job_description,notes:row.private_notes,
  requirements:row.requirements
 });
}
export function isValidRevision(revision:number){
 return Number.isSafeInteger(revision)&&revision>0;
}
