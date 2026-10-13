'use client';
import {useActionState,useState} from 'react';
import {deleteMyAccount} from '@/app/actions/delete-account';
import {DELETE_ACCOUNT_CONFIRMATION} from '@/lib/account-deletion';

export function AccountDeletionControls({configured}:{configured:boolean}){
 const [state,action,pending]=useActionState(deleteMyAccount,{});
 const [opened,setOpened]=useState(false);
 return <section className="card stack">
  <h2>Delete my account</h2>
  <p className="subtle">This removes your login, profile and linked Career Vault database records. You will lose access and cannot undo the action. Database backups may retain copies temporarily; see the privacy and retention notice. Export anything you need first.</p>
  {!configured?<p className="muted-card" role="status">Self-service deletion needs secure server configuration. Contact the service operator to request account deletion; never send anyone your password.</p>:
   !opened?<button type="button" className="button secondary" onClick={()=>setOpened(true)}>Show permanent account deletion controls</button>:
   <form action={action} className="stack">
    <label className="label" htmlFor="delete-account-phrase">Type {DELETE_ACCOUNT_CONFIRMATION} to confirm</label>
    <input className="field" id="delete-account-phrase" name="typed_confirmation"
      required autoComplete="off" spellCheck={false}/>
    <label className="label" htmlFor="delete-account-password">Current account password</label>
    <input className="field" id="delete-account-password" type="password"
      name="current_password" autoComplete="current-password" maxLength={4096} required/>
    <label><input type="checkbox" name="confirm_permanent" value="yes" required/>
      I want to permanently delete this account and its saved CareerOS information.</label>
    <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
     <button className="button" disabled={pending}>{pending?'Verifying deletion…':'Permanently delete my account'}</button>
     <button className="button secondary" type="button" onClick={()=>setOpened(false)} disabled={pending}>Cancel</button>
    </div>
   </form>}
  {state.error&&<p className="error" role="alert">{state.error}</p>}
 </section>;
}
