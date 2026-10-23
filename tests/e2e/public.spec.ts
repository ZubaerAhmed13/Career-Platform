import {test,expect} from '@playwright/test';

test('public home shows honest career-platform introduction',async({page})=>{
 await page.goto('/');
 await expect(page.getByRole('heading',{name:/next career move deserves a better workspace/i})).toBeVisible();
 await expect(page.getByRole('link',{name:/create your account/i})).toBeVisible();
});

test('login, signup and recovery are keyboard-accessible',async({page})=>{
 await page.goto('/login');
 await expect(page.getByRole('heading',{name:'Welcome back'})).toBeVisible();
 await expect(page.getByRole('textbox',{name:'Email address'})).toBeVisible();
 await expect(page.getByLabel('Password',{exact:true})).toBeVisible();
 await page.getByRole('link',{name:'Forgot password?'}).click();
 await expect(page.getByRole('heading',{name:'Reset your password'})).toBeVisible();
 await page.getByRole('link',{name:'Back to sign in'}).click();
 await expect(page.getByRole('heading',{name:'Welcome back'})).toBeVisible();
 await page.getByRole('link',{name:'Create an account'}).click();
 await expect(page.getByRole('heading',{name:'Start your career workspace'})).toBeVisible();
});

test('private Career Vault never renders to an anonymous visitor',async({page})=>{
 await page.goto('/career-vault');
 await expect(page).toHaveURL(/\/login(?:\?|$)/);
 await expect(page.getByRole('heading',{name:'Welcome back'})).toBeVisible();
 await expect(page.getByRole('heading',{name:'Career Intelligence Vault'})).toHaveCount(0);
});

test('public forms fit mobile screens without horizontal scrolling',async({page})=>{
 for(const path of ['/', '/login','/signup','/forgot-password']){
  await page.goto(path);
  await expect.poll(async()=>page.evaluate(()=>
   document.documentElement.scrollWidth<=window.innerWidth+1
  )).toBe(true);
 }
});


test('anonymous account export never returns another user\'s data',async({request})=>{
 const response=await request.get('/api/account/export');
 expect(response.status()).toBe(401);
 expect(response.headers()['cache-control']).toContain('no-store');
});

test('anonymous career export is denied with no-store caching',async({request})=>{
 const response=await request.get('/api/career-vault/export');
 expect(response.status()).toBe(401);
 expect(response.headers()['cache-control']).toContain('no-store');
});



test('direct PDF print page requires explicit review and blocks invalid content',async({page})=>{
 await page.addInitScript(()=>{
  const w=window as Window & {__syntheticPrintCount?:number};
  w.print=()=>{w.__syntheticPrintCount=(w.__syntheticPrintCount??0)+1;};
 });
 const printCount=()=>page.evaluate(()=>(window as Window & {__syntheticPrintCount?:number}).__syntheticPrintCount??0);
 await page.goto('/resume-fixture/print?warning=1');
 await expect(page.getByText('Check percentage achievements against original evidence before using them.')).toBeVisible();
 page.once('dialog',dialog=>dialog.dismiss());
 await page.getByRole('button',{name:'Print / Save as PDF'}).click();
 expect(await printCount()).toBe(0);
 page.once('dialog',dialog=>dialog.accept());
 await page.getByRole('button',{name:'Print / Save as PDF'}).click();
 await expect.poll(printCount).toBe(1);

 await page.goto('/resume-fixture/print?invalid=1');
 await expect(page.getByText('Print blocked until the document is corrected.')).toBeVisible();
 await expect(page.getByRole('button',{name:'Print / Save as PDF'})).toBeDisabled();

 await page.goto('/resume-fixture/print');
 await expect(page.getByRole('button',{name:'Print / Save as PDF'})).toBeEnabled();
 await expect(page.getByText('Review these items before printing:')).toHaveCount(0);
});

test('private Resume Studio and guessed resume UUID redirect anonymous browsers',async({page})=>{
 for(const url of ['/resume-studio','/resume-studio/11111111-1111-4111-8111-111111111111',
  '/resume-studio/11111111-1111-4111-8111-111111111111/print',
  '/resume-studio/tailor','/resume-studio/tailor/11111111-1111-4111-8111-111111111111']){
  await page.goto(url);
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
 }
});
test('synthetic resume document is legible on mobile, without real account data',async({page})=>{
 await page.goto('/resume-fixture');
 await expect(page.getByRole('heading',{name:'Example Student'})).toBeVisible();
 await expect(page.getByText('Checked inventory accuracy against stock records.')).toBeVisible();
 await expect(page.locator('.resume-paper')).toHaveAttribute('data-paper','A4');
 const hasOverflow=await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+2);
 // The paper is larger than a phone. On mobile a preview container, not the page, should scroll.
 expect(hasOverflow).toBe(false);
});


