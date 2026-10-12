import { z } from 'zod';

export const careerKinds = [
 'experience','education','skill','language','project','achievement','certification','volunteering',
] as const;
export const careerKind = z.enum(careerKinds);
export type CareerKind = z.infer<typeof careerKind>;
export const recordSchema = z.object({
 kind: careerKind,
 title: z.string().trim().min(1).max(180),
 organization: z.string().trim().max(180).default(''),
 location: z.string().trim().max(150).default(''),
 description: z.string().trim().max(8000).default(''),
 started_on: z.iso.date().nullable().default(null),
 ended_on: z.iso.date().nullable().default(null),
 is_current: z.boolean().default(false),
 details: z.record(z.string(),z.string().max(500)).default({}),
 status: z.enum(['confirmed','unreviewed','conflict']).default('confirmed'),
 source: z.enum(['manual','import','ai']).default('manual'),
}).refine(v=> !v.is_current || v.ended_on===null,{message:'Current roles cannot have an end date'})
.refine(v=>!v.started_on||!v.ended_on||v.started_on<=v.ended_on,{message:'End date must follow start date'});
export type RecordInput = z.infer<typeof recordSchema>;
export type CareerRecord = RecordInput & {
 id:string;user_id:string;revision:number;created_at:string;updated_at:string;
};
export const evidenceSchema = z.object({
 title:z.string().trim().min(1).max(180),
 evidence_type:z.enum(['note','url','document_reference']),
 excerpt:z.string().trim().max(4000).default(''),
 source_url:z.union([z.literal(''),z.url().max(1500).refine(value=>/^https?:\/\//i.test(value),'Only HTTP(S) URLs are supported')]).default(''),
});
export const suggestionSchema = z.object({
 kind:careerKind,
 title:z.string().trim().min(1).max(180),
 description:z.string().trim().max(4000),
 evidence_quote:z.string().trim().max(2000),
});
export type CareerSuggestion = z.infer<typeof suggestionSchema> & {
 id:string;user_id:string;origin:'ai'|'cv_import';review_status:'pending'|'approved'|'rejected';
 session_id:string|null;created_at:string;
};
export type CareerEvidence = z.infer<typeof evidenceSchema> & {id:string;user_id:string;created_at:string};
export type CareerLink = {id:string;user_id:string;from_record_id:string;to_record_id:string;relation:string;created_at:string};
export type CareerEvidenceLink = {id:string;user_id:string;record_id:string;evidence_id:string;created_at:string};
export type CareerSession = {id:string;user_id:string;title:string;status:'active'|'completed';created_at:string;updated_at:string};
export type CareerMessage = {id:string;user_id:string;session_id:string;role:'user'|'assistant';content:string;created_at:string};
export type CareerEvent = {id:string;user_id:string;record_id:string;action:'created'|'updated'|'deleted';created_at:string};

export const kindLabels:Record<CareerKind,string>={
 experience:'Work experience', education:'Education',skill:'Skills',
 language:'Languages',project:'Projects',achievement:'Achievements',
 certification:'Certifications',volunteering:'Volunteering',
};
export function vaultCounts(records:Pick<CareerRecord,'kind'|'status'>[]){
 const counts=Object.fromEntries(careerKinds.map(kind=>[kind,records.filter(r=>r.kind===kind).length])) as Record<CareerKind,number>;
 return {counts,pending:records.filter(r=>r.status!=='confirmed').length,total:records.length};
}
