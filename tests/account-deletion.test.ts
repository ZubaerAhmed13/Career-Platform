import {describe,it,expect} from 'vitest';
import {DELETE_ACCOUNT_CONFIRMATION,validateAccountDeletionInput} from '../src/lib/account-deletion';

describe('irreversible account deletion requires explicit action',()=>{
 it('rejects missing or incorrect typed confirmation',()=>{
  expect(validateAccountDeletionInput('', 'password', 'yes')).toBe(false);
  expect(validateAccountDeletionInput('DELETE MY CAREER VAULT', 'password', 'yes')).toBe(false);
  expect(validateAccountDeletionInput(DELETE_ACCOUNT_CONFIRMATION, 'password', 'yes')).toBe(true);
 });
 it('requires a password and a separate consent checkbox',()=>{
  expect(validateAccountDeletionInput(DELETE_ACCOUNT_CONFIRMATION,'','yes')).toBe(false);
  expect(validateAccountDeletionInput(DELETE_ACCOUNT_CONFIRMATION,'password','no')).toBe(false);
  expect(validateAccountDeletionInput(DELETE_ACCOUNT_CONFIRMATION,{},'yes')).toBe(false);
  expect(validateAccountDeletionInput(DELETE_ACCOUNT_CONFIRMATION,'x'.repeat(4097),'yes')).toBe(false);
 });
});
