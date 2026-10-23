import type {ResumeDoc,ResumeEntry} from './schema';
import {formatDate,displayExtraLabel} from './schema';

const translated:Record<string,Record<string,string>>={
 en:{Experience:'Experience',Education:'Education',Skills:'Skills',Languages:'Languages',Projects:'Projects',
  Achievements:'Achievements',Certifications:'Certifications',Volunteering:'Volunteering'},
 de:{Experience:'Berufserfahrung',Education:'Ausbildung',Skills:'Kenntnisse',Languages:'Sprachen',
  Projects:'Projekte',Achievements:'Erfolge',Certifications:'Zertifikate',Volunteering:'Ehrenamt'}
};
export function sectionHeading(title:string,language:'en'|'de'){
 return translated[language]?.[title]??title;
}
export function entryDates(entry:ResumeEntry,doc:ResumeDoc){
 const start=formatDate(entry.startedOn,doc.settings.dateStyle,doc.settings.language);
 const end=entry.current?(doc.settings.language==='de'?'Heute':'Present'):
  formatDate(entry.endedOn,doc.settings.dateStyle,doc.settings.language);
 return [start,end].filter(Boolean).join(' – ');
}
export function orderedSections(doc:ResumeDoc){
 // Template choice supplies initial order only. User-controlled ordering always wins.
 return doc.sections.filter(s=>s.visible&&s.entries.some(e=>e.visible));
}
export function resumeLines(doc:ResumeDoc){
 const lines:{type:'name'|'headline'|'contact'|'section'|'summary'|'entry'|'meta'|'bullet';text:string}[]=[];
 const c=doc.contact;
 if(c.name)lines.push({type:'name',text:c.name});
 if(c.headline&&!c.hidden.includes('headline'))lines.push({type:'headline',text:c.headline});
 const contact=(['email','phone','location','linkedin','portfolio','github','website'] as const)
  .filter(key=>c[key]&&!c.hidden.includes(key)).map(key=>c[key]);
 if(contact.length)lines.push({type:'contact',text:contact.join(' · ')});
 if(doc.summaryVisible&&doc.summary.trim()){
  lines.push({type:'section',text:doc.settings.language==='de'?'Profil':'Professional Summary'});
  lines.push({type:'summary',text:doc.summary});
 }
 for(const section of orderedSections(doc)){
  lines.push({type:'section',text:sectionHeading(section.title,doc.settings.language)});
  for(const entry of section.entries.filter(e=>e.visible)){
   if(entry.title)lines.push({type:'entry',text:entry.title});
   const meta=[entry.subtitle,entry.location,entryDates(entry,doc)].filter(Boolean).join(' · ');
   if(meta)lines.push({type:'meta',text:meta});
   for(const [key,value] of Object.entries(entry.extras??{}))if(value.trim())lines.push({type:'meta',text:displayExtraLabel(section.kind,key)+': '+value});
   for(const bullet of entry.bullets.filter(b=>b.visible&&b.text.trim()))
    lines.push({type:'bullet',text:bullet.text});
  }
 }
 return lines;
}
export function resumePlainText(doc:ResumeDoc){
 return resumeLines(doc).map(l=>l.type==='bullet'?'• '+l.text:l.text)
  .reduce((text,line,index,all)=>text+(index===0?'':line.startsWith('• ')&&all[index-1]?.startsWith('• ')?'\n':'\n\n')+line,'');
}
/** OOXML is XML 1.0: drop forbidden control code points and replace isolated
 * UTF-16 surrogates. Text pasted from other apps must not corrupt a DOCX. */
function xml(input:string){
 return input.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g,'')
  .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g,'\uFFFD')
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  .replace(/"/g,'&quot;').replace(/'/g,'&apos;');
}
/** Preserve user-entered paragraphs, line breaks and tabs as genuine editable
 * Word text runs. A raw newline inside w:t can otherwise be normalised away. */
