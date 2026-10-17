(() => {
  document.querySelectorAll('.window').forEach(windowEl => {
    const controls = windowEl.querySelector('.window-controls');
    const maximize = document.createElement('button');
    maximize.type = 'button';
    maximize.className = 'maximize';
    maximize.title = 'Maximizar';
    maximize.setAttribute('aria-label', 'Maximizar janela');
    maximize.setAttribute('aria-pressed', 'false');
    const updateButton = () => {
      const expanded = windowEl.classList.contains('maximized');
      maximize.innerHTML = expanded ? '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3h8v8M3 5h8v8H3Z"/></svg>' : '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="3" width="10" height="10"/></svg>';
      maximize.title = expanded ? 'Restaurar tamanho' : 'Maximizar';
      maximize.setAttribute('aria-label', maximize.title);
      maximize.setAttribute('aria-pressed', String(expanded));
    };
    const toggleMaximize = () => { windowEl.classList.toggle('maximized'); bringForward(windowEl); updateButton(); };
    maximize.addEventListener('click', toggleMaximize);
    controls.insertBefore(maximize, controls.querySelector('.close'));
    updateButton();
    const header = windowEl.querySelector('.window-header');
    header.addEventListener('dblclick', event => { if (!event.target.closest('button')) toggleMaximize(); });
    header.addEventListener('pointerdown', event => { if (windowEl.classList.contains('maximized') && !event.target.closest('button')) event.stopImmediatePropagation(); }, true);
  });
  const win = document.querySelector('[data-window="case"]');
  const content = win.querySelector('.window-content');
  win.classList.add('cases-browser');
  win.classList.add('hidden');
  applyIconName('case', customIconNames.case || 'Casos');
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let cases;
  try { cases = JSON.parse(localStorage.getItem('bh-cases-v1')); } catch {}
  if (!Array.isArray(cases)) cases = ['LOS ANJOS','DORADONEWS','LSCUSTOMS','STROKEMASTERS','BENNYS','BAHAMAS','ANJOS BEACH','FIREWITCHES'].map((name,index) => ({id:crypto.randomUUID(),name,description:`Investigação sobre ${name}`,status:'active',code:`OPS · ${String(index+1).padStart(6,'0')}`,folders:[]}));
  let active = null, folder = null, filter = 'all', query = '', classification = 'all';
  let caseOrder='newest', accessFilter='all', priorityFilter='all', filtersOpen=false;
  const normalizeSearch=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
  function searchableCase(row){
    const texts=[];
    function visit(item){if(!item||typeof item!=='object')return;for(const [key,value] of Object.entries(item)){if(['photo','passwordHash','passwordSalt','data'].includes(key))continue;if(typeof value==='string')texts.push(value);else if(Array.isArray(value))value.forEach(visit);else if(value&&typeof value==='object')visit(value);}}
    visit(row);texts.push('Investigação sobre: '+row.name);return normalizeSearch(texts.join(' '));
  }
  const statuses = {active:'Ativas',priority:'Prioridade',archived:'Arquivadas',closed:'Encerradas'};
  function persist(next) { localStorage.setItem('bh-cases-v1',JSON.stringify(next)); cases=next; }
  function render() {
    const record = cases.find(row=>row.id===active);
    const sub = record?.folders.find(row=>row.id===folder);
    if (record) {
      content.innerHTML = `<button class="case-back" data-back>← ${sub?escape(record.name):'Todos os casos'}</button><div class="cases-heading"><div><h2>${escape(sub?.name || record.name)}</h2><p>${escape(sub?'Subpasta de '+record.name:record.description)}</p></div><button data-edit="${sub?'folder':'case'}">Editar</button></div>${sub?`<div class="case-notes">${escape(sub.notes || 'Nenhuma observação cadastrada.')}</div>`:`<button data-new-folder>＋ Nova subpasta</button><div class="cases-grid">${record.folders.map(item=>`<button class="case-folder" data-folder="${item.id}">${desktopSymbol('folder')}<strong>${escape(item.name)}</strong></button>`).join('') || '<p class="cases-empty">Crie subpastas para organizar este caso.</p>'}</div>`}`;
      return;
    }
    const terms=normalizeSearch(query).trim().split(/\s+/).filter(Boolean);
    const rows=cases.filter(row=>(filter==='all'||row.status===filter)&&(classification==='all'||(row.classification||'legal')===classification)&&(priorityFilter==='all'||row.status==='priority'||row.priority===true)&&(accessFilter==='all'||(accessFilter==='protected'?!!row.passwordHash:!row.passwordHash))&&terms.every(term=>searchableCase(row).includes(term)));
    rows.sort((a,b)=>caseOrder==='az'?a.name.localeCompare(b.name,'pt-BR'):caseOrder==='za'?b.name.localeCompare(a.name,'pt-BR'):caseOrder==='oldest'?cases.indexOf(a)-cases.indexOf(b):cases.indexOf(b)-cases.indexOf(a));
    content.innerHTML=`<div class="cases-heading"><div><h2>Casos</h2><p>${cases.length} casos · ${cases.filter(row=>row.status==='active').length} ativos</p></div><button data-new-case>＋ NOVO CASO</button></div><input class="cases-search" placeholder="Buscar por nome, código ou descrição…" aria-label="Buscar casos" value="${escape(query)}"><nav class="cases-tabs">${Object.entries({all:'Todas',...statuses}).map(([key,name])=>`<button data-filter="${key}" class="${filter===key?'selected':''}">${name} <small>${cases.filter(row=>key==='all'||row.status===key).length}</small></button>`).join('')}</nav><div class="cases-grid">${rows.map(row=>`<article class="case-card"><button class="case-card-open" data-case="${row.id}"><small><i class="case-state ${row.status}"></i>${escape(row.code)}</small><h3>${escape(row.name)}</h3><p>${escape(row.description)}</p><span>${escape(statuses[row.status] || 'Ativas')}</span></button><button class="case-edit" data-edit-id="${row.id}" aria-label="Editar ${escape(row.name)}">✎</button></article>`).join('')||'<p class="cases-empty">Nenhum caso encontrado.</p>'}</div>`;
  }
  const deleteDialog = document.createElement('dialog');
  deleteDialog.className = 'rename-icon-dialog';
  deleteDialog.innerHTML = '<h2>Excluir caso?</h2><p class="case-delete-message"></p><form method="dialog"><div class="case-delete-actions"><button value="cancel">Cancelar</button><button value="delete" class="confirm-delete-case">Excluir tudo</button></div></form>';
  document.body.append(deleteDialog);
  let deletingCaseId = null;
  deleteDialog.addEventListener('close', () => {
    if (deleteDialog.returnValue !== 'delete' || !deletingCaseId) return;
    try {
      persist(cases.filter(row => row.id !== deletingCaseId));
      if (active === deletingCaseId) { active = null; folder = null; }
      render(); showToast('Caso e todas as subpastas excluídos.');
    } catch { showToast('Não foi possível excluir o caso neste navegador.'); }
    deletingCaseId = null;
  });
  const addDeleteButtons = () => content.querySelectorAll('.case-card').forEach(card => {
    if (card.querySelector('.case-delete')) return;
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'case-delete'; button.textContent = '×';
    const id = card.querySelector('[data-case]').dataset.case;
    const row = cases.find(item => item.id === id);
    button.setAttribute('aria-label', 'Excluir caso ' + row.name); button.title = 'Excluir caso e subpastas';
    button.addEventListener('click', event => {
      event.stopPropagation(); deletingCaseId = id;
      deleteDialog.querySelector('.case-delete-message').textContent = `Excluir “${row.name}” e todas as suas subpastas e observações? Esta ação não pode ser desfeita.`;
      deleteDialog.returnValue = ''; deleteDialog.showModal();
      deleteDialog.querySelector('[value="cancel"]').focus();
    });
    card.append(button);
  });
  function addClassificationFilter() {
    const search=content.querySelector('.cases-search');if(!search||content.querySelector('.classification-filter'))return;
    const select=document.createElement('select');select.className='classification-filter';select.setAttribute('aria-label','Filtrar classificação');
    select.innerHTML='<option value="all">Todas as classificações</option><option value="legal">Legal</option><option value="illegal">Ilegal</option>';select.value=classification;
    select.onchange=()=>{classification=select.value;render();};search.after(select);
    content.querySelectorAll('.case-card').forEach(card=>{const row=cases.find(item=>item.id===card.querySelector('[data-case]').dataset.case);const text=card.querySelector('.case-card-open>span');text.textContent=((row.classification||'legal')==='legal'?'⚖ LEGAL · ':'☠ ILEGAL · ')+(statuses[row.status]||'Ativas');text.dataset.status=row.status;});
  }
  function updateCaseDescriptions() {
    content.querySelectorAll('.case-card').forEach(card => {
      const row = cases.find(item => item.id === card.querySelector('[data-case]').dataset.case);
      const description = card.querySelector('.case-card-open p');
      if (row && description) description.textContent = `Investigação sobre: ${row.name}`;
    });
  }
  const isCaseAdmin = () => document.querySelector('#taskbar-username').textContent.trim().toLowerCase() === 'sakai';
  const passwordDigest = async (password, salt) => {
    const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(salt + ':' + password));
    return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2,'0')).join('');
  };
  const accessDialog = document.createElement('dialog');
  accessDialog.className = 'rename-icon-dialog case-access-dialog';
  document.body.append(accessDialog);
  function requestCasePassword(row, configure = false) {
    if (configure && !isCaseAdmin()) return;
    accessDialog.innerHTML = `<form><div class="access-heading"><h2>♙ ${configure?'Senha do caso':'ACESSO RESTRITO'}</h2><button type="button" data-close aria-label="Fechar">×</button></div><p>${configure?'Defina ou altere a senha de':'Este caso requer senha para acesso:'} <strong>${escape(row.name)}</strong></p><input type="password" name="password" aria-label="Senha do caso" placeholder="${configure?'Nova senha…':'Digite a senha…'}" autocomplete="${configure?'new-password':'off'}" ${configure?'minlength="4"':''} required maxlength="128"><p class="password-error" role="alert"></p><div class="access-actions">${configure&&row.passwordHash?'<button type="button" data-remove-password>Remover senha</button>':''}<button type="button" data-cancel>Cancelar</button><button type="submit">${configure?'Salvar':'Acessar'}</button></div></form>`;
    accessDialog.querySelector('[data-close]').onclick = accessDialog.querySelector('[data-cancel]').onclick = () => accessDialog.close();
    const removePassword = accessDialog.querySelector('[data-remove-password]');
    if (removePassword) removePassword.onclick = () => {
      try { const next=structuredClone(cases), record=next.find(item=>item.id===row.id); delete record.passwordHash; delete record.passwordSalt; persist(next); accessDialog.close(); render(); showToast('Senha removida do caso.'); }
      catch { accessDialog.querySelector('.password-error').textContent='Não foi possível salvar.'; }
    };
    accessDialog.querySelector('form').onsubmit = async event => {
      event.preventDefault(); const submit=accessDialog.querySelector('[type="submit"]'); submit.disabled=true;
      try {
        const password=accessDialog.querySelector('input').value;
        if(configure){const salt=crypto.randomUUID(),hash=await passwordDigest(password,salt);const next=structuredClone(cases);Object.assign(next.find(item=>item.id===row.id),{passwordSalt:salt,passwordHash:hash});persist(next);accessDialog.close();render();showToast('Senha do caso salva.');}
        else if(await passwordDigest(password,row.passwordSalt)===row.passwordHash){active=row.id;folder=null;accessDialog.close();render();}
        else {accessDialog.querySelector('.password-error').textContent='Senha incorreta. Tente novamente.';accessDialog.querySelector('input').select();}
      } catch {accessDialog.querySelector('.password-error').textContent='Não foi possível concluir. Tente novamente.';} finally {submit.disabled=false;}
    };
    accessDialog.showModal(); accessDialog.querySelector('input').focus();
  }
  function addPasswordButtons() {
    content.querySelectorAll('.case-card').forEach(card=>{
      if(card.querySelector('.case-password'))return;
      const row=cases.find(item=>item.id===card.querySelector('[data-case]').dataset.case);
      if(row.passwordHash){const badge=document.createElement('span');badge.className='case-locked-label';badge.textContent='ACESSO RESTRITO';card.append(badge);}
      if(!isCaseAdmin())return;
      const button=document.createElement('button');button.type='button';button.className='case-password';button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/><circle cx="12" cy="15" r="1"/><path d="M12 16v2"/></svg>';button.title=row.passwordHash?'Alterar senha':'Definir senha';button.setAttribute('aria-label',button.title+' de '+row.name);
      button.onclick=event=>{event.stopPropagation();requestCasePassword(row,true);};card.append(button);
    });
  }
  content.addEventListener('click',event=>{
    const button=event.target.closest('[data-case]');if(!button)return;
    const row=cases.find(item=>item.id===button.dataset.case);
    if(row?.passwordHash){event.stopImmediatePropagation();requestCasePassword(row);}
  },true);
  function alignCaseActions() {
    content.querySelectorAll('.case-card').forEach(card => {
      let actions = card.querySelector('.case-actions');
      if (!actions) { actions = document.createElement('div'); actions.className = 'case-actions'; actions.setAttribute('role','group'); actions.setAttribute('aria-label','Ações do caso'); card.prepend(actions); }
      ['case-password','case-edit','case-delete'].forEach(name => {
        const button = card.querySelector('.' + name);
        if (button && button.parentElement !== actions) actions.append(button);
      });
    });
  }
  function addCasePhotos() {
    content.querySelectorAll('.case-card').forEach(card => {
      if(card.querySelector('.case-card-photo'))return;
      const row=cases.find(item=>item.id===card.querySelector('[data-case]').dataset.case);
      if(!row?.photo)return;
      const image=document.createElement('img');image.className='case-card-photo';image.src=row.photo;image.alt='Foto do caso '+row.name;
      card.querySelector('.case-card-open h3').before(image);
    });
  }
  function enhanceSearchTools(){
    const search=content.querySelector('.cases-search');if(!search||content.querySelector('.case-search-tools'))return;
    search.placeholder='Buscar nomes ou palavras em casos e subpastas…';
    const tools=document.createElement('div');tools.className='case-search-tools';search.before(tools);tools.append(search);
    const toggle=document.createElement('button');toggle.textContent='☷ Filtros';toggle.type='button';toggle.setAttribute('aria-expanded','false');tools.append(toggle);
    const order=document.createElement('select');order.setAttribute('aria-label','Organizar casos');order.innerHTML='<option value="newest">Mais recentes</option><option value="oldest">Mais antigos</option><option value="az">Nome A–Z</option><option value="za">Nome Z–A</option>';order.value=caseOrder;order.onchange=()=>{caseOrder=order.value;render();};tools.append(order);
    const filters=document.createElement('div');filters.className='case-extra-filters';filters.hidden=true;tools.after(filters);
    const existing=content.querySelector('.classification-filter');if(existing)existing.hidden=true;
    const sections=[['TIPO',[['all','Todos'],['legal','Legal'],['illegal','Ilegal']],classification,value=>classification=value],['STATUS',[['all','Todos'],['active','Ativo'],['archived','Arquivado'],['closed','Encerrado']],filter,value=>filter=value],['PRIORIDADE',[['all','Qualquer'],['priority','Com prioridade']],priorityFilter,value=>priorityFilter=value]];
    sections.forEach(([title,options,selected,setValue])=>{const group=document.createElement('fieldset');const legend=document.createElement('legend');legend.textContent=title;group.append(legend);options.forEach(([value,label])=>{const choice=document.createElement('button');choice.type='button';choice.className='case-filter-choice';choice.dataset.kind=value;choice.setAttribute('aria-pressed',String(value===selected));choice.textContent=(value==='legal'?'⚖ ':value==='illegal'?'☠ ':['active','archived','closed','priority'].includes(value)?'● ':'')+label;const dot=document.createElement('span');dot.textContent=value===selected?'●':'';dot.setAttribute('aria-hidden','true');choice.append(dot);choice.onclick=()=>{setValue(value);render();};group.append(choice);});filters.append(group);});
    const clear=document.createElement('button');clear.type='button';clear.className='case-filter-clear';clear.textContent='Limpar filtros';clear.onclick=()=>{filter='all';classification='all';priorityFilter='all';accessFilter='all';render();};filters.append(clear);
    filters.hidden=!filtersOpen;toggle.setAttribute('aria-expanded',String(filtersOpen));
    toggle.onclick=()=>{filtersOpen=!filtersOpen;filters.hidden=!filtersOpen;toggle.setAttribute('aria-expanded',String(filtersOpen));};
    const quick=document.createElement('button');quick.type='button';quick.className='case-quick-note';quick.textContent='▤ Nota rápida';quick.onclick=openQuickNotes;content.querySelector('[data-new-case]').before(quick);
    if(query){const hint=document.createElement('p');hint.className='case-search-hint';hint.textContent=content.querySelectorAll('.case-card').length+' caso(s) encontrado(s). Busca inclui nomes e textos das subpastas.';content.querySelector('.cases-grid').before(hint);}
  }
  document.addEventListener('pointerdown',event=>{const tools=content.querySelector('.case-search-tools'),menu=content.querySelector('.case-extra-filters');if(filtersOpen&&menu&&!menu.contains(event.target)&&!tools?.contains(event.target)){filtersOpen=false;menu.hidden=true;tools?.querySelector('button')?.setAttribute('aria-expanded','false');}});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&filtersOpen){filtersOpen=false;const menu=content.querySelector('.case-extra-filters');if(menu)menu.hidden=true;const button=content.querySelector('.case-search-tools button');button?.setAttribute('aria-expanded','false');button?.focus();}});
  const quickNotesDialog=document.createElement('dialog');quickNotesDialog.className='rename-icon-dialog quick-case-notes';document.body.append(quickNotesDialog);
  function readCaseNotes(){try{const saved=JSON.parse(localStorage.getItem('bh-case-quick-notes')||'[]');return Array.isArray(saved)?saved:[];}catch{return [];}}
  function openQuickNotes(){
    const notes=readCaseNotes();
    quickNotesDialog.innerHTML=`<form><h2>Nota rápida</h2><label for="quick-case-message">Deixe um recado</label><textarea id="quick-case-message" required maxlength="2000" placeholder="Escreva seu recado…"></textarea><p class="quick-note-error" role="alert"></p><div><button type="button" data-close-notes>Fechar</button><button type="submit">Publicar</button></div></form><div class="quick-case-note-list">${notes.map(note=>`<article><strong>${escape(note.author)}</strong><small>${escape(new Date(note.createdAt).toLocaleString('pt-BR'))}</small><p>${escape(note.text)}</p>${isCaseAdmin()?`<button type="button" data-remove-note="${escape(note.id)}">Excluir recado</button>`:''}</article>`).join('')||'<p>Nenhum recado publicado.</p>'}</div>`;
    quickNotesDialog.querySelector('[data-close-notes]').onclick=()=>quickNotesDialog.close();
    quickNotesDialog.querySelector('form').onsubmit=event=>{event.preventDefault();const text=quickNotesDialog.querySelector('textarea').value.trim();if(!text)return;try{localStorage.setItem('bh-case-quick-notes',JSON.stringify([{id:crypto.randomUUID(),author:activeProfile||'Investigador',text,createdAt:new Date().toISOString()},...readCaseNotes()]));openQuickNotes();}catch{quickNotesDialog.querySelector('.quick-note-error').textContent='Não foi possível salvar o recado.';}};
    quickNotesDialog.querySelectorAll('[data-remove-note]').forEach(button=>button.onclick=()=>{if(!isCaseAdmin()||!confirm('Excluir este recado?'))return;try{localStorage.setItem('bh-case-quick-notes',JSON.stringify(readCaseNotes().filter(note=>note.id!==button.dataset.removeNote)));openQuickNotes();}catch{quickNotesDialog.querySelector('.quick-note-error').textContent='Não foi possível excluir o recado.';}});
    if(!quickNotesDialog.open)quickNotesDialog.showModal();
  }
  new MutationObserver(()=>{addDeleteButtons();addPasswordButtons();alignCaseActions();addClassificationFilter();updateCaseDescriptions();addCasePhotos();enhanceSearchTools();}).observe(content, {childList:true});
  // The desktop is rendered before login; refresh admin actions once the user is known.
  new MutationObserver(() => render()).observe(document.querySelector('#taskbar-username'), {childList:true,characterData:true,subtree:true});
  const editor=document.createElement('dialog'); editor.className='rename-icon-dialog case-editor'; document.body.append(editor);
  function edit(type,id) {
    const record=cases.find(row=>row.id===(id||active));
    const sub=record?.folders.find(row=>row.id===folder);
    const item=type==='folder'?sub:record;
    let previewUrl;
    let removePhoto = false;
    editor.innerHTML=`<form><h2>${item?'Editar': 'Novo'} ${type==='folder'?'subpasta':'caso'}</h2><label>Nome<input name="name" required maxlength="80" value="${escape(item?.name||'')}"></label><label>${type==='folder'?'Observações':'Descrição'}<textarea name="description" maxlength="10000">${escape(type==='folder'?item?.notes||'':item?.description||'')}</textarea></label>${type==='case'?`<label>Status<select name="status">${Object.entries(statuses).map(([key,name])=>`<option value="${key}" ${item?.status===key?'selected':''}>${name}</option>`).join('')}</select></label>`:''}<p role="alert"></p><div><button type="button" data-cancel>Cancelar</button><button>Salvar</button></div></form>`;
    if(type==='case') {
      editor.classList.add('case-designation-editor');
      editor.querySelector('label').firstChild.textContent='DESIGNAÇÃO';
      editor.querySelector('[name="name"]').placeholder='Nome do caso';
      editor.querySelector('textarea').parentElement.firstChild.textContent='BRIEFING';
      editor.querySelector('textarea').placeholder='Descrição confidencial…';
      const photoLabel=document.createElement('label');photoLabel.className='case-photo-field';photoLabel.textContent='FOTO DO CASO (OPCIONAL)';
      const photoInput=document.createElement('input');photoInput.type='file';photoInput.name='casePhoto';photoInput.accept='image/png,image/jpeg,image/webp';
      const preview=document.createElement('img');preview.className='case-photo-preview';preview.hidden=!item?.photo;if(item?.photo)preview.src=item.photo;preview.alt='Prévia da foto do caso';
      const removePhotoButton=document.createElement('button');removePhotoButton.type='button';removePhotoButton.className='remove-case-photo';removePhotoButton.textContent='Remover foto';removePhotoButton.hidden=!item?.photo;
      removePhotoButton.onclick=()=>{removePhoto=true;photoInput.value='';preview.hidden=true;preview.removeAttribute('src');removePhotoButton.hidden=true;if(previewUrl){URL.revokeObjectURL(previewUrl);previewUrl=null;}};
      photoInput.onchange=()=>{if(previewUrl)URL.revokeObjectURL(previewUrl);const file=photoInput.files[0];if(file){removePhoto=false;previewUrl=URL.createObjectURL(file);preview.src=previewUrl;preview.hidden=false;removePhotoButton.hidden=false;}else{preview.hidden=removePhoto||!item?.photo;removePhotoButton.hidden=preview.hidden;if(!preview.hidden)preview.src=item.photo;}};
      photoLabel.append(photoInput,preview,removePhotoButton);editor.querySelector('textarea').parentElement.after(photoLabel);
      editor.addEventListener('close',()=>{if(previewUrl)URL.revokeObjectURL(previewUrl);},{once:true});
      const statusLabel=editor.querySelector('[name="status"]').parentElement;
      const classificationFields=document.createElement('fieldset');classificationFields.className='case-choice-fields';classificationFields.innerHTML=`<legend>CLASSIFICAÇÃO</legend>${[['legal','⚖ LEGAL'],['illegal','☠ ILEGAL']].map(([value,label])=>`<label><input type="radio" name="classification" value="${value}" ${(item?.classification||'legal')===value?'checked':''}><span>${label}</span></label>`).join('')}`;statusLabel.before(classificationFields);
      const statusFields=document.createElement('fieldset');statusFields.className='case-choice-fields';statusFields.innerHTML=`<legend>STATUS</legend>${[['active','Ativo'],['priority','Prioridade'],['archived','Arquivado'],['closed','Encerrado']].map(([value,label])=>`<label><input type="radio" name="status" value="${value}" ${(item?.status||'active')===value?'checked':''}><span><i class="status-choice-dot" data-status="${value}"></i> ${label}</span></label>`).join('')}`;statusLabel.replaceWith(statusFields);
      if(isCaseAdmin()){const passwordLabel=document.createElement('label');passwordLabel.textContent='SENHA DE ACESSO (OPCIONAL)';const input=document.createElement('input');input.type='password';input.name='casePassword';input.minLength=4;input.maxLength=128;input.autocomplete='new-password';input.placeholder=item?.passwordHash?'Deixe vazio para manter a senha':'Deixe vazio para acesso livre';passwordLabel.append(input);statusFields.after(passwordLabel);}
    } else editor.classList.remove('case-designation-editor');
    editor.querySelector('[data-cancel]').onclick=()=>editor.close();
    editor.querySelector('form').onsubmit=async event=>{
      event.preventDefault();const fields=new FormData(event.currentTarget),name=String(fields.get('name')).trim();if(!name)return;
      const next=structuredClone(cases);
      let uploadedPhoto;
      if(type==='case'){
        const file=fields.get('casePhoto');
        if(file?.size){
          if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>10*1024*1024){editor.querySelector('p').textContent='Escolha uma foto PNG, JPG ou WebP de até 10 MB.';return;}
          let image;
          try{image=await createImageBitmap(file);const canvas=document.createElement('canvas');const scale=Math.min(1,400/Math.max(image.width,image.height));canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);uploadedPhoto=canvas.toDataURL('image/jpeg',.8);}
          catch{editor.querySelector('p').textContent='Não foi possível abrir esta foto. Escolha outra imagem.';return;}
          finally{image?.close();}
        }
      }
      if(type==='case'){const values={name,description:String(fields.get('description')),status:fields.get('status'),classification:fields.get('classification')};const password=fields.get('casePassword');if(password&&isCaseAdmin()){try{values.passwordSalt=crypto.randomUUID();values.passwordHash=await passwordDigest(password,values.passwordSalt);}catch{editor.querySelector('p').textContent='Não foi possível salvar a senha.';return;}}if(item)Object.assign(next.find(row=>row.id===item.id),values);else next.push({...values,id:crypto.randomUUID(),code:'OPS · '+Date.now().toString(16).slice(-6).toUpperCase(),folders:[]});}
      else {const parent=next.find(row=>row.id===active),values={name,notes:String(fields.get('description'))};if(sub)Object.assign(parent.folders.find(row=>row.id===sub.id),values);else parent.folders.push({...values,id:crypto.randomUUID()});}
      if(uploadedPhoto){const target=item?next.find(row=>row.id===item.id):next[next.length-1];target.photo=uploadedPhoto;}
      else if(type==='case'&&removePhoto&&item){delete next.find(row=>row.id===item.id).photo;}
      try{persist(next);editor.close();render();}catch{editor.querySelector('p').textContent='Não foi possível salvar neste navegador. O armazenamento pode estar cheio.';}
    };editor.showModal();
  }
  content.addEventListener('click',event=>{const button=event.target.closest('button');if(!button)return;if(button.hasAttribute('data-back')){if(folder)folder=null;else active=null;}if(button.dataset.case)active=button.dataset.case;if(button.dataset.folder)folder=button.dataset.folder;if(button.dataset.filter)filter=button.dataset.filter;if(button.hasAttribute('data-new-case'))return edit('case');if(button.hasAttribute('data-new-folder'))return edit('folder');if(button.dataset.editId)return edit('case',button.dataset.editId);if(button.dataset.edit)return edit(button.dataset.edit);render();});
  content.addEventListener('input',event=>{if(event.target.matches('.cases-search')){query=event.target.value;const cursor=event.target.selectionStart;render();const input=content.querySelector('.cases-search');input.focus();input.setSelectionRange(cursor,cursor);}});
  // Keep a taskbar button for every open window, including minimized windows.
  document.querySelector('.taskbar-app').remove();
  const tasks=document.createElement('div');tasks.className='window-tasks';document.querySelector('.tray').before(tasks);
  const syncTasks=()=>{tasks.replaceChildren();document.querySelectorAll('.window').forEach(item=>{if(item.classList.contains('hidden'))return;const task=document.createElement('button');task.className='window-task';task.innerHTML=desktopSymbol('folder');const name=item.querySelector('.window-header > span:nth-child(2)').textContent;task.title=name;task.setAttribute('aria-label','Restaurar '+name);task.classList.toggle('is-minimized',item.classList.contains('minimized'));task.onclick=()=>{item.classList.remove('minimized');bringForward(item);};tasks.append(task);});};
  document.querySelectorAll('.window').forEach(item=>new MutationObserver(syncTasks).observe(item,{attributes:true,attributeFilter:['class']}));
  render();syncTasks();
})();
