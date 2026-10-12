import {describe,it,expect} from 'vitest';
import {profileSchema,profileCompletion} from '../src/lib/profile';
import {safeNextPath} from '../src/lib/security';
describe('validation',()=>{it('rejects unsupported roles and excessive names',()=>{expect(profileSchema.safeParse({target_role:'x'.repeat(151)}).success).toBe(false)});it('calculates completion from saved fields',()=>{expect(profileCompletion({display_name:'Mina'})).toBe(17);expect(profileCompletion({})).toBe(0)});it('prevents external redirects',()=>{expect(safeNextPath('//evil.test')).toBe('/dashboard');expect(safeNextPath('/settings')).toBe('/settings');expect(safeNextPath('https://evil.test')).toBe('/dashboard')})});
