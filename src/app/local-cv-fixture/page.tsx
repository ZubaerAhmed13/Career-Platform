import {notFound} from 'next/navigation';
import {BrowserCvImport} from '@/components/career/browser-cv-import';
export const dynamic='force-dynamic';
/** Browser-only CI fixture. Never accessible in production Vercel builds. */
export default function LocalCvTestPage(){
 if(process.env.NODE_ENV!=='development')notFound();
 return <main className="stack" style={{maxWidth:850,margin:'2rem auto',padding:24}}>
  <h1>Local CV parser developer fixture</h1>
  <BrowserCvImport/>
 </main>;
}
