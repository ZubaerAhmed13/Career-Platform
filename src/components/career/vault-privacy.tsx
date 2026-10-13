'use client';
import {useActionState,useState} from 'react';
import Link from 'next/link';
import {clearMyCareerVault} from '@/app/actions/career-privacy';

export function VaultPrivacy(){
 const [state,action,pending]=useActionState(clearMyCareerVault,{});
 const [open,setOpen]=useState(false);
 return <section className="stack" style={{maxWidth:760}} aria-labelledby="vault-privacy-heading">
  <header className="stack" style={{gap:8}}>
   <p className="eyebrow">Your data, your decision</p>
   <h1 className="heading" id="vault-privacy-heading">Career Vault privacy & data export</h1>
   <p className="subtle">CareerOS stores your career facts separately from your login account. You can export your information and clear your Vault deliberately.</p>
  </header>
  <section className="card stack">
   <h2>Export your Career Vault</h2>
   <p className="subtle">Download your saved career records, links, evidence, interview history, pending suggestions and activity as a private JSON archive. Only your signed-in data is included.</p>
   <Link href="/api/career-vault/export" className="button">Download my Career Vault JSON</Link>
  </section>
  <section className="card stack" style={{border:'1px solid var(--line)'}}>
   <h2>Clear your saved career history</h2>
   <p className="subtle">This deletes your saved Vault records, pending review suggestions, supporting evidence, relationships, interview sessions/messages and Vault activity in one database operation. It does not delete your authentication account or general profile, and does not itself remove database backups. Download your export first.</p>
   {!open&&<button className="button secondary" type="button" onClick={()=>setOpen(true)}>Show irreversible Vault-clear controls</button>}
   {open&&<form className="stack" action={action}>
    <label className="label" htmlFor="vault-confirm-phrase">Type DELETE MY CAREER VAULT to confirm</label>
    <input id="vault-confirm-phrase" className="field" type="text" name="typed_confirmation" autoComplete="off" required placeholder="DELETE MY CAREER VAULT"/>
    <label><input type="checkbox" name="confirm_permanent" value="yes" required/> I have exported any data I wish to keep and want to permanently clear my Career Vault data.</label>
    <button className="button" disabled={pending}>{pending?'Clearing Vault…':'Confirm — clear my Career Vault'}</button>
    <button className="button secondary" type="button" onClick={()=>setOpen(false)}>Cancel</button>
   </form>}
   {state.error&&<p className="error" role="alert">{state.error}</p>}
   {state.message&&<p className="success" role="status">{state.message}</p>}
  </section>
  <p className="subtle">For full account deletion and information retained in operational backups, contact the service operator. This screen clears Career Vault application data only.</p>
  <Link href="/career-vault" className="button secondary">Back to Career Vault</Link>
 </section>;
}
