import {defineConfig,devices} from '@playwright/test';

export default defineConfig({
 testDir:'./tests/e2e',
 fullyParallel:true,
 retries:process.env.CI?1:0,
 reporter:'list',
 timeout:45_000,
 use:{baseURL:'http://127.0.0.1:3100',trace:'retain-on-failure'},
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
   NEXT_PUBLIC_SUPABASE_URL:'https://example.supabase.co',
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'dummy-build-only-publishable-key',
   NEXT_PUBLIC_SITE_URL:'http://127.0.0.1:3100',
  },
 },
});
