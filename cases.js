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
  let active = null, folder = null, filter = 'all', query = '';
  const statuses = {active:'Ativas',priority:'Prioridade',archived:'Arquivadas',closed:'Encerradas'};
  function persist(next) { localStorage.setItem('bh-cases-v1',JSON.stringify(next)); cases=next; }
  function render() {
    const record = cases.find(row=>row.id===active);
    const sub = record?.folders.find(row=>row.id===folder);
    if (record) {
      content.innerHTML = `<button class="case-back" data-back>← ${sub?escape(record.name):'Todos os casos'}</button><div class="cases-heading"><div><h2>${escape(sub?.name || record.name)}</h2><p>${escape(sub?'Subpasta de '+record.name:record.description)}</p></div><button data-edit="${sub?'folder':'case'}">Editar</button></div>${sub?`<div class="case-notes">${escape(sub.notes || 'Nenhuma observação cadastrada.')}</div>`:`<button data-new-folder>＋ Nova subpasta</button><div class="cases-grid">${record.folders.map(item=>`<button class="case-folder" data-folder="${item.id}">${desktopSymbol('folder')}<strong>${escape(item.name)}</strong></button>`).join('') || '<p class="cases-empty">Crie subpastas para organizar este caso.</p>'}</div>`}`;
      return;
    }
    const rows=cases.filter(row=>(filter==='all'||row.status===filter)&&`${row.name} ${row.code} ${row.description}`.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR')));
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
      const button=document.createElement('button');button.type='button';button.className='case-password';button.textContent='⚿';button.title=row.passwordHash?'Alterar senha':'Definir senha';button.setAttribute('aria-label',button.title+' de '+row.name);
      button.onclick=event=>{event.stopPropagation();requestCasePassword(row,true);};card.append(button);
    });
  }
  content.addEventListener('click',event=>{
    const button=event.target.closest('[data-case]');if(!button)return;
    const row=cases.find(item=>item.id===button.dataset.case);
    if(row?.passwordHash){event.stopImmediatePropagation();requestCasePassword(row);}
  },true);
  new MutationObserver(()=>{addDeleteButtons();addPasswordButtons();}).observe(content, {childList:true});
  const editor=document.createElement('dialog'); editor.className='rename-icon-dialog case-editor'; document.body.append(editor);
  function edit(type,id) {
    const record=cases.find(row=>row.id===(id||active));
    const sub=record?.folders.find(row=>row.id===folder);
    const item=type==='folder'?sub:record;
    editor.innerHTML=`<form><h2>${item?'Editar': 'Novo'} ${type==='folder'?'subpasta':'caso'}</h2><label>Nome<input name="name" required maxlength="80" value="${escape(item?.name||'')}"></label><label>${type==='folder'?'Observações':'Descrição'}<textarea name="description" maxlength="10000">${escape(type==='folder'?item?.notes||'':item?.description||'')}</textarea></label>${type==='case'?`<label>Status<select name="status">${Object.entries(statuses).map(([key,name])=>`<option value="${key}" ${item?.status===key?'selected':''}>${name}</option>`).join('')}</select></label>`:''}<p role="alert"></p><div><button type="button" data-cancel>Cancelar</button><button>Salvar</button></div></form>`;
    editor.querySelector('[data-cancel]').onclick=()=>editor.close();
    editor.querySelector('form').onsubmit=event=>{
      event.preventDefault();const fields=new FormData(event.currentTarget),name=String(fields.get('name')).trim();if(!name)return;
      const next=structuredClone(cases);
      if(type==='case'){const values={name,description:String(fields.get('description')),status:fields.get('status')};if(item)Object.assign(next.find(row=>row.id===item.id),values);else next.push({...values,id:crypto.randomUUID(),code:'OPS · '+Date.now().toString(16).slice(-6).toUpperCase(),folders:[]});}
      else {const parent=next.find(row=>row.id===active),values={name,notes:String(fields.get('description'))};if(sub)Object.assign(parent.folders.find(row=>row.id===sub.id),values);else parent.folders.push({...values,id:crypto.randomUUID()});}
      try{persist(next);editor.close();render();}catch{editor.querySelector('p').textContent='Não foi possível salvar neste navegador.';}
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
