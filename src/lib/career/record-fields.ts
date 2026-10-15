import type {CareerKind} from './schema';

export type DetailField={key:string;label:string;maxLength:number;placeholder:string;multiline?:boolean};
export const detailFields:Record<CareerKind,readonly DetailField[]>={
 experience:[
  {key:'employment_type',label:'Employment type',maxLength:80,placeholder:'Working student, internship, part-time…'},
  {key:'department',label:'Team / department',maxLength:120,placeholder:'Inventory operations'},
  {key:'tools',label:'Tools and methods used',maxLength:350,placeholder:'Excel, cycle counts, ERP…'},
  {key:'measurable_outcomes',label:'Verified results (optional)',maxLength:500,placeholder:'What changed? Include figures only when you can verify them.',multiline:true},
 ],
 education:[
  {key:'field_of_study',label:'Field of study',maxLength:180,placeholder:'Finance, Entrepreneurship…'},
  {key:'grade',label:'Grade / GPA (optional)',maxLength:80,placeholder:'Include the grading scale'},
  {key:'coursework',label:'Relevant coursework',maxLength:500,placeholder:'Courses relevant to the role',multiline:true},
 ],
 skill:[
  {key:'proficiency',label:'Proficiency or experience level',maxLength:100,placeholder:'Beginner, intermediate, advanced…'},
  {key:'application',label:'Where you used this skill',maxLength:500,placeholder:'Real project, assignment or job',multiline:true},
 ],
 language:[
  {key:'proficiency',label:'Proficiency / CEFR level',maxLength:100,placeholder:'A1, B2, native…'},
  {key:'certificate',label:'Language test (if any)',maxLength:140,placeholder:'Test name and result'},
 ],
 project:[
  {key:'role',label:'Your role',maxLength:160,placeholder:'Research lead, analyst, team member…'},
  {key:'team_size',label:'Team size (optional)',maxLength:40,placeholder:'3'},
  {key:'methods',label:'Methods / tools',maxLength:350,placeholder:'Interviews, Excel, customer research…'},
  {key:'deliverable',label:'Deliverable',maxLength:350,placeholder:'Business plan, dashboard, presentation…'},
  {key:'outcome',label:'Verified outcome',maxLength:500,placeholder:'Result or learning; avoid invented figures',multiline:true},
 ],
 achievement:[
  {key:'context',label:'Context',maxLength:250,placeholder:'What challenge or goal?'},
  {key:'action',label:'Your contribution',maxLength:500,placeholder:'What you personally did',multiline:true},
  {key:'impact',label:'Outcome / evidence',maxLength:500,placeholder:'Verifiable impact; numbers are optional',multiline:true},
 ],
 certification:[
  {key:'credential_id',label:'Credential ID (optional)',maxLength:160,placeholder:'Certificate reference'},
  {key:'issuing_body',label:'Issuing body / awarding authority',maxLength:180,placeholder:'Awarding organization'},
  {key:'skills_covered',label:'Skills covered',maxLength:350,placeholder:'Topics assessed'},
 ],
 volunteering:[
  {key:'role',label:'Your role',maxLength:160,placeholder:'Volunteer coordinator…'},
  {key:'cause',label:'Cause / focus',maxLength:220,placeholder:'Community support, education…'},
  {key:'contribution',label:'Contribution and outcome',maxLength:500,placeholder:'Your work and observed result',multiline:true},
 ],
};
const allKeys=new Set(Object.values(detailFields).flatMap(fields=>fields.map(field=>field.key)));
/** Keep unrelated legacy metadata, not stale fields from another category. */
export function collectRecordDetails(
 kind:CareerKind,entries:Pick<FormData,'get'>,existing:unknown={},previousKind:CareerKind=kind,
):Record<string,unknown>|null{
 const old=existing&&typeof existing==='object'&&!Array.isArray(existing)?existing as Record<string,unknown>:{};
 const details:Record<string,unknown>={...old};
 for(const key of allKeys)delete details[key];
 // All category-specific values come from the submitted form. Clearing a field
 // really clears it; switching category removes irrelevant old category fields.
 void previousKind;
 for(const field of detailFields[kind]){
  const submitted=entries.get('detail_'+field.key);
  if(submitted!==null&&typeof submitted!=='string')return null;
  const value=(submitted??'').trim();
  if(value.length>field.maxLength)return null;
  if(value)details[field.key]=value;
 }
 return details;
}
