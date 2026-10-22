import {test,expect} from '@playwright/test';

test('synthetic Step 4 workspace explains evidence and shows usable source comparison',async({page})=>{
 await page.goto('/tailoring-fixture');
 await expect(page.getByRole('heading',{name:'Synthetic Analyst'})).toBeVisible();
 await expect(page.getByText(/Essential criteria: 1 of 2 directly evidenced/)).toBeVisible();
 await expect(page.getByText(/Preferred criteria: 1 of 1 directly evidenced/)).toBeVisible();
 await expect(page.getByText('No confirmed evidence',{exact:true}).first()).toBeVisible();
 await expect(page.getByRole('heading',{name:'Transparent keyword inspection'})).toBeVisible();
 await page.getByText('Show full before-and-after document text').click();
 await expect(page.getByText('A purely fictional candidate summary for comparison testing.')).toBeVisible();
 await expect(page.getByText('Synthetic Applicant').first()).toBeVisible();
});

test('editing an approved criterion requires another human approval, without real network writes',async({page})=>{
 const posted:string[]=[];
 page.on('request',request=>{
  if(request.method()==='POST')posted.push(request.url());
 });
 await page.goto('/tailoring-fixture');
 const criteria=page.locator('textarea[aria-label="Requirement wording"]');
 await expect(criteria).toHaveCount(4);
 await page.getByRole('button',{name:'Evidence gaps'}).click();
 await expect(criteria).toHaveCount(1);
 await expect(criteria.first()).toHaveValue('Advanced SAP FI/CO experience required');
 await page.getByRole('button',{name:'All',exact:true}).click();
 const first=page.locator('.tailoring-requirement').first();
 await first.locator('textarea[aria-label="Requirement wording"]').fill('Advanced SAP FI/CO experience required');
 await expect(first.getByText('Needs approval')).toBeVisible();
 await expect(page.getByText(/Essential criteria: 0 of 1 directly evidenced/)).toBeVisible();
 await page.getByRole('button',{name:'Save now'}).click();
 await expect(page.getByText('Saved (synthetic fixture)')).toBeVisible();
 expect(posted).toEqual([]);
});

test('modifying a saved job advert invalidates approvals derived from the previous advert',async({page})=>{
 await page.goto('/tailoring-fixture');
 await expect(page.getByText(/Essential criteria: 1 of 2 directly evidenced/)).toBeVisible();
 const description=page.getByRole('textbox',{name:'Original description'});
 const before=await description.inputValue();
 await description.fill(before+'\nAdditional essential criteria must now be reviewed.');
 await expect(page.getByText(/Job text changed: previously approved criteria now need review/)).toBeVisible();
 await expect(page.getByText(/Essential criteria: 0 of 0 directly evidenced/)).toBeVisible();
 await expect(page.locator('.tailoring-requirement').getByText('Approved')).toHaveCount(0);
 await page.getByRole('button',{name:'Save now'}).click();
 await expect(page.getByText('Saved (synthetic fixture)')).toBeVisible();
});

test('Step 4 remains navigable at 320px with no page-level horizontal overflow',async({page})=>{
 await page.setViewportSize({width:320,height:720});
 await page.goto('/tailoring-fixture');
 await expect(page.getByRole('heading',{name:'Synthetic Analyst'})).toBeVisible();
 await page.getByRole('button',{name:'Evidence gaps'}).click();
 await expect(page.locator('textarea[aria-label="Requirement wording"]')).toHaveCount(1);
 const overflow=await page.evaluate(()=>
  document.documentElement.scrollWidth>document.documentElement.clientWidth+2);
 expect(overflow).toBe(false);
 await page.getByRole('button',{name:'All',exact:true}).focus();
 await expect(page.getByRole('button',{name:'All',exact:true})).toBeFocused();
});
