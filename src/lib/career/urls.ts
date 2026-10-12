/** Block unexpected schemes from both the UI and exported review source links. */
export function safeEvidenceUrl(value:string):string|null {
 try{
  const url=new URL(value);
  if(!['http:','https:'].includes(url.protocol))return null;
  if(!url.hostname)return null;
  if(url.username||url.password)return null;
  return url.toString();
 }catch{return null;}
}
