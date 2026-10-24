(() => {
 const KEYS=['bh-cases-v1','bh-blackhearts-folders-v1','bh-family-archive-texts-v1','bh-case-quick-notes','bh-icon-names','bh-desktop-evidence-notes-v1'];
 const allowed=key=>KEYS.includes(key)||/^bh-profile-photo:.{1,80}$/.test(key);
 const openDB=()=>new Promise((resolve,reject)=>{const request=indexedDB.open('bh-family-archive',1);request.onupgradeneeded=()=>request.result.createObjectStore('photos');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
 const readBlob=blob=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob);});
 async function readPhotos(){const db=await openDB();try{return await new Promise((resolve,reject)=>{const tx=db.transaction('photos'),request=tx.objectStore('photos').openCursor(),entries=[];request.onsuccess=()=>{const cursor=request.result;if(cursor){entries.push([cursor.key,cursor.value]);cursor.continue();}};tx.oncomplete=()=>resolve(entries);tx.onerror=()=>reject(tx.error);});}finally{db.close();}}
 async function collect(){
  const storage=Object.create(null);
  for(const key of Object.keys(localStorage))if(allowed(key))storage[key]=localStorage.getItem(key);
  if(window.BHBackend?.enabled&&BHBackend.user){await BHBackend.flush?.();const state=await BHBackend.request('/api/cases');storage['bh-cases-v1']=JSON.stringify(state.cases);}
  const photos=[];let size=JSON.stringify(storage).length;for(const [key,blob] of await readPhotos())if(blob instanceof Blob){size+=Math.ceil(blob.size*4/3);if(size>170*1024*1024)throw Error('Backup maior que 170 MB. Entre em contato para migrar em partes.');photos.push({key,data:await readBlob(blob)});}
  return {format:'blackhearts-private-backup',version:1,createdAt:new Date().toISOString(),storage,photos};
 }
 function validate(bundle){
  if(!bundle||bundle.format!=='blackhearts-private-backup'||bundle.version!==1||!bundle.storage||typeof bundle.storage!=='object'||Array.isArray(bundle.storage)||!Array.isArray(bundle.photos)||bundle.photos.length>1000)throw Error('Este arquivo não é um backup Blackhearts válido.');
  const storage=Object.create(null);
  for(const [key,value] of Object.entries(bundle.storage)){
   if(!allowed(key)||typeof value!=='string'||value.length>25000000)throw Error('Chave ou conteúdo não permitido no backup.');
   if(key==='bh-desktop-evidence-notes-v1'){if(value.length>20000)throw Error('Anotações grandes demais.');}
   else if(key.startsWith('bh-profile-photo:')){if(!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=\r\n]+$/.test(value))throw Error('Foto de perfil inválida.');}
   else {
    let parsed;try{parsed=JSON.parse(value);}catch{throw Error('Dados JSON inválidos no backup.');}
    if(['bh-cases-v1','bh-blackhearts-folders-v1','bh-case-quick-notes'].includes(key)){
     if(!Array.isArray(parsed)||parsed.length>5000)throw Error('Lista inválida no backup.');
     if(key==='bh-cases-v1'){const ids=new Set();for(const item of parsed){if(!item||typeof item.id!=='string'||typeof item.name!=='string'||!Array.isArray(item.folders)||ids.has(item.id))throw Error('Caso inválido ou duplicado.');ids.add(item.id);if(item.elements&&!Array.isArray(item.elements))throw Error('Elementos inválidos.');if(item.links&&!Array.isArray(item.links))throw Error('Vínculos inválidos.');}}
     if(key==='bh-blackhearts-folders-v1'&&parsed.some(item=>!item||typeof item.id!=='string'||typeof item.name!=='string'))throw Error('Pasta inválida.');
    }else if(!parsed||typeof parsed!=='object'||Array.isArray(parsed)||Object.values(parsed).some(value=>typeof value!=='string'))throw Error('Textos ou nomes inválidos.');
   }
   storage[key]=value;
  }
  const seen=new Set(),photos=bundle.photos.map(photo=>{
   if(!photo||typeof photo.key!=='string'||photo.key.length>120||seen.has(photo.key)||!/^data:image\/(png|jpeg|webp);base64,/.test(photo.data||'')||photo.data.length>25000000)throw Error('Fotografia inválida no backup.');seen.add(photo.key);
   const match=/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=\r\n]+)$/.exec(photo.data);if(!match)throw Error('Formato de fotografia inválido.');
   let bytes;try{bytes=Uint8Array.from(atob(match[2]),character=>character.charCodeAt(0));}catch{throw Error('Fotografia corrompida.');}
   const png=bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71,jpeg=bytes[0]===255&&bytes[1]===216,webp=String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP';
   if(!(match[1]==='image/png'&&png||match[1]==='image/jpeg'&&jpeg||match[1]==='image/webp'&&webp))throw Error('Conteúdo de fotografia inválido.');
   return {key:photo.key,blob:new Blob([bytes],{type:match[1]})};
  });
  return {storage,photos};
 }
 async function restore(bundle){
  if(window.BHBackend?.enabled&&BHBackend.user)throw Error('Importação de migração disponível no modo local/Pages. O banco conectado exige uma migração própria.');
  const prepared=validate(bundle),before=new Map(Object.keys(prepared.storage).map(key=>[key,localStorage.getItem(key)]));
  const db=await openDB();
  try{
   for(const [key,value] of Object.entries(prepared.storage))localStorage.setItem(key,value);
   await new Promise((resolve,reject)=>{const tx=db.transaction('photos','readwrite');for(const photo of prepared.photos)tx.objectStore('photos').put(photo.blob,photo.key);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});
  }catch(error){for(const key of before.keys())localStorage.removeItem(key);for(const [key,value] of before)if(value!==null)localStorage.setItem(key,value);throw Error('Importação cancelada sem substituir os dados anteriores: '+error.message);}finally{db.close();}
  return {keys:Object.keys(prepared.storage).length,photos:prepared.photos.length};
 }
 const download=(bundle,prefix='blackhearts-backup')=>{const url=URL.createObjectURL(new Blob([JSON.stringify(bundle)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=prefix+'-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);};
 const summarize=bundle=>{let cases=0,folders=0;try{cases=JSON.parse(bundle.storage['bh-cases-v1']||'[]').length;folders=JSON.parse(bundle.storage['bh-blackhearts-folders-v1']||'[]').length;}catch{}return `${cases} casos · ${folders} pastas salvas · ${bundle.photos.length} fotos da Família`;};
 window.BHBackup={collect,validate,restore};
 const dialog=document.createElement('dialog');dialog.className='rename-icon-dialog data-backup-dialog';dialog.innerHTML='<h2>Backup e migração</h2><p>1. No endereço local que contém seus dados, clique em Exportar.<br>2. Abra o Pages e importe o arquivo nesta mesma tela.</p><p class="backup-warning">O arquivo contém dados privados. Guarde-o com segurança. Não envie para o GitHub público. Logins e tokens de sessão não são exportados.</p><button type="button" data-export>Exportar todos os dados</button><label>Arquivo de backup<input type="file" accept=".json,application/json" data-file></label><p role="status" aria-live="polite"></p><button type="button" data-import disabled>Importar dados do arquivo</button><button type="button" data-reload hidden>Recarregar para aplicar</button><button type="button" data-close>Fechar</button>';document.body.append(dialog);
 const status=dialog.querySelector('[role="status"]'),importButton=dialog.querySelector('[data-import]'),fileInput=dialog.querySelector('[data-file]'),exportButton=dialog.querySelector('[data-export]');let imported=null,busy=false,applied=false;
 const setBusy=value=>{busy=value;exportButton.disabled=value;fileInput.disabled=value;importButton.disabled=value||!imported||applied;dialog.querySelector('[data-close]').disabled=value||applied;};
 function open(){if(dialog.open)return;dialog.showModal();}
 dialog.querySelector('[data-close]').onclick=()=>dialog.close();dialog.addEventListener('cancel',event=>{if(busy||applied)event.preventDefault();});dialog.querySelector('[data-reload]').onclick=()=>location.reload();
 exportButton.onclick=async()=>{setBusy(true);status.textContent='Reunindo casos, textos e fotos…';try{const backup=await collect();download(backup);status.textContent='Backup exportado: '+summarize(backup)+'.';}catch(error){status.textContent='Não foi possível exportar: '+error.message;}finally{setBusy(false);}};
 fileInput.onchange=async()=>{imported=null;importButton.disabled=true;const file=fileInput.files?.[0];if(!file)return;if(file.size>180*1024*1024){status.textContent='Backup grande demais (máximo 180 MB).';return;}setBusy(true);try{const candidate=JSON.parse(await file.text());validate(candidate);imported=candidate;status.textContent='Pronto para importar: '+summarize(candidate)+'. Dados com os mesmos identificadores serão substituídos.';}catch(error){status.textContent='Arquivo recusado: '+error.message;}finally{setBusy(false);}};
 importButton.onclick=async()=>{if(!imported||busy)return;if(!confirm('Importar este backup? Casos, textos e pastas incluídos substituirão os mesmos dados deste endereço. Um backup de segurança do destino será baixado antes.'))return;setBusy(true);status.textContent='Criando backup de segurança e importando…';try{const previous=await collect();download(previous,'blackhearts-antes-da-importacao');await restore(imported);applied=true;dialog.querySelector('[data-reload]').hidden=false;status.textContent='Importação concluída. Clique em Recarregar para aplicar. O endereço local original não foi alterado.';}catch(error){status.textContent=error.message;}finally{setBusy(false);}};
 const entry=document.createElement('button');entry.type='button';entry.className='start-category';entry.innerHTML='<span class="start-category-icon">⇅</span><span>Backup e migração</span><b>›</b>';entry.onclick=()=>{closeStartMenu();open();};document.querySelector('#start-menu>nav').append(entry);
 const root=document.querySelector('.blackhearts-folders-content>.cases-heading');if(root){const button=document.createElement('button');button.type='button';button.className='blackhearts-backup-button';button.textContent='⇅ Backup / importar';button.onclick=open;root.append(button);}
})();
