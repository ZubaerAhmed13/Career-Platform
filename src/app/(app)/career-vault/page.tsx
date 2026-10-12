import { loadCareerVault } from '@/lib/career/server';
import { VaultWorkspace } from '@/components/career/vault-workspace';
export const dynamic = 'force-dynamic';
export default async function CareerVaultPage(){
 const data=await loadCareerVault();
 return <VaultWorkspace records={data.records} linkedCount={data.links.length+data.evidenceLinks.length}/>;
}
