import {notFound} from 'next/navigation';
import {TailoringWorkspace} from '@/components/tailoring/tailoring-workspace';
import {newManualRequirement} from '@/lib/tailoring/requirements';
import {emptyResume,type ResumeRow} from '@/lib/resume/schema';
import type {CareerRecord} from '@/lib/career/schema';
import type {TailoringRow} from '@/lib/tailoring/schema';

/** Synthetic, no-account-only fixture. Production builds return 404. */
export default function TailoringFixture(){
 if(process.env.NODE_ENV!=='development')notFound();
 const owner='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
 const source=emptyResume();
 source.contact.name='Synthetic Applicant';
 source.contact.email='applicant@example.invalid';
 const target=structuredClone(source);
 target.summary='A purely fictional candidate summary for comparison testing.';
 const targetId='44444444-4444-4444-8444-444444444444';
 const now='2026-10-22T12:00:00.000Z';
 const resumes:ResumeRow[]=[{
  id:targetId,user_id:owner,name:'Synthetic Analyst — Fictional Employer',
  focus_label:'Example analyst',draft_content:target,
  template_id:target.settings.template,paper_size:target.settings.paper,
  document_language:target.settings.language,revision:1,
  created_at:now,updated_at:now
 }];
 const records:CareerRecord[]=[{
  id:'55555555-5555-4555-8555-555555555555',
  user_id:owner,revision:1,kind:'experience',status:'confirmed',source:'manual',
  title:'Fictional Inventory Assistant',organization:'Fictional Warehouse',
  location:'Sample City',description:'Used Microsoft Excel for inventory reporting and performed cycle counts weekly.',
  details:{},started_on:'2025-01-01',ended_on:null,is_current:true,
  created_at:now,updated_at:now
 },{
  id:'66666666-6666-4666-8666-666666666666',
  user_id:owner,revision:1,kind:'language',status:'confirmed',source:'manual',
  title:'German',organization:'',location:'',description:'German A1',
  details:{},started_on:null,ended_on:null,is_current:false,
  created_at:now,updated_at:now
 }];
 const requirement=(text:string,category:'tool'|'skill'|'language',priority:'essential'|'preferred',review:'approved'|'candidate'='approved')=>
  ({...newManualRequirement(text),category,priority,review});
 const description=[
  'Experience using Microsoft Excel required',
  'Advanced SAP FI/CO experience required',
  'Inventory cycle counting preferred',
  'German fluently required'
 ].join('\n');
 const session:TailoringRow={
  id:'77777777-7777-4777-8777-777777777777',user_id:owner,
  job_title:'Synthetic Analyst',employer_name:'Fictional Employer',
  job_location:'Sample City',employment_type:'Working student',
  weekly_hours:'20 hours per week',work_arrangement:'Hybrid',
  posting_date:'',application_deadline:'',job_url:'',
  original_job_description:description,initial_job_description:description,private_notes:'',
  requirements:[
   requirement('Experience using Microsoft Excel required','tool','essential'),
   requirement('Advanced SAP FI/CO experience required','tool','essential'),
   requirement('Inventory cycle counting preferred','skill','preferred'),
   requirement('German fluently required','language','essential','candidate')
  ],
  source_resume_id:null,source_resume_revision:null,source_version_number:null,
  source_snapshot:source,tailored_resume_id:targetId,revision:1,
  created_at:now,updated_at:now
 };
 return <div className="container stack" style={{paddingTop:20,paddingBottom:40}}>
  <p className="subtle">Development-only synthetic Step 4 fixture. No real account or Supabase access.</p>
  <TailoringWorkspace session={session} resumes={resumes} vault={records} demoMode/>
 </div>;
}
