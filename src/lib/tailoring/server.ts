import 'server-only';
import {requireAccount} from '@/lib/account';
import {resumeDocSchema} from '@/lib/resume/schema';
import {requirementSchema,type TailoringRow} from './schema';

function readRow(raw:Record<string,unknown>):TailoringRow{
 const requirements=requirementSchema.array().max(100).parse(raw.requirements);
 const snapshot=raw.source_snapshot==null?null:resumeDocSchema.parse(raw.source_snapshot);
 return {...raw,requirements,source_snapshot:snapshot} as TailoringRow;
}
export async function listMyTailoringSessions():Promise<TailoringRow[]>{
 const {user,supabase}=await requireAccount();
 const {data,error}=await supabase.from('resume_tailoring_sessions').select('*')
  .eq('user_id',user.id).order('updated_at',{ascending:false}).limit(100);
 if(error)throw new Error('Tailoring database is not available. The Step 4 migration may not be installed.');
 return (data??[]).map(readRow);
}
export async function loadMyTailoringSession(id:string):Promise<TailoringRow|null>{
 const {user,supabase}=await requireAccount();
 const {data,error}=await supabase.from('resume_tailoring_sessions').select('*')
  .eq('user_id',user.id).eq('id',id).maybeSingle();
 if(error)throw new Error('Unable to load the tailoring session.');
 return data?readRow(data):null;
}
