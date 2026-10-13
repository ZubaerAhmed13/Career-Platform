/** Pure validation: make deliberate deletion impossible with incomplete fields. */
export const DELETE_ACCOUNT_CONFIRMATION='DELETE MY ACCOUNT';

export function validateAccountDeletionInput(phrase:unknown,password:unknown,confirmed:unknown){
 if(phrase!==DELETE_ACCOUNT_CONFIRMATION||confirmed!=='yes')return false;
 return typeof password==='string'&&password.length>=1&&password.length<=4096;
}
