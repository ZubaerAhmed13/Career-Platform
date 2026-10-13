import { loadCareerVault } from '@/lib/career/server';
import { VaultWorkspace } from '@/components/career/vault-workspace';
import { getProfile } from '@/lib/account';
export const dynamic = 'force-dynamic';
export default async function CareerVaultPage(){
 const [data,{profile}]=await Promise.all([loadCareerVault(),getProfile()]);
 return <VaultWorkspace records={data.records} linkedCount={data.links.length+data.evidenceLinks.length} pendingSuggestionCount={data.suggestions.filter(item=>item.review_status==='pending').length} targetRole={profile?.target_role}/>;
}
