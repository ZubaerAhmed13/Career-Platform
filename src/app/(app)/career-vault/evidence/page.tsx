import { loadCareerVault } from '@/lib/career/server';
import { EvidenceWorkspace } from '@/components/career/evidence-workspace';
export const dynamic='force-dynamic';
export default async function EvidencePage(){
 const {records,evidence,links,evidenceLinks}=await loadCareerVault();
 return <EvidenceWorkspace records={records} evidence={evidence} links={links} evidenceLinks={evidenceLinks}/>;
}
