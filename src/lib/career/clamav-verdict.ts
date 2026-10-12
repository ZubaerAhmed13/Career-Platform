/** Clamd must return exactly a clean INSTREAM verdict; all errors fail closed. */
export function isCleanClamAVVerdict(value:string):boolean {
 return /^stream: OK(?:\n|\0|\r\n)?$/.test(value);
}
