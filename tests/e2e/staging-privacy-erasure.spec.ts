/**
 * DESTRUCTIVE and manual-only: requires a dedicated staging project and TWO
 * additional disposable accounts never used for normal two-user RLS tests.
 * No destructive scenario can run in PR/push CI or against production.
 */
import {test,expect,type Page} from '@playwright/test';
import {randomUUID} from 'node:crypto';

const allowed=process.env.CAREER_STAGING_E2E==='I_UNDERSTAND_STAGING_ONLY' &&
 process.env.CAREER_STAGING_ERASURE==='I_UNDERSTAND_DELETES_DISPOSABLE_USERS';
const purge={email:process.env.SUPABASE_TEST_PURGE_USER_EMAIL??'',password:process.env.SUPABASE_TEST_PURGE_USER_PASSWORD??''};
const deletion={email:process.env.SUPABASE_TEST_DELETE_USER_EMAIL??'',password:process.env.SUPABASE_TEST_DELETE_USER_PASSWORD??''};

async function login(page:Page,user:{email:string;password:string}){
 await page.goto('/login?next=/career-vault');
 await page.getByRole('textbox',{name:'Email address'}).fill(user.email);
 await page.getByLabel('Password',{exact:true}).fill(user.password);
 await page.getByRole('button',{name:'Sign in',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Career Intelligence Vault'})).toBeVisible({timeout:20000});
}
test.describe('Destructive signed-in acceptance — extra disposable staging accounts only',()=>{
 test.skip(!allowed,'Must explicitly opt in with disposable staging accounts.');
 test.describe.configure({mode:'serial'});
 test('owner clearing deletes only the throwaway Vault but retains its login',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='desktop-chromium'||!purge.email||!purge.password,
   'Provide a dedicated, empty test account reserved for erasure.');
  const marker='StagingPurge'+randomUUID().replace(/-/g,'').slice(0,14);
  await login(page,purge);
  await page.getByRole('button',{name:/Add career record/}).click();
  await page.getByLabel('Job title',{exact:true}).fill(marker);
  await page.getByRole('button',{name:'Save confirmed record'}).click();
  await page.getByLabel('Search your records').fill(marker);
  await expect(page.getByRole('heading',{name:marker})).toBeVisible();
  const before=await page.request.get('/api/account/export');
  expect(before.ok()).toBe(true);
  const original=await before.json();
  expect(JSON.stringify(original)).toContain(marker);
  await page.goto('/career-vault/privacy');
  await page.getByRole('button',{name:'Show irreversible Vault-clear controls'}).click();
  await page.getByLabel(/Type DELETE MY CAREER VAULT/).fill('DELETE MY CAREER VAULT');
  await page.getByLabel(/I have exported any data I wish to keep/).check();
  await page.getByRole('button',{name:/Confirm — clear my Career Vault/}).click();
  await expect(page.getByRole('status')).toContainText('were cleared',{timeout:20000});
  await page.goto('/career-vault');
  await page.getByLabel('Search your records').fill(marker);
  await expect(page.getByRole('heading',{name:marker})).toHaveCount(0);
  const after=await page.request.get('/api/account/export');
  expect(after.ok()).toBe(true);
  expect(JSON.stringify(await after.json())).not.toContain(marker);
  await page.getByRole('button',{name:'Sign out'}).click();
  await login(page,purge); // proves account survived clearing
 });

 test('hard deletion of an extra throwaway login is explicitly confirmed',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='desktop-chromium'||!deletion.email||!deletion.password||
   !process.env.SUPABASE_SERVICE_ROLE_KEY,
   'Requires separately approved throwaway deletion account and protected staging admin credential.');
  await login(page,deletion);
  await page.goto('/settings');
  await page.getByRole('button',{name:'Show permanent account deletion controls'}).click();
  await page.getByLabel('Type DELETE MY ACCOUNT to confirm').fill('DELETE MY ACCOUNT');
  // Confirm a wrong password does not delete the identity or its Vault data.
  await page.getByLabel('Current account password').fill('wrong-password-staging-rejection');
  await page.getByLabel(/I want to permanently delete this account/).check();
  await page.getByRole('button',{name:'Permanently delete my account'}).click();
  await expect(page.getByRole('alert')).toContainText('current password could not be verified',{timeout:20000});
  const stillPresent=await page.request.get('/api/account/export');
  expect(stillPresent.ok()).toBe(true);
  await page.getByLabel('Current account password').fill(deletion.password);
  await page.getByRole('button',{name:'Permanently delete my account'}).click();
  await expect(page).toHaveURL(/\?account_deleted=1/,{timeout:25000});
  await page.goto('/career-vault');
  await expect(page.getByRole('heading',{name:'Welcome back'})).toBeVisible();
  await page.getByRole('textbox',{name:'Email address'}).fill(deletion.email);
  await page.getByLabel('Password',{exact:true}).fill(deletion.password);
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('Could not sign in');
 });
});
