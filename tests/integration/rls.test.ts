/**
 * Mandatory live, cross-account RLS tests. Run ONLY against a dedicated staging
 * Supabase project with two disposable, confirmed user accounts.
 *
 * Required env variables:
 * SUPABASE_TEST_PROJECT_URL, SUPABASE_TEST_PUBLISHABLE_KEY
 * SUPABASE_TEST_USER_A_EMAIL, SUPABASE_TEST_USER_A_PASSWORD
 * SUPABASE_TEST_USER_B_EMAIL, SUPABASE_TEST_USER_B_PASSWORD
 * SUPABASE_TEST_ALLOW_MUTATIONS=I_UNDERSTAND_STAGING_ONLY
 */
import { describe, expect, it } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const required = [
  'SUPABASE_TEST_PROJECT_URL',
  'SUPABASE_TEST_PUBLISHABLE_KEY',
  'SUPABASE_TEST_USER_A_EMAIL',
  'SUPABASE_TEST_USER_A_PASSWORD',
  'SUPABASE_TEST_USER_B_EMAIL',
  'SUPABASE_TEST_USER_B_PASSWORD',
] as const;

function stagingConfiguration() {
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) throw new Error('RLS integration test requires: ' + missing.join(', '));
  if (process.env.SUPABASE_TEST_ALLOW_MUTATIONS !== 'I_UNDERSTAND_STAGING_ONLY') {
    throw new Error('Explicit staging-only test acknowledgement required.');
  }
  const env = process.env;
  if (env.SUPABASE_TEST_USER_A_EMAIL === env.SUPABASE_TEST_USER_B_EMAIL) {
    throw new Error('Supply two distinct staging test users.');
  }
  const url = env.SUPABASE_TEST_PROJECT_URL!;
  if (!url.startsWith('https://') || !url.endsWith('.supabase.co')) {
    throw new Error('Expected a dedicated Supabase staging project URL.');
  }
  return {
    url,
    key: env.SUPABASE_TEST_PUBLISHABLE_KEY!,
    a: { email: env.SUPABASE_TEST_USER_A_EMAIL!, password: env.SUPABASE_TEST_USER_A_PASSWORD! },
    b: { email: env.SUPABASE_TEST_USER_B_EMAIL!, password: env.SUPABASE_TEST_USER_B_PASSWORD! },
  };
}

describe('Supabase staging RLS', () => {
  it('isolates private account records across two verified identities', async () => {
    const config = stagingConfiguration();
    const options = { auth: { persistSession: false, autoRefreshToken: false } };
    const a = createClient(config.url, config.key, options);
    const b = createClient(config.url, config.key, options);
    const anonymous = createClient(config.url, config.key, options);

    const { data: aAuth, error: aAuthError } = await a.auth.signInWithPassword(config.a);
    const { data: bAuth, error: bAuthError } = await b.auth.signInWithPassword(config.b);
    expect(aAuthError).toBeNull();
    expect(bAuthError).toBeNull();
    const aId = aAuth.user?.id;
    const bId = bAuth.user?.id;
    if (!aId || !bId || aId === bId) throw new Error('Distinct authenticated users required.');

    const own = await a.from('profiles').select('id, display_name').eq('id', aId).single();
    expect(own.error).toBeNull();
    expect(own.data?.id).toBe(aId);
    const originalName = own.data!.display_name as string;

    const foreignRead = await a.from('profiles').select('id').eq('id', bId);
    expect(foreignRead.error).toBeNull();
    expect(foreignRead.data).toEqual([]);

    const anonymousRead = await anonymous.from('profiles').select('id').eq('id', aId);
    expect(anonymousRead.error).toBeNull();
    expect(anonymousRead.data).toEqual([]);

    const foreignUpdate = await a.from('profiles')
      .update({ display_name: 'Unauthorized change should not appear' })
      .eq('id', bId)
      .select('id');
    expect(foreignUpdate.error).toBeNull();
    expect(foreignUpdate.data).toEqual([]);

    const foreignInsert = await a.from('profiles').insert({ id: bId });
    expect(foreignInsert.error).not.toBeNull();

    const fakeMetadata = await a.from('file_metadata').insert({
      user_id: aId,
      object_path: aId + '/not-an-upload.pdf',
      filename: 'not-an-upload.pdf',
      mime_type: 'application/pdf',
      byte_size: 0,
    });
    expect(fakeMetadata.error).not.toBeNull();

    // Verify an owner can really update its record and restore original content.
    const marker = 'RLS-check-' + Date.now();
    try {
      const ownUpdate = await a.from('profiles')
        .update({ display_name: marker }).eq('id', aId).select('display_name').single();
      expect(ownUpdate.error).toBeNull();
      expect(ownUpdate.data?.display_name).toBe(marker);
    } finally {
      const restore = await a.from('profiles')
        .update({ display_name: originalName }).eq('id', aId);
      expect(restore.error).toBeNull();
    }

    const bAccount = await b.from('profiles').select('id').eq('id', bId).single();
    expect(bAccount.error).toBeNull();
    expect(bAccount.data?.id).toBe(bId);
  });
});
