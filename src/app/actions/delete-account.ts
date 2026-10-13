'use server';
import {redirect} from 'next/navigation';
import {createClient} from '@supabase/supabase-js';
import {requireAccount} from '@/lib/account';
import {supabaseConfig} from '@/lib/config';
import {validateAccountDeletionInput} from '@/lib/account-deletion';

export type DeleteAccountState={error?:string};

/**
 * Explicitly destructive: never invoked by page rendering or automated tests.
 * Uses a separate public client for password reauthentication. Only a verified,
 * matching subject is passed to the privileged Auth Admin API on the server.
 * Unlike Vault clearing, this permanently deletes the login and cascaded rows.
 */
export async function deleteMyAccount(
 _previous:DeleteAccountState,form:FormData,
):Promise<DeleteAccountState>{
 const phrase=form.get('typed_confirmation');
 const password=form.get('current_password');
 if(!validateAccountDeletionInput(phrase,password,form.get('confirm_permanent')))
  return {error:'Type DELETE MY ACCOUNT, enter your password, and confirm permanent deletion.'};
 // The service role key must NEVER be sent to the browser.
 const privilegedKey=process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
 if(!privilegedKey)return {error:'Self-service account deletion is not configured yet. Contact the service operator.'};

 const {user,supabase}=await requireAccount();
 if(!user.email)return {error:'This account cannot be reauthenticated by password. Contact the service operator.'};
 const {url,key}=supabaseConfig();
 const authOptions={auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}};
 const reauth=createClient(url,key,authOptions);
 const verification=await reauth.auth.signInWithPassword({
  email:user.email,password:password as string,
 });
 if(verification.error||verification.data.user?.id!==user.id)
  return {error:'The current password could not be verified. No information was deleted.'};

 const admin=createClient(url,privilegedKey,authOptions);
 // Supabase refuses hard-deleting Auth users who own Storage objects. Fail
 // closed before deletion when this app's reserved private folder is nonempty.
 // Uploaded files are currently disabled, but this also protects legacy data.
 const storage=await admin.storage.from('career-private').list(user.id,{limit:1});
 if(storage.error)return {error:'Could not verify private document storage. Nothing was deleted.'};
 if((storage.data??[]).length>0)
  return {error:'Private documents are associated with this account. Request secure object removal from the service operator before deleting your login. Nothing was deleted.'};

 // Hard delete (NOT soft-delete): all CareerOS public tables reference
 // auth.users ON DELETE CASCADE. Do not delete them separately beforehand.
 const {error}=await admin.auth.admin.deleteUser(user.id,false);
 if(error)return {error:'Account deletion could not be completed. No successful deletion is claimed. Contact the service operator.'};
 // Auth tokens can remain valid until their expiry; sign out this browser.
 // Deleting auth.sessions prevents creation of new access tokens.
 await supabase.auth.signOut();
 redirect('/?account_deleted=1');
}
