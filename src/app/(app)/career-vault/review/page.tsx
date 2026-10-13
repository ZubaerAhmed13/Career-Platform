import { loadCareerVault } from '@/lib/career/server';
import { scanningConfigured } from '@/lib/career/clamav';
import { aiPersistenceConfigured } from '@/lib/career/ai-admin';
import { localModelConfigured } from '@/lib/career/local-model';
import { CvUploadForm } from '@/components/career/cv-upload-form';
import { ReviewWorkspace } from '@/components/career/review-workspace';
export const dynamic='force-dynamic';
export default async function ReviewPage(){
 const {records,suggestions}=await loadCareerVault();
 return <><ReviewWorkspace suggestions={suggestions} records={records} aiConfigured={localModelConfigured()&&aiPersistenceConfigured()}/><section style={{marginTop:28}}><CvUploadForm scannerReady={scanningConfigured()}/></section></>;
}
