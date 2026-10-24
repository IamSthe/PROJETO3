(() => {
 const history=document.querySelector('.family-history');if(!history)return;
 const storageKey='bh-family-archive-texts-v1';let saved={};
 try{const value=JSON.parse(localStorage.getItem(storageKey)||'{}');if(value&&typeof value==='object'&&!Array.isArray(value))saved=value;}catch{}
 const getText=node=>[...node.childNodes].map(child=>child.nodeType===Node.TEXT_NODE?child.textContent:child.nodeName==='BR'?'\n':getText(child)).join('');
 function setText(node,text){const fragment=document.createDocumentFragment();String(text).split('\n').forEach((line,index)=>{if(index)fragment.append(document.createElement('br'));fragment.append(document.createTextNode(line));});node.replaceChildren(fragment);}
 const counters=new Map(),originalTexts=new Map();
 history.querySelectorAll('h2,h3,p,blockquote,figcaption,.archive-story>small,.archive-signature strong,.archive-signature span,.archive-recognition-top span').forEach(node=>{
  const block=node.closest('.family-archive-block');
  const group=block?'2026-block-'+block.querySelector('.archive-block-heading>span').textContent.trim():node.closest('.archive-recognition')?'2026-recognition':node.closest('.family-history-header')?'banner':node.closest('#family-archive-2027')?'2027':'other';
  const prefix=group+'-'+node.tagName.toLowerCase(),index=counters.get(prefix)||0;counters.set(prefix,index+1);const key=prefix+'-'+index;
  node.dataset.archiveText=key;node.title='Botão direito: editar texto';
  originalTexts.set(key,getText(node));
  if(Object.hasOwn(saved,key)&&typeof saved[key]==='string'&&saved[key].length<=10000)setText(node,saved[key]);
 });
 const menu=document.createElement('div');menu.className='archive-text-menu';menu.hidden=true;menu.setAttribute('role','menu');menu.innerHTML='<button type="button" role="menuitem">Editar texto</button>';document.body.append(menu);
 const editor=document.createElement('dialog');editor.className='rename-icon-dialog archive-text-editor';editor.innerHTML='<form><h2>Editar texto</h2><label>Texto<textarea name="text" maxlength="10000" rows="5"></textarea></label><p role="alert"></p><div><button type="button" data-cancel>Cancelar</button><button type="submit">Salvar</button></div></form>';document.body.append(editor);let target=null;
 function closeMenu(){menu.hidden=true;}
 const restore=document.createElement('button');restore.type='button';restore.textContent='Restaurar texto original';restore.className='archive-restore-text';editor.querySelector('form>div').before(restore);restore.onclick=()=>{if(!target)return;editor.querySelector('textarea').value=originalTexts.get(target.dataset.archiveText)||'';editor.querySelector('textarea').focus();};
 history.addEventListener('contextmenu',event=>{const node=event.target.closest('[data-archive-text]')||event.target.closest('.archive-block-heading')?.querySelector('h3[data-archive-text]');if(!node||!history.contains(node))return;event.preventDefault();event.stopPropagation();target=node;menu.hidden=false;menu.style.left=Math.max(6,Math.min(event.clientX,window.innerWidth-menu.offsetWidth-8))+'px';menu.style.top=Math.max(6,Math.min(event.clientY,window.innerHeight-menu.offsetHeight-8))+'px';menu.querySelector('button').focus();});
 menu.querySelector('button').onclick=()=>{closeMenu();if(!target)return;editor.querySelector('textarea').value=getText(target);editor.querySelector('[role="alert"]').textContent='';editor.showModal();editor.querySelector('textarea').focus();};
 editor.querySelector('[data-cancel]').onclick=()=>editor.close();
 editor.querySelector('form').onsubmit=event=>{event.preventDefault();if(!target)return;const value=editor.querySelector('textarea').value,next={...saved,[target.dataset.archiveText]:value};try{localStorage.setItem(storageKey,JSON.stringify(next));saved=next;setText(target,value);editor.close();showToast('Texto salvo neste navegador.');}catch{editor.querySelector('[role="alert"]').textContent='Não foi possível salvar. Verifique o armazenamento do navegador.';}};
 document.addEventListener('pointerdown',event=>{if(!menu.contains(event.target))closeMenu();});document.addEventListener('keydown',event=>{if(event.key==='Escape')closeMenu();});window.addEventListener('resize',closeMenu);document.addEventListener('scroll',closeMenu,true);
 document.addEventListener('blackhearts-lock',()=>{closeMenu();if(editor.open)editor.close();});
})();
