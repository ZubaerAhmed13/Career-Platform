import { loadCareerVault } from '@/lib/career/server';
import { ReviewWorkspace } from '@/components/career/review-workspace';
export const dynamic='force-dynamic';
export default async function ReviewPage(){
 const {records,suggestions}=await loadCareerVault();
 return <ReviewWorkspace suggestions={suggestions} records={records}/>;
}
