'use client';
import {useEffect,useRef} from 'react';

/**
 * Do not silently discard locally edited CV/job-brief text.
 *
 * beforeunload covers reload, address-bar navigation and closing a tab. Next.js
 * client-side Link transitions do not unload the document, so capture internal
 * anchor clicks before the router handles them. No draft text is persisted in
 * browser storage or sent to an external service.
 */
export function useUnsavedNavigationGuard(unsafe:()=>boolean){
 const latest=useRef(unsafe);
 latest.current=unsafe;
 useEffect(()=>{
  const leaving=(event:BeforeUnloadEvent)=>{
   if(!latest.current())return;
   event.preventDefault();
   event.returnValue='';
  };
  const followLink=(event:MouseEvent)=>{
   // Modified clicks, downloads and new tabs leave the current editor intact.
   if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||
      event.altKey||event.shiftKey)return;
   if(!(event.target instanceof Element))return;
   const link=event.target.closest('a[href]');
   if(!(link instanceof HTMLAnchorElement)||link.hasAttribute('download')||
      (link.target!==''&&link.target!=='_self'))return;
   let destination:URL;
   try{destination=new URL(link.href,window.location.href);}catch{return;}
   // External full-page navigation is handled by beforeunload. A same-page
   // fragment does not dispose of the editor and should not be interrupted.
   if(destination.origin!==window.location.origin||
      (destination.pathname===window.location.pathname&&
       destination.search===window.location.search))return;
   if(!latest.current())return;
   if(!window.confirm('Your latest edits are not fully saved. Leave this page and discard those changes?')){
    event.preventDefault();
    event.stopImmediatePropagation();
   }
  };
  window.addEventListener('beforeunload',leaving);
  document.addEventListener('click',followLink,true);
  return ()=>{
   window.removeEventListener('beforeunload',leaving);
   document.removeEventListener('click',followLink,true);
  };
 },[]);
}
