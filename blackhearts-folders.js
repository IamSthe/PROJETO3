(() => {
 const win=document.querySelector('.blackhearts-folders'),content=win.querySelector('.blackhearts-folders-content');
 const defaults=[{id:'cases',name:'Casos'},{id:'family',name:'Família'},{id:'soon',name:'em breve'}],storageKey='bh-blackhearts-folders-v1';let folders=defaults;
 try{const stored=JSON.parse(localStorage.getItem(storageKey)||'null');if(Array.isArray(stored))folders=[...defaults,...stored.filter(f=>f&&typeof f.id==='string'&&typeof f.name==='string'&&!defaults.some(d=>d.id===f.id))];}catch{}
 let current=null,query='';
 const familyAudio=document.createElement('audio');familyAudio.src='assents/assentsfamilia.mp3.mp3?v=familia-audio-2';familyAudio.preload='metadata';familyAudio.hidden=true;familyAudio.dataset.volumeScale='.65';familyAudio.volume=siteVolume/100*.65;familyAudio.setAttribute('aria-label','Música ambiente da família');document.body.append(familyAudio);
 const audioControl=document.createElement('button');audioControl.type='button';audioControl.className='family-audio-control';audioControl.textContent='▶ Ativar música';audioControl.setAttribute('aria-label','Ativar música da família');
 let familyAudioSession=false,familyAudioPlaying=false,familyAudioUserPaused=false;
 function updateAudioControl(){const playing=!familyAudio.paused&&!familyAudio.ended;audioControl.textContent=playing?'Ⅱ Pausar música':'▶ Ativar música';audioControl.setAttribute('aria-label',playing?'Pausar música da família':'Ativar música da família');audioControl.setAttribute('aria-pressed',String(playing));}
 familyAudio.addEventListener('play',updateAudioControl);familyAudio.addEventListener('pause',updateAudioControl);familyAudio.addEventListener('ended',()=>{familyAudioPlaying=false;updateAudioControl();});
 audioControl.onclick=()=>{if(!familyAudio.paused){familyAudioUserPaused=true;familyAudio.pause();familyAudioPlaying=false;return;}familyAudioUserPaused=false;if(familyAudio.ended)familyAudio.currentTime=0;if(familyAudio.error)familyAudio.load();syncFamilyAudio();if(!siteVolume)showToast('O volume do site está silenciado. Ative o som no controle de volume.');};
 function syncFamilyAudio(){
  const inFamily=current?.id==='family'&&!win.classList.contains('hidden');
  if(!inFamily){familyAudio.pause();familyAudio.currentTime=0;familyAudioSession=false;familyAudioPlaying=false;familyAudioUserPaused=false;updateAudioControl();return;}
  if(win.classList.contains('minimized')||document.hidden){familyAudio.pause();familyAudioPlaying=false;return;}
  if(!familyAudioSession){familyAudioSession=true;familyAudio.currentTime=0;}
  if(familyAudioPlaying||familyAudio.ended||familyAudioUserPaused)return;
  familyAudioPlaying=true;familyAudio.volume=siteVolume/100*.65;
  familyAudio.play().then(()=>{if(current?.id!=='family'||win.classList.contains('hidden')||win.classList.contains('minimized')){familyAudio.pause();familyAudioPlaying=false;}updateAudioControl();}).catch(error=>{familyAudioPlaying=false;updateAudioControl();if(current?.id!=='family')return;if(error.name==='NotAllowedError')showToast('Clique em “Ativar música” para liberar o áudio.');else if(error.name!=='AbortError')showToast('Não foi possível carregar a música. Confira se o arquivo de áudio foi publicado na pasta assents.');});
 }
 new MutationObserver(syncFamilyAudio).observe(win,{attributes:true,attributeFilter:['class']});document.addEventListener('visibilitychange',syncFamilyAudio);
 const title=document.createElement('div');title.className='cases-heading';const heading=document.createElement('h2');heading.textContent='BlackHearts';title.append(heading);
 const create=document.createElement('button');create.type='button';create.textContent='＋ Nova pasta';title.append(create);
 const back=document.createElement('button');back.className='case-back';back.textContent='← Todas as pastas';back.hidden=true;
 const search=document.createElement('input');search.className='cases-search';search.placeholder='Pesquisar pastas…';search.setAttribute('aria-label','Pesquisar pastas');
 const grid=document.createElement('div');grid.className='blackhearts-folder-grid';const empty=document.createElement('p');empty.className='cases-empty';
 const history=document.createElement('section');history.className='family-history';history.hidden=true;history.setAttribute('aria-label','Arquivo histórico da família');
 history.innerHTML='<header class="family-history-header"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1Zm0 0v15"/></svg><h2>ARQUIVO HISTÓRICO</h2><p>CADA REGISTRO CARREGA UMA HISTÓRIA.<br>CADA HISTÓRIA CONSTRÓI NOSSO LEGADO.</p></header><div class="family-history-toolbar"><label><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/></svg><input type="search" placeholder="Buscar registros, datas ou palavras-chave…" aria-label="Pesquisar arquivo histórico"></label><select aria-label="Ordenar arquivo histórico"><option value="newest">Mais recentes</option><option value="oldest">Mais antigos</option></select></div><div class="family-history-blank" aria-label="Área de registros, ainda vazia"></div>';
 content.append(back,title,search,grid,empty,history);
 const historyHeader=history.querySelector('.family-history-header'),historyCopy=document.createElement('div');historyCopy.className='family-history-copy';
 historyHeader.append(audioControl);
 historyCopy.append(historyHeader.querySelector('h2'),historyHeader.querySelector('p'),historyHeader.querySelector('svg'));historyHeader.append(historyCopy);
 // Subtle 6% zoom-out of the photograph only; an underlying cover image fills the edges.
 const banner=history.querySelector('.family-history-header'),bannerPhoto=new Image();
 function fitBannerPhoto(){if(!bannerPhoto.naturalWidth||!banner.clientWidth)return;const scale=Math.max(banner.clientWidth/bannerPhoto.naturalWidth,banner.clientHeight/bannerPhoto.naturalHeight)*.94;banner.style.setProperty('--family-photo-size',`${bannerPhoto.naturalWidth*scale}px ${bannerPhoto.naturalHeight*scale}px`);}
 bannerPhoto.onload=fitBannerPhoto;bannerPhoto.src='assents/FAMILIA.png?v=familia-20261022-r2';new ResizeObserver(fitBannerPhoto).observe(banner);
 function draw(){
  // Cases is a permanent entry, even when a previously saved folder list lacks it.
  folders=[{id:'cases',name:'Casos'},...folders.filter(folder=>folder.id!=='cases')];
  const subtitle=content.querySelector('.folder-brand-header small');
  if(subtitle)subtitle.textContent=current?.id==='family'?'MEMÓRIAS & LEGADO DA FAMÍLIA':'DEPARTAMENTO DE INVESTIGAÇÃO';
  const isFamily=current?.id==='family';history.hidden=!isFamily;title.hidden=isFamily;grid.hidden=isFamily;empty.hidden=isFamily;win.classList.toggle('family-history-open',isFamily);
  syncFamilyAudio();
  heading.textContent=current?.name||'BlackHearts';back.hidden=!current;search.hidden=!!current;create.hidden=!!current;grid.replaceChildren();empty.textContent='';
  if(isFamily)return;
  if(current){empty.textContent=current.id==='soon'?'Em breve.':'Esta pasta ainda está vazia.';return;}
  const normalized=query.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
  for(const folder of folders.filter(f=>f.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').includes(normalized))){const button=document.createElement('button');button.type='button';button.className='case-folder';button.dataset.blackheartsFolder=folder.id;button.innerHTML=desktopSymbol('folder');const label=document.createElement('strong');label.textContent=folder.name;button.append(label);button.onclick=()=>{if(folder.id==='cases'){document.querySelector('.desktop-icon[data-open="case"]')?.click();return;}current=folder;draw();};grid.append(button);}
  if(!grid.childElementCount)empty.textContent='Nenhuma pasta encontrada.';
 }
 search.oninput=()=>{query=search.value;draw();};back.onclick=()=>{current=null;draw();};
 const editor=document.createElement('dialog');editor.className='rename-icon-dialog';editor.innerHTML='<form><h2>Nova pasta</h2><label>Nome<input name="name" required maxlength="80" autocomplete="off"></label><p role="alert"></p><div><button type="button" data-cancel>Cancelar</button><button type="submit">Criar pasta</button></div></form>';document.body.append(editor);
 create.onclick=()=>{editor.querySelector('form').reset();editor.querySelector('[role="alert"]').textContent='';editor.showModal();};editor.querySelector('[data-cancel]').onclick=()=>editor.close();
 editor.querySelector('form').onsubmit=event=>{event.preventDefault();const name=editor.querySelector('input').value.trim();if(!name)return;const next=[...folders,{id:crypto.randomUUID(),name}];try{localStorage.setItem(storageKey,JSON.stringify(next));folders=next;query='';search.value='';draw();editor.close();}catch{editor.querySelector('[role="alert"]').textContent='Não foi possível salvar a pasta neste navegador.';}};
 window.openBlackheartsFolder=()=>{current=null;query='';search.value='';draw();win.classList.remove('hidden','minimized');if(!win.classList.contains('maximized'))win.querySelector('.maximize')?.click();bringForward(win);};
 document.addEventListener('blackhearts-lock',()=>{win.classList.add('hidden');if(editor.open)editor.close();});draw();
})();
