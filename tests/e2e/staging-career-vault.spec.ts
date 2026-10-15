/**
 * Authenticated end-to-end acceptance for a dedicated, disposable CareerOS
 * staging Supabase project. Never run against the primary production project.
 *
 * The matching Playwright config refuses a production backend, missing accounts
 * or a missing explicit CAREER_STAGING_E2E acknowledgement.
 */
import {randomUUID} from 'node:crypto';
import {test,expect,type Page} from '@playwright/test';

const enabled=process.env.CAREER_STAGING_E2E==='I_UNDERSTAND_STAGING_ONLY';
const users={
 a:{email:process.env.SUPABASE_TEST_USER_A_EMAIL??'',password:process.env.SUPABASE_TEST_USER_A_PASSWORD??''},
 b:{email:process.env.SUPABASE_TEST_USER_B_EMAIL??'',password:process.env.SUPABASE_TEST_USER_B_PASSWORD??''},
};

async function signIn(page:Page,who:'a'|'b'){
 await page.goto('/login?next=/career-vault');
 await page.getByRole('textbox',{name:'Email address'}).fill(users[who].email);
 await page.getByLabel('Password',{exact:true}).fill(users[who].password);
 await page.getByRole('button',{name:'Sign in',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Career Intelligence Vault'})).toBeVisible({timeout:20000});
}
async function cleanupRecord(page:Page,marker:string){
 await page.goto('/career-vault');
 await page.getByLabel('Search your records').fill(marker);
 const record=page.locator('article.card').filter({hasText:marker}).first();
 if(!await record.count())return;
 const close=record.getByRole('button',{name:'Close editor'});
 if(await close.count())await close.click();
 await record.getByRole('button',{name:'Delete',exact:true}).click();
 await record.getByLabel('I understand this cannot be undone').check();
 await record.getByRole('button',{name:'Confirm delete'}).click();
 await expect(page.locator('article.card').filter({hasText:marker})).toHaveCount(0);
}
async function cleanupSuggestion(page:Page,marker:string){
 await page.goto('/career-vault/review');
 const suggestion=page.locator('article.card').filter({hasText:marker}).first();
 if(!await suggestion.count())return;
 await suggestion.getByText('Remove this suggestion').click();
 await suggestion.getByLabel('Permanently remove this suggestion. My confirmed records will stay unchanged.').check();
 await suggestion.getByRole('button',{name:'Remove suggestion'}).click();
 await expect(page.locator('article.card').filter({hasText:marker})).toHaveCount(0);
}
function textPdf(text:string):Buffer{
 const pieces=['%PDF-1.4\n'],offsets=[0];
 const put=(id:number,data:string)=>{
  offsets[id]=Buffer.byteLength(pieces.join(''),'latin1');
  pieces.push(id+' 0 obj\n'+data+'\nendobj\n');
 };
 put(1,'<< /Type /Catalog /Pages 2 0 R >>');
 put(2,'<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
 put(3,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>');
 put(4,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
 const stream='BT /F1 12 Tf 72 720 Td ('+text+') Tj ET';
 put(5,'<< /Length '+Buffer.byteLength(stream,'latin1')+' >>\nstream\n'+stream+'\nendstream');
 const xref=Buffer.byteLength(pieces.join(''),'latin1');
 pieces.push('xref\n0 6\n0000000000 65535 f \n');
 for(let i=1;i<=5;i++)pieces.push(String(offsets[i]).padStart(10,'0')+' 00000 n \n');
 pieces.push('trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF\n');
 return Buffer.from(pieces.join(''),'latin1');
}

function crc32(input:Buffer){
 let crc=0xffffffff;
 for(const byte of input){
  crc^=byte;
  for(let i=0;i<8;i++)crc=crc&1?((crc>>>1)^0xedb88320):(crc>>>1);
 }
 return (crc^0xffffffff)>>>0;
}
function textDocx(text:string):Buffer{
 const files={
  '[Content_Types].xml':'<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
  '_rels/.rels':'<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
  'word/document.xml':'<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>'+text+'</w:t></w:r></w:p></w:body></w:document>',
 };
 const entries:Buffer[]=[],central:Buffer[]=[];let offset=0;
 for(const [name,contents] of Object.entries(files)){
  const n=Buffer.from(name),d=Buffer.from(contents),crc=crc32(d);
  const header=Buffer.alloc(30);
  header.writeUInt32LE(0x04034b50,0);header.writeUInt16LE(20,4);
  header.writeUInt32LE(crc,14);header.writeUInt32LE(d.length,18);
  header.writeUInt32LE(d.length,22);header.writeUInt16LE(n.length,26);
  entries.push(header,n,d);
  const c=Buffer.alloc(46);
  c.writeUInt32LE(0x02014b50,0);c.writeUInt16LE(20,4);c.writeUInt16LE(20,6);
  c.writeUInt32LE(crc,16);c.writeUInt32LE(d.length,20);c.writeUInt32LE(d.length,24);
  c.writeUInt16LE(n.length,28);c.writeUInt32LE(offset,42);
  central.push(c,n);offset+=header.length+n.length+d.length;
 }
 const cd=Buffer.concat(central),eocd=Buffer.alloc(22);
 eocd.writeUInt32LE(0x06054b50,0);eocd.writeUInt16LE(3,8);eocd.writeUInt16LE(3,10);
 eocd.writeUInt32LE(cd.length,12);eocd.writeUInt32LE(offset,16);
 return Buffer.concat([...entries,cd,eocd]);
}

test.describe('CareerOS staging authenticated browser acceptance',()=>{
 test.skip(!enabled,'Requires an explicitly authorized separate Supabase staging project.');
 test.describe.configure({mode:'serial'});

 test('owner creates, reloads, edits, and deletes a confirmed Vault record',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='desktop-chromium','Desktop performs the mutation flow.');
  const marker='Staging QA '+randomUUID().slice(0,12);
  await signIn(page,'a');
  try {
   await page.getByRole('button',{name:/Add career record/}).click();
   await page.getByLabel('Job title',{exact:true}).fill(marker);
   await page.getByLabel('Employer',{exact:true}).fill('Staging-only organization');
   await page.getByLabel('Description, responsibilities and evidence-backed outcomes').fill('Test-only inventory checking with direct evidence.');
   await page.getByLabel('Tools and methods used').fill('Excel, inventory audit');
   await page.getByRole('button',{name:'Save confirmed record'}).click();
   await page.getByLabel('Search your records').fill(marker);
   await expect(page.getByRole('heading',{name:marker})).toBeVisible();
   await page.reload();
   await page.getByLabel('Search your records').fill(marker);
   const original=page.locator('article.card').filter({has:page.getByRole('heading',{name:marker})});
   await expect(original).toBeVisible();
   await expect(original).toContainText('Excel, inventory audit');
   await original.getByRole('button',{name:'Edit',exact:true}).click();
   await original.getByLabel('Job title',{exact:true}).fill(marker+' updated');
   await original.getByRole('button',{name:'Save confirmed record'}).click();
   await expect(page.getByRole('heading',{name:marker+' updated'})).toBeVisible();
   await expect(page.locator('article.card').filter({hasText:marker+' updated'})).toContainText('Excel, inventory audit');
   // Verify persistence across complete sign-out and a fresh authenticated login.
   await page.getByRole('button',{name:'Sign out'}).click();
   await expect(page.getByRole('heading',{name:'Welcome back'})).toBeVisible();
   await signIn(page,'a');
   await page.getByLabel('Search your records').fill(marker);
   await expect(page.getByRole('heading',{name:marker+' updated'})).toBeVisible();
  }finally{
   await cleanupRecord(page,marker);
  }
 });

 test('browser PDF saves only pending owner data; the second user cannot export it',async({page,browser},testInfo)=>{
  test.skip(testInfo.project.name!=='desktop-chromium','Desktop performs the mutation flow.');
  const marker='QaProof'+randomUUID().replace(/-/g,'').slice(0,12);
  await signIn(page,'a');
  let other:Awaited<ReturnType<typeof browser.newContext>>|undefined;
  try{
   await page.goto('/career-vault/review');
   const rawPostBodies:string[]=[];
   page.on('request',request=>{
    if(request.method()==='POST')rawPostBodies.push(request.postData()??'');
   });
   await page.locator('#local-cv-file').setInputFiles({
    name:'staging-example.pdf',mimeType:'application/pdf',
    buffer:textPdf('This staging test uses local career evidence '+marker),
   });
   await page.getByRole('button',{name:'Extract text locally'}).click();
   await expect(page.locator('#local-cv-preview')).toHaveValue(new RegExp(marker),{timeout:30000});
   const reviewed='Career evidence '+marker+' with real inventory checking experience for staging acceptance only.';
   await page.locator('#local-cv-preview').fill(reviewed);
   await page.getByLabel('I have permission to use this CV text.').check();
   await page.getByLabel(/I understand only this edited text is sent to Supabase/).check();
   await page.getByRole('button',{name:'Save selected text to my review queue'}).click();
   await expect(page.getByText(/Saved 1 draft career fact/)).toBeVisible({timeout:20000});
   expect(rawPostBodies.every(body=>!body.includes('%PDF-')&&!body.includes('%%EOF')&&!body.includes('staging-example.pdf'))).toBe(true);
   await page.reload();
   const suggestion=page.locator('article.card').filter({hasText:marker}).first();
   await expect(suggestion).toBeVisible();
   await expect(suggestion).toContainText('pending');
   const ownExport=await page.request.get('/api/career-vault/export');
   expect(ownExport.ok()).toBe(true);
   expect(JSON.stringify(await ownExport.json())).toContain(marker);
   const fullExport=await page.request.get('/api/account/export');
   expect(fullExport.ok()).toBe(true);
   const ownerArchive=await fullExport.json();
   expect(ownerArchive.format).toBe('CareerOS-Account-v1');
   expect(JSON.stringify(ownerArchive)).toContain(marker);

   other=await browser.newContext({baseURL:'http://127.0.0.1:3100'});
   const otherPage=await other.newPage();
   await signIn(otherPage,'b');
   await otherPage.goto('/career-vault/review');
   await expect(otherPage.getByText(marker,{exact:false})).toHaveCount(0);
   const foreignExport=await otherPage.request.get('/api/career-vault/export');
   expect(foreignExport.ok()).toBe(true);
   expect(JSON.stringify(await foreignExport.json())).not.toContain(marker);
   const foreignAccountArchive=await otherPage.request.get('/api/account/export');
   expect(foreignAccountArchive.ok()).toBe(true);
   expect(JSON.stringify(await foreignAccountArchive.json())).not.toContain(marker);
   await page.goto('/career-vault/review');
   const ownDraft=page.locator('article.card').filter({hasText:marker}).first();
   await ownDraft.getByRole('button',{name:'Approve as new fact'}).click();
   await expect(page.getByRole('heading',{name:'Review history'}).locator('..').locator('article.card').filter({hasText:marker})).toContainText('approved',{timeout:20000});
   await page.goto('/career-vault');
   await page.getByLabel('Search your records').fill(marker);
   await expect(page.locator('article.card').filter({hasText:marker})).toBeVisible();
   await otherPage.goto('/career-vault');
   await otherPage.getByLabel('Search your records').fill(marker);
   await expect(otherPage.locator('article.card').filter({hasText:marker})).toHaveCount(0);
  }finally{
   if(other)await other.close();
   await cleanupRecord(page,marker);
   await cleanupSuggestion(page,marker);
  }
 });


 test('DOCX local import stays pending until explicit approval and persists as an owned record',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='desktop-chromium','Desktop executes the DOCX mutation case.');
  const marker='QA_DOCX_'+randomUUID().replace(/-/g,'').slice(0,12);
  await signIn(page,'a');
  try {
   await page.goto('/career-vault/review');
   const observedPosts:string[]=[];
   page.on('request',request=>{
    if(request.method()==='POST')observedPosts.push(request.postData()??'');
   });
   await page.locator('#local-cv-file').setInputFiles({
    name:'local-acceptance.docx',
    mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    buffer:textDocx('I coordinated actual inventory cycle counts under the test marker '+marker+'.'),
   });
   await page.getByRole('button',{name:'Extract text locally'}).click();
   await expect(page.locator('#local-cv-preview')).toHaveValue(new RegExp(marker),{timeout:30000});
   expect(observedPosts).toHaveLength(0);
   await page.getByLabel('I have permission to use this CV text.').check();
   await page.getByLabel(/I understand only this edited text is sent to Supabase/).check();
   await page.getByRole('button',{name:'Save selected text to my review queue'}).click();
   await expect(page.getByText(/Saved 1 draft career fact/)).toBeVisible({timeout:20000});
   expect(observedPosts.every(body=>!body.includes('word/document.xml')&&!body.includes('local-acceptance.docx'))).toBe(true);
   await page.goto('/career-vault');
   await page.getByLabel('Search your records').fill(marker);
   await expect(page.locator('article.card').filter({hasText:marker})).toHaveCount(0);
   await page.goto('/career-vault/review');
   const proposal=page.locator('article.card').filter({hasText:marker}).first();
   await expect(proposal).toContainText('pending');
   await proposal.getByRole('button',{name:'Approve as new fact'}).click();
   await expect(page.getByRole('heading',{name:'Review history'}).locator('..').locator('article.card').filter({hasText:marker})).toContainText('approved',{timeout:20000});
   await page.goto('/career-vault');
   await page.getByLabel('Search your records').fill(marker);
   await expect(page.locator('article.card').filter({hasText:marker})).toBeVisible();
   const response=await page.request.get('/api/career-vault/export');
   expect(response.ok()).toBe(true);
   const archive=await response.json();
   expect(archive.vault.career_records.some((record:{title:string;source:string})=>record.title.includes(marker)&&record.source==='import')).toBe(true);
  } finally {
   await cleanupRecord(page,marker);
   await cleanupSuggestion(page,marker);
  }
 });

 test('keyboard navigation and labeled interactive controls are available after sign-in',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='desktop-chromium','Keyboard test uses desktop navigation.');
  await signIn(page,'a');
  await page.reload();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link',{name:'Skip to main content'})).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/career-vault/);
  await expect(page.getByRole('heading',{name:'Career Intelligence Vault'})).toBeVisible();
  await page.getByRole('button',{name:/Add career record/}).click();
  await expect(page.getByLabel('Job title',{exact:true})).toBeVisible();
  await expect(page.getByLabel('Employer',{exact:true})).toBeVisible();
  await expect(page.getByLabel('Description, responsibilities and evidence-backed outcomes')).toBeVisible();
  await page.getByRole('button',{name:'Cancel'}).click();
  await page.goto('/career-vault/privacy');
  await expect(page.getByRole('heading',{name:'Career Vault privacy & data export'})).toBeVisible();
  await page.getByRole('button',{name:'Show irreversible Vault-clear controls'}).click();
  await expect(page.getByLabel(/Type DELETE MY CAREER VAULT/)).toBeVisible();
  // No irreversible actions are submitted by this accessibility test.
  await page.getByRole('button',{name:'Cancel'}).click();
 });

 test('authenticated mobile Vault and review remain within the viewport',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='mobile-chromium','Mobile-only acceptance.');
  await signIn(page,'a');
  for(const url of ['/career-vault','/career-vault/review','/career-vault/privacy','/career-vault/evidence','/settings']){
   await page.goto(url);
   await expect.poll(()=>page.evaluate(()=>
    document.documentElement.scrollWidth<=window.innerWidth+1
   )).toBe(true);
  }
 });
});
