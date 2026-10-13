import { describe, it, expect } from 'vitest';
import { identifyCv, MAX_CV_BYTES } from '../src/lib/career/cv-format';

describe('untrusted CV format validation',()=>{
 it('recognizes PDF by signature and extension',()=>{
  const bytes=Buffer.from('%PDF-1.6\nbody');
  expect(identifyCv(bytes,'application.pdf')).toBe('pdf');
  expect(()=>identifyCv(bytes,'fake.docx')).toThrow();
 });
 it('recognizes DOCX ZIP signature but rejects mismatches',()=>{
  const bytes=Buffer.from([0x50,0x4b,0x03,0x04,0,0,0,0]);
  expect(identifyCv(bytes,'my cv.docx')).toBe('docx');
  expect(()=>identifyCv(bytes,'my cv.pdf')).toThrow();
 });
 it('enforces byte limits and empty input',()=>{
  expect(()=>identifyCv(new Uint8Array(),'empty.pdf')).toThrow();
  expect(()=>identifyCv(new Uint8Array(MAX_CV_BYTES+1),'huge.pdf')).toThrow();
 });
});
