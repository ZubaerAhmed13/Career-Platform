import {describe,it,expect} from 'vitest';
import {isCleanClamAVVerdict} from '../src/lib/career/clamav-verdict';
describe('fail-closed virus scan replies',()=>{
 it('accepts only a clean scanner verdict',()=>{
  expect(isCleanClamAVVerdict('stream: OK\0')).toBe(true);
  expect(isCleanClamAVVerdict('stream: OK\n')).toBe(true);
 });
 it('rejects infected, inconclusive or maliciously padded replies',()=>{
  for(const answer of [
   'stream: Eicar-Test-Signature FOUND\0','stream: ERROR\0',
   'untrusted stream: OK\0','stream: OK\nstream: FOUND\n',
   'stream: OK extra\0','stream: OK\nUnexpected content',
   '', 'stream: OK \0',
  ])expect(isCleanClamAVVerdict(answer)).toBe(false);
 });
});
