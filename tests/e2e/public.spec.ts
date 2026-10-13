import {test,expect} from '@playwright/test';

test('public home shows honest career-platform introduction',async({page})=>{
 await page.goto('/');
 await expect(page.getByRole('heading',{name:/next career move deserves a better workspace/i})).toBeVisible();
 await expect(page.getByRole('link',{name:/create your account/i})).toBeVisible();
});

test('login, signup and recovery are keyboard-accessible',async({page})=>{
 await page.goto('/login');
 await expect(page.getByRole('heading',{name:'Welcome back'})).toBeVisible();
 await expect(page.getByRole('textbox',{name:'Email address'})).toBeVisible();
 await expect(page.getByLabel('Password',{exact:true})).toBeVisible();
 await page.getByRole('link',{name:'Forgot password?'}).click();
 await expect(page.getByRole('heading',{name:'Reset your password'})).toBeVisible();
 await page.getByRole('link',{name:'Back to sign in'}).click();
 await expect(page.getByRole('heading',{name:'Welcome back'})).toBeVisible();
 await page.getByRole('link',{name:'Create an account'}).click();
 await expect(page.getByRole('heading',{name:'Start your career workspace'})).toBeVisible();
});

test('private Career Vault never renders to an anonymous visitor',async({page})=>{
 await page.goto('/career-vault');
 await expect(page).toHaveURL(/\/login(?:\?|$)/);
 await expect(page.getByRole('heading',{name:'Welcome back'})).toBeVisible();
 await expect(page.getByRole('heading',{name:'Career Intelligence Vault'})).toHaveCount(0);
});

test('public forms fit mobile screens without horizontal scrolling',async({page})=>{
 for(const path of ['/', '/login','/signup','/forgot-password']){
  await page.goto(path);
  await expect.poll(async()=>page.evaluate(()=>
   document.documentElement.scrollWidth<=window.innerWidth+1
  )).toBe(true);
 }
});


test('anonymous account export never returns another user\'s data',async({request})=>{
 const response=await request.get('/api/account/export');
 expect(response.status()).toBe(401);
 expect(response.headers()['cache-control']).toContain('no-store');
});
