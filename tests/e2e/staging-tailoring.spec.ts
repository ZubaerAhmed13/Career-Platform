/**
 * Step 4 authenticated browser acceptance: opt-in, two disposable identities in
 * a SEPARATE staging Supabase project. Ordinary pull-request CI must never run it.
 * Tests create uniquely marked data and clean up only those created artifacts.
 */
import {randomUUID} from 'node:crypto';
import {stat} from 'node:fs/promises';
import {test,expect,type Page} from '@playwright/test';

const enabled=process.env.CAREER_STAGING_E2E==='I_UNDERSTAND_STAGING_ONLY' &&
 process.env.CAREER_STAGING_STEP4==='I_UNDERSTAND_STEP4_STAGING_ONLY';
const users={
 a:{email:process.env.SUPABASE_TEST_USER_A_EMAIL??'',password:process.env.SUPABASE_TEST_USER_A_PASSWORD??''},
 b:{email:process.env.SUPABASE_TEST_USER_B_EMAIL??'',password:process.env.SUPABASE_TEST_USER_B_PASSWORD??''}
};
async function signIn(page:Page,owner:'a'|'b'){
 await page.goto('/login?next=/resume-studio');
 await page.getByRole('textbox',{name:'Email address'}).fill(users[owner].email);
 await page.getByLabel('Password',{exact:true}).fill(users[owner].password);
 await page.getByRole('button',{name:'Sign in',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Resume Studio'})).toBeVisible({timeout:20000});
}
async function cleanupJob(page:Page,title:string){
 await page.goto('/resume-studio/tailor');
 const row=page.locator('article.card').filter({has:page.getByRole('heading',{name:title,exact:true})});
 if(!await row.count())return;
 page.once('dialog',dialog=>dialog.accept());
 await row.getByRole('button',{name:'Delete job brief'}).click();
 await expect(row).toHaveCount(0);
}
async function cleanupResume(page:Page,title:string){
 await page.goto('/resume-studio');
 const row=page.locator('article.resume-library-card').filter({has:page.getByRole('heading',{name:title,exact:true})});
 if(!await row.count())return;
 page.once('dialog',dialog=>dialog.accept());
 await row.getByRole('button',{name:'Delete',exact:true}).click();
 await expect(row).toHaveCount(0);
}
test.describe('Step 4 protected signed-in staging acceptance',()=>{
 test.skip(!enabled,'Owner-approved separate staging project and explicit Step 4 opt-in required.');
 test.describe.configure({mode:'serial'});

 test('source version → private job → independent targeted CV → verified export and account isolation',async({
  page,browser
 },testInfo)=>{
  test.skip(testInfo.project.name!=='desktop-chromium','Only one mutation flow on desktop.');
  const id=randomUUID().slice(0,12),sourceName='ST4 Source '+id;
  const jobTitle='ST4 Job '+id,employer='Staging Example';
  const targetName=jobTitle+' — '+employer;
  const baseline='Verified fictional QA baseline '+id;
  const latest='Newer source revision '+id;
  const tailored='Independent targeted summary '+id;
  let other:Awaited<ReturnType<typeof browser.newContext>>|undefined;
  await signIn(page,'a');
  try{
   // All test-created rows are uniquely named. No existing resume is altered.
   await page.getByLabel('Resume name').fill(sourceName);
   await page.getByRole('button',{name:'Create resume'}).click();
   await expect(page.getByRole('heading',{name:sourceName,exact:true})).toBeVisible({timeout:20000});
   await page.getByPlaceholder('Brief factual overview of your experience, strengths and target work.').fill(baseline);
   await page.getByRole('button',{name:'+ Manual entry'}).click();
   await page.getByLabel('Title / degree / skill').fill('Synthetic operations analyst');
   await page.getByRole('button',{name:'+ Bullet'}).click();
   await page.getByLabel('Bullet 1').fill('Prepared test-only inventory reports with Excel.');
   await page.getByRole('button',{name:'Save now'}).click();
   await expect(page.locator('.resume-editor-top [role="status"]')).toContainText('All changes saved');
   await page.reload();
   await expect(page.getByPlaceholder('Brief factual overview of your experience, strengths and target work.')).toHaveValue(baseline);
   await page.getByLabel('Version label (optional)').fill('QA baseline');
   await page.getByRole('button',{name:'Save version'}).click();
   await expect(page.getByText('Saved immutable version #1.',{exact:false})).toBeVisible({timeout:20000});
   await page.getByPlaceholder('Brief factual overview of your experience, strengths and target work.').fill(latest);
   await page.getByRole('button',{name:'Save now'}).click();
   await expect(page.locator('.resume-editor-top [role="status"]')).toContainText('All changes saved');

   await page.goto('/resume-studio/tailor');
   await page.getByLabel('Job title *').fill(jobTitle);
   await page.getByLabel('Employer',{exact:true}).fill(employer);
   await page.getByLabel('Paste the complete job description *').fill(
    'Required: Microsoft Excel reporting experience and verified operations documentation.\n'+
    'Preferred: project coordination and clear English communication.'
   );
   await page.getByRole('button',{name:'Save job and review requirements'}).click();
   await expect(page.getByRole('heading',{name:jobTitle,exact:true})).toBeVisible({timeout:20000});
   await expect(page.getByText('Original text and location are private to your account.',{exact:false})).toBeVisible();
   await page.getByLabel('Choose the original resume').selectOption({label:sourceName});
   const versionPicker=page.getByLabel('Saved version (optional)');
   await expect(versionPicker.locator('option',{hasText:'Version #1'})).toHaveCount(1);
   await versionPicker.selectOption({label:'Version #1 — QA baseline'});
   await page.getByRole('button',{name:'Create independent targeted CV'}).click();
   await expect(page.getByRole('link',{name:'Open targeted editor + confirmed facts'})).toBeVisible({timeout:20000});
   await page.getByRole('link',{name:'Open targeted editor + confirmed facts'}).click();
   await expect(page.getByRole('heading',{name:targetName,exact:true})).toBeVisible({timeout:20000});
   await expect(page.getByPlaceholder('Brief factual overview of your experience, strengths and target work.')).toHaveValue(baseline);
   await page.getByPlaceholder('Brief factual overview of your experience, strengths and target work.').fill(tailored);
   await page.getByRole('button',{name:'Save now'}).click();
   await expect(page.locator('.resume-editor-top [role="status"]')).toContainText('All changes saved');

   const [docx]=await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button',{name:'Download DOCX'}).click()
   ]);
   expect(docx.suggestedFilename()).toMatch(/\.docx$/i);
   expect((await stat(await docx.path())).size).toBeGreaterThan(2000);

   // Reloading proves persistence; independent source and historical snapshot
   // remain unmodified by editing the target.
   await page.reload();
   await expect(page.getByPlaceholder('Brief factual overview of your experience, strengths and target work.')).toHaveValue(tailored);
   await page.goto('/resume-studio');
   const sourceRow=page.locator('article.resume-library-card').filter({has:page.getByRole('heading',{name:sourceName,exact:true})});
   await sourceRow.getByRole('link',{name:'Edit'}).click();
   await expect(page.getByPlaceholder('Brief factual overview of your experience, strengths and target work.')).toHaveValue(latest);
   const account=await page.request.get('/api/account/export');
   expect(account.ok()).toBe(true);
   expect(JSON.stringify(await account.json())).toContain(jobTitle);

   // A second signed-in person cannot browse or export the owner's job brief.
   other=await browser.newContext({baseURL:'http://127.0.0.1:3100'});
   const second=await other.newPage();
   await signIn(second,'b');
   await second.goto('/resume-studio/tailor');
   await expect(second.getByRole('heading',{name:jobTitle,exact:true})).toHaveCount(0);
   await second.goto('/resume-studio');
   await expect(second.getByRole('heading',{name:targetName,exact:true})).toHaveCount(0);
   const otherExport=await second.request.get('/api/account/export');
   expect(otherExport.ok()).toBe(true);
   expect(JSON.stringify(await otherExport.json())).not.toContain(id);

   await cleanupJob(page,jobTitle);
   // Deleting a job brief does not cascade to either independent CV.
   await page.goto('/resume-studio');
   await expect(page.getByRole('heading',{name:sourceName,exact:true})).toBeVisible();
   await expect(page.getByRole('heading',{name:targetName,exact:true})).toBeVisible();
  }finally{
   if(other)await other.close();
   // Cleanup is limited to unique IDs created by this test.
   await cleanupJob(page,jobTitle);
   await cleanupResume(page,targetName);
   await cleanupResume(page,sourceName);
  }
 });
});
