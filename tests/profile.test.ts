import { describe, it, expect } from 'vitest';
import { profileSchema, profileCompletion } from '../src/lib/profile';
import { safeNextPath, safePublicOrigin } from '../src/lib/security';

describe('profile validation', () => {
  it('rejects overly long names and roles', () => {
    expect(profileSchema.safeParse({ display_name: 'x'.repeat(81) }).success).toBe(false);
    expect(profileSchema.safeParse({ target_role: 'x'.repeat(151) }).success).toBe(false);
  });

  it('rejects unsupported language, stage, goals and appearance', () => {
    expect(profileSchema.safeParse({ preferred_language: 'fr' }).success).toBe(false);
    expect(profileSchema.safeParse({ career_stage: 'executive_plus' }).success).toBe(false);
    expect(profileSchema.safeParse({ primary_goal: 'unknown' }).success).toBe(false);
    expect(profileSchema.safeParse({ theme_preference: 'neon' }).success).toBe(false);
  });

  it('calculates completion only from verified profile fields', () => {
    expect(profileCompletion({ display_name: 'Mina' })).toBe(17);
    expect(profileCompletion({})).toBe(0);
    expect(profileCompletion({
      display_name: 'Mina', country: 'Germany', preferred_language: 'en',
      career_stage: 'student', target_role: 'Analyst', primary_goal: 'resume',
    })).toBe(100);
  });

  it('strips user-supplied ownership identifiers from profile updates', () => {
    const value = profileSchema.parse({ id: 'not-the-authenticated-user', display_name: 'Mina' });
    expect(Object.prototype.hasOwnProperty.call(value, 'id')).toBe(false);
  });
});

describe('safe redirects and site origins', () => {
  it('allows only recognized local destinations', () => {
    expect(safeNextPath('/settings')).toBe('/settings');
    expect(safeNextPath('/dashboard?source=email')).toBe('/dashboard?source=email');
    expect(safeNextPath('/private-unrecognized')).toBe('/dashboard');
  });

  it('blocks external and encoded malicious redirects', () => {
    for (const value of [
      'https://evil.test', '//evil.test', '/%2f%2fevil.test',
      '/%5cevil.test', '/dashboard%0d%0aLocation:evil.test',
      'javascript:alert(1)', '/%00settings', '/%not-valid',
    ]) {
      expect(safeNextPath(value)).toBe('/dashboard');
    }
  });

  it('accepts only http(s) origins', () => {
    expect(safePublicOrigin('https://example.com/path')).toBe('https://example.com');
    expect(() => safePublicOrigin('javascript:alert(1)')).toThrow();
  });
});
