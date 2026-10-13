import {test,expect} from '@playwright/test';

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

test('PDF extraction happens in browser and user edits before text-only submission',async({page})=>{
 await page.goto('/local-cv-fixture');
 const sent:string[]=[];
 page.on('request',req=>{if(req.method()==='POST')sent.push(req.url());});
 await page.locator('#local-cv-file').setInputFiles({
  name:'local.pdf',mimeType:'application/pdf',
  buffer:textPdf('Work Experience I completed cycle counts for inventory accuracy'),
 });
 await page.getByRole('button',{name:'Extract text locally'}).click();
 await expect(page.locator('#local-cv-preview, #local-cv-import p.error[role="alert"]')).toBeVisible({timeout:15000});
 const pdfProblem=await page.locator('#local-cv-import p.error[role="alert"]').textContent();
 expect(pdfProblem,'PDF local extraction failed: '+pdfProblem).toBeFalsy();
 await expect(page.locator('#local-cv-preview')).toHaveValue(/cycle counts/,{timeout:15000});
 await expect(page.getByText(/Local extraction complete/)).toBeVisible();
 expect(sent).toEqual([]);
 await page.locator('#local-cv-preview').fill('Work Experience\nI completed inventory cycle counts with a team.');
 await expect(page.getByRole('button',{name:'Save selected text to my review queue'})).toBeEnabled();
});
test('DOCX extraction works in browser without a document upload',async({page})=>{
 await page.goto('/local-cv-fixture');
 const sent:string[]=[];
 page.on('request',req=>{if(req.method()==='POST')sent.push(req.url());});
 await page.locator('#local-cv-file').setInputFiles({
  name:'local.docx',
  mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  buffer:textDocx('Work Experience I coordinated inventory checks.'),
 });
 await page.getByRole('button',{name:'Extract text locally'}).click();
 await expect(page.locator('#local-cv-preview')).toHaveValue(/coordinated inventory checks/,{timeout:30000});
 expect(sent).toEqual([]);
});
test('bad and mismatched files are never parsed or sent',async({page})=>{
 await page.goto('/local-cv-fixture');
 await page.locator('#local-cv-file').setInputFiles({
  name:'faked.pdf',mimeType:'application/pdf',buffer:Buffer.from('This is not a PDF.'),
 });
 await page.getByRole('button',{name:'Extract text locally'}).click();
 await expect(page.locator('#local-cv-import p.error[role="alert"]')).toContainText(/signature|Could not read/);
 await expect(page.locator('#local-cv-preview')).toHaveCount(0);
});
