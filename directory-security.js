(() => {
 let busy=false,activeController=null,terminal=null;
 const directory=document.querySelector('[data-window="database"]');
 const wait=(ms,signal)=>new Promise((resolve,reject)=>{const cancel=()=>{clearTimeout(timer);reject(new DOMException('Cancelado','AbortError'));};const timer=setTimeout(()=>{signal.removeEventListener('abort',cancel);resolve();},ms);signal.addEventListener('abort',cancel,{once:true});if(signal.aborted)cancel();});
 function clearDirectory(){directory.classList.add('hidden');directory.querySelector('.blackhearts-directory-content').replaceChildren();}
 async function openDirectory(){
  if(busy)return;busy=true;clearDirectory();const controller=new AbortController();activeController=controller;const {signal}=controller;
  BHTerminal.activateAudio();
  terminal=document.createElement('section');terminal.className='boot-terminal directory-security-terminal';terminal.setAttribute('role','dialog');terminal.setAttribute('aria-modal','true');terminal.setAttribute('aria-label','Verificação de segurança BlackHearts');terminal.tabIndex=-1;
  terminal.innerHTML='<header><span>▣ &nbsp; BLACKHEARTS — Secure Terminal</span><div><button type="button" data-min-security aria-label="Minimizar terminal">−</button><button type="button" data-close-security aria-label="Cancelar verificação">×</button></div></header><div class="terminal-output" aria-live="polite"></div><div class="terminal-progress" role="progressbar" aria-label="Verificação de acesso" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i></i></div><p class="terminal-status" role="status">Verificando acesso no servidor…</p>';
  desktop.append(terminal);terminal.style.zIndex=++topZ+100;terminal.focus();terminal.querySelector('[data-close-security]').onclick=()=>controller.abort();terminal.querySelector('[data-min-security]').onclick=()=>{const minimized=terminal.classList.toggle('directory-terminal-minimized');terminal.querySelector('[data-min-security]').setAttribute('aria-label',minimized?'Restaurar terminal':'Minimizar terminal');};terminal.addEventListener('keydown',event=>{if(event.key==='Escape')controller.abort();});
  const soundToolbar=document.createElement('div');soundToolbar.className='terminal-toolbar';soundToolbar.innerHTML='<label><input type="checkbox"> Som de digitação</label>';terminal.querySelector('header').after(soundToolbar);const soundToggle=soundToolbar.querySelector('input');soundToggle.checked=BHTerminal.soundEnabled;soundToggle.onchange=()=>{BHTerminal.soundEnabled=soundToggle.checked;if(soundToggle.checked)BHTerminal.activateAudio();};
  const output=terminal.querySelector('.terminal-output'),status=terminal.querySelector('.terminal-status');
  const progress=terminal.querySelector('.terminal-progress');const setProgress=value=>{progress.style.setProperty('--progress',value+'%');progress.setAttribute('aria-valuenow',String(value));};
  let timedOut=false;const timeout=new AbortController(),timer=setTimeout(()=>{timedOut=true;timeout.abort();},30000);signal.addEventListener('abort',()=>timeout.abort(),{once:true});
  // Resolve errors into data immediately, even if the animation has not finished yet.
  const verification=(async()=>{try{
    if(!BHBackend.enabled)return {allowed:false,reason:'Backend não conectado. Não é possível validar o acesso.'};
    const permission=await BHBackend.request('/api/directories/blackhearts/authorize',{method:'POST',signal:timeout.signal});
    if(permission.allowed!==true)return {allowed:false,authenticated:true,reason:'Permissão insuficiente para acessar este diretório.'};
    const content=await BHBackend.request('/api/directories/blackhearts/content',{signal:timeout.signal});
    return {allowed:true,authenticated:true,content,user:permission.user};
   }catch(error){return {allowed:false,reason:timedOut?'Tempo de verificação excedido. Tente novamente.':error.name==='AbortError'?'Verificação cancelada.':'Não foi possível validar o acesso: '+error.message};}finally{clearTimeout(timer);}})();
  try{
   await BHTerminal.play(output,[['BLACKHEARTS OS [SECURITY MODULE]','heading'],['> Inicializando protocolo de segurança...'],['[OK] Módulo de segurança inicializado.','ok'],['> Identificando usuário autenticado...'],['> Verificando permissões de acesso...'],['> Consultando credenciais do perfil...'],['[WARNING] Diretório restrito. Validação obrigatória pelo servidor.','warning']],signal,{animateText:true,characterDelay:18,duration:BHTerminal.timing.loading*.65,onProgress:value=>setProgress(Math.round(value*65))});
   setProgress(65);
   status.textContent='Processando verificação de permissões no backend…';
   const result=await verification;if(signal.aborted)return;
   status.textContent=result.allowed?'Verificação concluída.':'Acesso não liberado.';
   await BHTerminal.play(output,[[result.authenticated?'[OK] AUTENTICAÇÃO CONCLUÍDA':'[WARNING] VERIFICAÇÃO NÃO CONCLUÍDA',result.authenticated?'ok':'warning'],[result.allowed?'> ACESSO PERMITIDO':'> ACESSO NEGADO',result.allowed?'ok directory-access-allowed':'directory-access-denied'],[result.allowed?'> Abrindo diretório BLACKHEARTS...':'> '+result.reason]],signal,{animateText:true,characterDelay:18,duration:BHTerminal.timing.loading*.35,onProgress:value=>setProgress(65+Math.round(value*35))});
   setProgress(100);const confirmation=document.createElement('div');confirmation.className='terminal-confirmation';const strong=document.createElement('strong');strong.textContent=result.allowed?'ACESSO AUTORIZADO — BLACKHEARTS':'ACESSO NEGADO — BLACKHEARTS';if(!result.allowed)strong.style.color='#ff7777';const prompt=document.createElement('span');prompt.textContent=(result.user?.username||BHBackend.user?.username||activeProfile||'investigador')+'@blackhearts:~$ ';const cursor=document.createElement('b');cursor.className='terminal-cursor';cursor.textContent='▌';prompt.append(cursor);confirmation.append(strong,prompt);output.append(confirmation);output.scrollTop=output.scrollHeight;
   status.textContent=result.allowed?'Acesso permitido. Abrindo a pasta em instantes…':'Acesso negado. Você pode ler a mensagem ou fechar pelo ×.';
   await wait(result.allowed?2500:8000,signal);terminal.classList.add('directory-terminal-closing');await wait(220,signal);
   if(result.allowed&&!signal.aborted){
    const content=directory.querySelector('.blackhearts-directory-content');
    const heading=document.createElement('h2');heading.textContent='Banco de dados';content.append(heading);
    for(const entry of result.content.entries||[]){const button=document.createElement('button');button.className='case-folder';button.innerHTML=desktopSymbol('folder');const label=document.createElement('strong');label.textContent=entry.name;button.append(label);button.onclick=()=>{if(entry.id==='cases')document.querySelector('.desktop-icon[data-open="case"]')?.click();};content.append(button);}
    directory.classList.remove('hidden','minimized');bringForward(directory);
   }
  }catch(error){if(error.name!=='AbortError')showToast('Não foi possível concluir a verificação de segurança.');}
  finally{controller.abort();terminal?.remove();terminal=null;activeController=null;busy=false;}
 }
 document.querySelectorAll('.desktop-icon[data-open="database"]').forEach(icon=>{
  icon.addEventListener('dblclick',event=>{event.preventDefault();openDirectory();});
  icon.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();openDirectory();}});
 });
 document.addEventListener('blackhearts-lock',()=>{activeController?.abort();clearDirectory();});
})();
