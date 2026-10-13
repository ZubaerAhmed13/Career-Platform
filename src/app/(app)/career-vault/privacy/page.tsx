import {VaultPrivacy} from '@/components/career/vault-privacy';
import {requireAccount} from '@/lib/account';
export const dynamic='force-dynamic';
export default async function VaultPrivacyPage(){
 await requireAccount();
 return <VaultPrivacy/>;
}
