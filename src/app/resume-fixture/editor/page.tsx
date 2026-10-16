import {notFound} from 'next/navigation';
import {ResumeEditor} from '@/components/resume/resume-editor';
import {emptyResume,type ResumeRow} from '@/lib/resume/schema';
import type {CareerRecord} from '@/lib/career/schema';
export default function SyntheticEditorFixture(){
 if(process.env.NODE_ENV!=='development')notFound();
 const owner='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
 const doc=emptyResume();doc.contact.name='Example Applicant';
 doc.contact.email='example@example.invalid';
 const row:ResumeRow={
  id:'11111111-1111-4111-8111-111111111111',user_id:owner,name:'Synthetic CV – preview test',
  focus_label:'Example role',draft_content:doc,template_id:'ats-classic',
  paper_size:'A4',document_language:'en',revision:1,
  created_at:'2026-10-16T12:00:00Z',updated_at:'2026-10-16T12:00:00Z'
 };
 const record:CareerRecord={
  id:'22222222-2222-4222-8222-222222222222',user_id:owner,revision:1,
  created_at:'2026-10-15T12:00:00Z',updated_at:'2026-10-15T12:00:00Z',
  kind:'experience',title:'Synthetic Inventory Assistant',
  organization:'Fictional Employer',location:'Sample City',
  description:'Reviewed stock counts against sample inventory reports.',
  started_on:'2025-01-01',ended_on:null,is_current:true,
  details:{tools:'Spreadsheet'},source:'manual',status:'confirmed'
 };
 return <main className="container"><p className="subtle">Development-only synthetic UI fixture · not linked to a real account.</p>
  <ResumeEditor row={row} versions={[]} vault={[record]} openVault demoMode/></main>;
}
