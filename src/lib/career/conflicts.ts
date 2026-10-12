import type { CareerRecord, CareerSuggestion } from './schema';

/** Conservative candidate matching. It flags possibilities; never merges anything. */
function tokens(text:string){
 return new Set((text.normalize('NFKC').toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu)??[]).filter(x=>x.length>2));
}
export function potentialCareerConflicts(
 suggestion:Pick<CareerSuggestion,'kind'|'title'|'description'>,
 records:Pick<CareerRecord,'id'|'kind'|'title'|'organization'>[],
){
 const expected=tokens(suggestion.title);
 const description=suggestion.description.normalize('NFKC').toLocaleLowerCase();
 return records.filter(record=>{
  if(record.kind!==suggestion.kind)return false;
  const actual=tokens(record.title);
  const overlap=[...expected].filter(x=>actual.has(x)).length;
  const matchingTitle=expected.size>0&&
   (overlap===expected.size&&overlap===actual.size ||
    (overlap>=2&&overlap/Math.max(expected.size,actual.size)>=0.67));
  const matchingEmployer=record.organization.trim().length>=5 &&
    description.includes(record.organization.normalize('NFKC').toLocaleLowerCase());
  return matchingTitle||matchingEmployer;
 });
}
