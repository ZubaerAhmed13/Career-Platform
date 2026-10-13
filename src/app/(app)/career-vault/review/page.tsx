import { loadCareerVault } from '@/lib/career/server';
import { scanningConfigured } from '@/lib/career/clamav';
import { aiPersistenceConfigured } from '@/lib/career/ai-admin';
import { localModelConfigured } from '@/lib/career/local-model';
import { CvUploadForm } from '@/components/career/cv-upload-form';
import { BrowserCvImport } from '@/components/career/browser-cv-import';
import { ReviewWorkspace } from '@/components/career/review-workspace';
export const dynamic='force-dynamic';
export default async function ReviewPage(){
 const {records,suggestions}=await loadCareerVault();
 return <><BrowserCvImport/><div style={{marginTop:28}}><ReviewWorkspace suggestions={suggestions} records={records} aiConfigured={localModelConfigured()&&aiPersistenceConfigured()}/><section style={{marginTop:28}}><CvUploadForm scannerReady={scanningConfigured()}/></section></div></>;
}