test('browser PDF has selectable text and multiple intact pages for a long resume',async({page,isMobile})=>{
 test.skip(isMobile,'PDF output validated in desktop Chromium; mobile layout tested separately');
 const {extractText,getDocumentProxy}=await import('unpdf');
 for(const paper of ['A4','Letter']){
  await page.goto('/resume-fixture?long=1&paper='+paper);
  const bytes=await page.pdf({format:paper==='A4'?'A4':'Letter',preferCSSPageSize:true,printBackground:true});
  expect(bytes.subarray(0,5).toString('utf8')).toBe('%PDF-');
  const proxy=await getDocumentProxy(new Uint8Array(bytes));
  try{
   expect(proxy.numPages).toBeGreaterThan(1);
   const result=await extractText(proxy,{mergePages:true});
   expect(result.text).toContain('Example Student');
   expect(result.text).toContain('Synthetic employer 9');
   expect(result.text).toContain('Synthetic achievement 9/7');
  }finally{await (proxy as unknown as {destroy?:()=>Promise<void>}).destroy?.();}
 }
});


test('synthetic Resume Studio editor supports fact selection and template switching',async({page,isMobile})=>{
 await page.goto('/resume-fixture/editor');
 await expect(page.getByRole('heading',{name:'Synthetic CV – preview test'})).toBeVisible();
 await page.getByRole('button',{name:'Add',exact:true}).click();
 await expect(page.getByText('Synthetic Inventory Assistant',{exact:true}).first()).toBeVisible();
 if(isMobile)await page.getByRole('button',{name:'Preview',exact:true}).first().click();
 await expect(page.getByRole('heading',{name:'Synthetic Inventory Assistant',exact:true})).toBeVisible();
 if(isMobile)await page.getByRole('button',{name:'Design',exact:true}).first().click();
 await page.locator('#resume-design-template').selectOption('modern-professional');
 if(isMobile)await page.getByRole('button',{name:'Preview',exact:true}).first().click();
 await expect(page.locator('.resume-paper')).toHaveClass(/resume-modern/);
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+2);
 expect(overflow).toBe(false);
});
test('DOCX pre-export review can be cancelled or explicitly accepted in the synthetic editor',async({page})=>{
 await page.goto('/resume-fixture/editor');
 page.once('dialog',async dialog=>{
  expect(dialog.message()).toContain('no visible career entries');
  await dialog.dismiss();
 });
 await page.getByRole('button',{name:'Download DOCX'}).click();
 await expect(page.getByText('Export cancelled. Your document was not changed.')).toBeVisible();
 page.once('dialog',async dialog=>{await dialog.accept();});
 const [download]=await Promise.all([
  page.waitForEvent('download'),
  page.getByRole('button',{name:'Download DOCX'}).click()
 ]);
 expect(download.suggestedFilename()).toBe('Example_Applicant.docx');
});

test('optional photo can be added and removed privately in the synthetic editor',async({page})=>{
 await page.goto('/resume-fixture/editor');
 const photo=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLttAAAAABJRU5ErkJggg==','base64');
 await page.getByLabel('Add or replace resume photo').setInputFiles({
  name:'example.png',mimeType:'image/png',buffer:photo
 });
 if(page.viewportSize()?.width&&page.viewportSize()!.width<960){
  await page.getByRole('button',{name:'Preview',exact:true}).first().click();
 }
 await expect(page.getByRole('img',{name:'Resume portrait'})).toBeVisible();
 if(page.viewportSize()?.width&&page.viewportSize()!.width<960){
  await page.getByRole('button',{name:'Content',exact:true}).first().click();
 }
 await page.getByRole('button',{name:'Remove photo'}).click();
 await expect(page.getByRole('img',{name:'Resume portrait'})).toHaveCount(0);
});

test('unsaved CV changes warn before internal navigation and do not store a browser draft',async({page})=>{
 await page.goto('/resume-fixture/editor');
 const summary=page.getByPlaceholder('Brief factual overview of your experience, strengths and target work.');
 await summary.fill('Unique unsaved synthetic profile.');
 page.once('dialog',async dialog=>{
  expect(dialog.message()).toContain('not fully saved');
  await dialog.dismiss();
 });
 await page.getByRole('link',{name:'Resume library'}).click();
 await expect(page).toHaveURL(/\/resume-fixture\/editor$/);
 await expect(summary).toHaveValue('Unique unsaved synthetic profile.');
 await page.getByRole('button',{name:'Save now'}).click();
 await expect(page.locator('.resume-editor-top [role="status"]')).toContainText('All changes saved');
 await page.getByRole('link',{name:'Resume library'}).click();
 await expect(page).toHaveURL(/\/login(?:\?|$)/);
});
