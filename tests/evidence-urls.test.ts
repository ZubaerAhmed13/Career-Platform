import {describe,it,expect} from 'vitest';
import {safeEvidenceUrl} from '../src/lib/career/urls';
describe('safe evidence links',()=>{
 it('accepts HTTPS and HTTP web sources',()=>{
  expect(safeEvidenceUrl('https://example.org/report')).toBe('https://example.org/report');
  expect(safeEvidenceUrl('http://example.org/')).toBe('http://example.org/');
 });
 it('rejects dangerous schemes and credentialed links',()=>{
  for(const input of ['javascript:alert(1)','data:text/html,a','file:///etc/passwd',
   'https://user:password@example.com/report','//relative.example',''])
   expect(safeEvidenceUrl(input)).toBeNull();
 });
});
