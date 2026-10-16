import {listMyTailoringSessions} from '@/lib/tailoring/server';
import {TailoringLibrary} from '@/components/tailoring/tailoring-library';
export const dynamic='force-dynamic';
export default async function TailoringIndex(){
 const sessions=await listMyTailoringSessions();
 return <TailoringLibrary sessions={sessions}/>;
}