function wordText(input:string){
 return input.split(/(\r\n|\r|\n|\t)/).map(part=>{
  if(part==='\r'||part==='\n'||part==='\r\n')return '<w:br/>';
  if(part==='\t')return '<w:tab/>';
  return part?'<w:t xml:space="preserve">'+xml(part)+'</w:t>':'';
 }).join('');
}
function crc32(bytes:Uint8Array){
 let crc=0xffffffff;
 for(const b of bytes){crc^=b;for(let j=0;j<8;j++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
 return (crc^0xffffffff)>>>0;
}
function zipStore(files:{name:string;data:string|Uint8Array}[]):Uint8Array {
 const encoder=new TextEncoder(),parts:Uint8Array[]=[],central:Uint8Array[]=[];
 let offset=0;
 const u16=(view:DataView,p:number,n:number)=>view.setUint16(p,n,true);
 const u32=(view:DataView,p:number,n:number)=>view.setUint32(p,n,true);
 for(const file of files){
  const name=encoder.encode(file.name),data=typeof file.data==='string'?encoder.encode(file.data):file.data,crc=crc32(data);
  const local=new Uint8Array(30+name.length),v=new DataView(local.buffer);
  u32(v,0,0x04034b50);u16(v,4,20);u16(v,6,0x800);u16(v,8,0);
  u32(v,14,crc);u32(v,18,data.length);u32(v,22,data.length);u16(v,26,name.length);
  local.set(name,30);parts.push(local,data);
  const cd=new Uint8Array(46+name.length),cv=new DataView(cd.buffer);
  u32(cv,0,0x02014b50);u16(cv,4,20);u16(cv,6,20);u16(cv,8,0x800);
  u32(cv,16,crc);u32(cv,20,data.length);u32(cv,24,data.length);
  u16(cv,28,name.length);u32(cv,42,offset);cd.set(name,46);central.push(cd);
  offset+=local.length+data.length;
 }
 const size=central.reduce((n,x)=>n+x.length,0),end=new Uint8Array(22),e=new DataView(end.buffer);
 u32(e,0,0x06054b50);u16(e,8,files.length);u16(e,10,files.length);
 u32(e,12,size);u32(e,16,offset);
 const total=offset+size+end.length,result=new Uint8Array(total);
 let pos=0;
 for(const p of [...parts,...central,end]){result.set(p,pos);pos+=p.length;}
 return result;
}
/** Genuine editable OOXML/DOCX with real styles, paragraphs and bullet numbering.
 * No external renderer, uploading or rasterized document. */
export function makeResumeDocx(doc:ResumeDoc):Uint8Array{
 const pts=(value:number)=>String(Math.round(value*20));
 const style=doc.settings;
 const photo=doc.contact.showPhoto&&doc.contact.photo&&
  /^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(doc.contact.photo)
   ?Uint8Array.from(atob(doc.contact.photo.slice('data:image/jpeg;base64,'.length)),char=>char.charCodeAt(0)):null;
 // The optional portrait is a genuinely editable OOXML embedded JPEG, not an external URI.
 const imageXml=photo?'<w:p><w:pPr><w:jc w:val="'+(style.template==='student-graduate'?'center':'right')+'"/></w:pPr><w:r><w:drawing>'+
  '<wp:inline><wp:extent cx="1016000" cy="1016000"/><wp:docPr id="1" name="Portrait" descr="Resume portrait"/>'+
  '<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">'+
  '<pic:pic><pic:nvPicPr><pic:cNvPr id="0" name="Resume portrait"/><pic:cNvPicPr/></pic:nvPicPr>'+
  '<pic:blipFill><a:blip r:embed="rId3"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>'+
  '<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="1016000" cy="1016000"/></a:xfrm>'+
  '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic>'+
  '</a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>':'';
 const body=resumeLines(doc).map(line=>{
  const bold=['name','section','entry'].includes(line.type);
  const heading=({section:'Section',name:'Name',entry:'Entry',headline:'Headline',contact:'Contact',meta:'Meta',summary:'Summary',bullet:'Bullet'} as Record<string,string>)[line.type]??'Normal';
  const bullet=line.type==='bullet'
   ?'<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>':'';
  return '<w:p><w:pPr><w:pStyle w:val="'+heading+'"/>'+bullet+'</w:pPr>'+
   '<w:r><w:rPr>'+(bold?'<w:b/>':'')+'</w:rPr>'+wordText(line.text)+'</w:r></w:p>';
 }).join('');
 const a4=style.paper==='A4';
 // Match the browser preview's 11 mm compact / 16 mm standard page padding.
 const margins=style.margin==='compact'?624:907;
 const document='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
  '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'+
  ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"'+
  ' xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"'+
  ' xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"'+
  ' xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">'+
  '<w:body>'+imageXml+body+'<w:sectPr><w:pgSz w:w="'+(a4?'11906':'12240')+'" w:h="'+(a4?'16838':'15840')+'"/>'+
  '<w:pgMar w:top="'+margins+'" w:right="'+margins+'" w:bottom="'+margins+'" w:left="'+margins+'"/></w:sectPr></w:body></w:document>';
 const theme=style.template;
 const classic=theme==='ats-classic',modern=theme==='modern-professional';
 const graduate=theme==='student-graduate',european=theme==='european-clean';
 const executive=theme==='executive-minimal';
 const accent=classic?'000000':style.accent.slice(1).toUpperCase();
 const nameFont=classic||executive?'Georgia':style.font;
 const nameSize=classic?21:executive?26:graduate?24:23;
 const gap=style.density==='compact'?120:200;
 const normalGap=style.density==='compact'?40:75;
 const nameAlignment=graduate?'<w:jc w:val="center"/>':'';
 const sectionAlignment=graduate?'<w:jc w:val="center"/>':'';
 const sectionDecoration=modern
  ?'<w:pBdr><w:left w:val="single" w:sz="16" w:space="6" w:color="'+accent+'"/></w:pBdr>'
  :european?'<w:shd w:val="clear" w:fill="EEF2F7"/>'
  :'<w:pBdr><w:bottom w:val="single" w:sz="'+(executive?'12':classic?'8':'6')+'" w:space="3" w:color="'+accent+'"/></w:pBdr>';
 const sectionIndent=modern?'<w:ind w:left="140"/>':'';
 const nameCaps=executive?'<w:caps/>':'';
 const styles='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
  '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'+
  '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/>'+
  '<w:pPr><w:spacing w:after="'+normalGap+'" w:line="'+Math.round(240*style.lineSpacing)+'" w:lineRule="auto"/></w:pPr>'+
  '<w:rPr><w:rFonts w:ascii="'+xml(style.font)+'" w:hAnsi="'+xml(style.font)+'"/>'+
  '<w:sz w:val="'+pts(style.bodySize)+'"/></w:rPr></w:style>'+
  '<w:style w:type="paragraph" w:styleId="Name"><w:name w:val="Name"/><w:basedOn w:val="Normal"/>'+
  '<w:pPr><w:keepNext/><w:spacing w:after="80"/>'+nameAlignment+'</w:pPr>'+
  '<w:rPr><w:rFonts w:ascii="'+xml(nameFont)+'" w:hAnsi="'+xml(nameFont)+'"/>'+
  '<w:b/>'+nameCaps+'<w:color w:val="'+accent+'"/><w:sz w:val="'+pts(nameSize)+'"/></w:rPr></w:style>'+
  '<w:style w:type="paragraph" w:styleId="Headline"><w:name w:val="Headline"/><w:basedOn w:val="Normal"/>'+
  '<w:pPr><w:keepNext/><w:spacing w:after="70"/></w:pPr>'+
  '<w:rPr><w:b/><w:sz w:val="220"/></w:rPr></w:style>'+
  '<w:style w:type="paragraph" w:styleId="Contact"><w:name w:val="Contact"/><w:basedOn w:val="Normal"/>'+
  '<w:pPr><w:spacing w:after="100"/></w:pPr><w:rPr><w:color w:val="475569"/>'+
  '<w:sz w:val="180"/></w:rPr></w:style>'+
  '<w:style w:type="paragraph" w:styleId="Section"><w:name w:val="Section"/><w:basedOn w:val="Normal"/>'+
  '<w:pPr><w:keepNext/>'+sectionDecoration+
  '<w:spacing w:before="'+gap+'" w:after="95"/>'+sectionIndent+
  sectionAlignment+'</w:pPr>'+
  '<w:rPr><w:b/><w:color w:val="'+(european?'1E293B':accent)+'"/>'+
  '<w:sz w:val="'+pts(style.headingSize)+'"/></w:rPr></w:style>'+
  '<w:style w:type="paragraph" w:styleId="Entry"><w:name w:val="Entry"/><w:basedOn w:val="Normal"/>'+
  '<w:pPr><w:keepNext/><w:spacing w:before="100" w:after="20"/></w:pPr>'+
  '<w:rPr><w:b/></w:rPr></w:style>'+
  '<w:style w:type="paragraph" w:styleId="Meta"><w:name w:val="Meta"/><w:basedOn w:val="Normal"/>'+
  '<w:rPr><w:i/><w:color w:val="475569"/></w:rPr></w:style>'+
  '<w:style w:type="paragraph" w:styleId="Summary"><w:name w:val="Summary"/><w:basedOn w:val="Normal"/></w:style>'+
  '<w:style w:type="paragraph" w:styleId="Bullet"><w:name w:val="Bullet"/><w:basedOn w:val="Normal"/>'+
  '<w:pPr><w:spacing w:after="'+(style.density==='compact'?15:45)+'"/></w:pPr></w:style>'+
  '</w:styles>';
 const numbering='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
  '<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'+
  '<w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="singleLevel"/><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/><w:lvlJc w:val="left"/></w:lvl></w:abstractNum>'+
  '<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num></w:numbering>';
 const files=[
  {name:'[Content_Types].xml',data:'<?xml version="1.0" encoding="UTF-8"?>'+
   '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'+
   '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'+
   '<Default Extension="xml" ContentType="application/xml"/>'+ (photo?'<Default Extension="jpg" ContentType="image/jpeg"/>':'')+
   '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'+
   '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>'+
   '<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>'+
   '</Types>'},
  {name:'_rels/.rels',data:'<?xml version="1.0" encoding="UTF-8"?>'+
   '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
   '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'+
   '</Relationships>'},
  {name:'word/_rels/document.xml.rels',data:'<?xml version="1.0" encoding="UTF-8"?>'+
   '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
   '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'+
   '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>'+ (photo?'<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/portrait.jpg"/>':'')+
   '</Relationships>'},
  {name:'word/document.xml',data:document},{name:'word/styles.xml',data:styles},{name:'word/numbering.xml',data:numbering},
  ...(photo?[{name:'word/media/portrait.jpg',data:photo}]:[])
 ];
 return zipStore(files);
}
