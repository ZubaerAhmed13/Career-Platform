import {defineConfig,devices} from '@playwright/test';

// Separate authenticated staging acceptance is opt-in only. The ordinary
// public smoke suite continues using a dummy/no-data Supabase configuration.
const staging=process.env.CAREER_STAGING_E2E==='I_UNDERSTAND_STAGING_ONLY';
if(staging){
 const required=['SUPABASE_TEST_PROJECT_URL','SUPABASE_TEST_PUBLISHABLE_KEY',
  'SUPABASE_TEST_USER_A_EMAIL','SUPABASE_TEST_USER_A_PASSWORD',
  'SUPABASE_TEST_USER_B_EMAIL','SUPABASE_TEST_USER_B_PASSWORD'];
 const missing=required.filter(key=>!process.env[key]);
 if(missing.length)throw new Error('Protected staging acceptance needs: '+missing.join(', '));
 const url=new URL(process.env.SUPABASE_TEST_PROJECT_URL!);
 if(url.protocol!=='https:'||!url.hostname.endsWith('.supabase.co')||
    url.hostname==='jtitfwzpfbyfsdpxxrbj.supabase.co'||url.pathname!=='/')
  throw new Error('Refusing browser mutation tests without a dedicated Supabase staging project.');
 if(process.env.SUPABASE_TEST_USER_A_EMAIL===process.env.SUPABASE_TEST_USER_B_EMAIL)
  throw new Error('Two different staging users are required.');
 if(process.env.CAREER_STAGING_ERASURE==='I_UNDERSTAND_DELETES_DISPOSABLE_USERS'){
  const erasure=['SUPABASE_TEST_PURGE_USER_EMAIL','SUPABASE_TEST_PURGE_USER_PASSWORD',
   'SUPABASE_TEST_DELETE_USER_EMAIL','SUPABASE_TEST_DELETE_USER_PASSWORD',
   'SUPABASE_SERVICE_ROLE_KEY'];
  if(erasure.some(key=>!process.env[key]))
   throw new Error('Destructive staging acceptance requires extra throwaway users and a protected staging-only admin key.');
  const accounts=[process.env.SUPABASE_TEST_USER_A_EMAIL,process.env.SUPABASE_TEST_USER_B_EMAIL,
   process.env.SUPABASE_TEST_PURGE_USER_EMAIL,process.env.SUPABASE_TEST_DELETE_USER_EMAIL];
  if(new Set(accounts.map(email=>email?.toLowerCase())).size!==4)
   throw new Error('Destructive staging acceptance requires four distinct test identities.');
 }

}

export default defineConfig({
 testDir:'./tests/e2e',
 fullyParallel:!staging,
 workers:staging?1:undefined,
 retries:staging?0:process.env.CI?1:0,
 reporter:'list',
 timeout:staging?60_000:45_000,
 use:{
  baseURL:'http://127.0.0.1:3100',
  // A failing sign-in test must never publish passwords or sessions in traces.
  trace:staging?'off':'retain-on-failure',
  screenshot:'off',video:'off',
 },
 projects:[
  {name:'desktop-chromium',use:{...devices['Desktop Chrome']}},
  {name:'mobile-chromium',use:{...devices['Pixel 7']}},
 ],
 webServer:{
  command:'npm run dev -- --hostname 127.0.0.1 --port 3100',
  url:'http://127.0.0.1:3100',
  reuseExistingServer:!process.env.CI,
  timeout:120_000,
  env:{
   NEXT_PUBLIC_SUPABASE_URL:staging?process.env.SUPABASE_TEST_PROJECT_URL!:'https://example.supabase.co',
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:staging?process.env.SUPABASE_TEST_PUBLISHABLE_KEY!:'dummy-build-only-publishable-key',
   NEXT_PUBLIC_SITE_URL:'http://127.0.0.1:3100',
  },
 },
});
