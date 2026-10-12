/** Clamd must return exactly a clean INSTREAM verdict; all errors fail closed. */
export function isCleanClamAVVerdict(value:string):boolean {
 return /^(?:stream|[^\r\n\0:]{1,100}): OK(?:\n|\0|\r\n)?$/.test(value);
}
