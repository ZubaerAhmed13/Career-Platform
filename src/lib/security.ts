export function safeNextPath(input:string|null|undefined){if(!input||!input.startsWith('/')||input.startsWith('//')||input.includes('\\')||/[\r\n]/.test(input))return '/dashboard';return input;}
export function safePublicOrigin(value:string){const url=new URL(value);if(url.protocol!=='http:'&&url.protocol!=='https:')throw new Error('Invalid site origin');return url.origin;}
