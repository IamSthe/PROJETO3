(() => {
  const panel=document.createElement('section');panel.className='boot-terminal';panel.hidden=true;panel.setAttribute('aria-label','Blackhearts Secure Terminal');
  panel.innerHTML='<header><span>▣ &nbsp; BLACKHEARTS — Secure Terminal</span><div><button data-min aria-label="Minimizar">−</button><button data-close aria-label="Fechar">×</button></div></header><div class="terminal-toolbar"><label><input type="checkbox"> Som de digitação</label><button data-skip>Pular introdução →</button></div><div class="terminal-output" tabindex="0" aria-label="Registro de inicialização"></div><div class="terminal-progress" role="progressbar" aria-label="Inicialização" aria-valuemin="0" aria-valuemax="100"><i></i></div><p class="terminal-status" role="status"></p>';
  desktop.append(panel);
  const task=document.createElement('button');task.className='window-task terminal-task';task.hidden=true;task.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="3" width="20" height="17" rx="2"/><path d="m6 8 4 4-4 4m7 0h5"/></svg>';task.title='Blackhearts Secure Terminal';task.setAttribute('aria-label','Restaurar terminal');document.querySelector('.window-tasks').after(task);
  const output=panel.querySelector('.terminal-output'),progress=panel.querySelector('.terminal-progress'),status=panel.querySelector('.terminal-status'),skip=panel.querySelector('[data-skip]'),sound=panel.querySelector('input');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  sound.closest('label').remove();
  panel.querySelector('.terminal-toolbar').style.justifyContent = 'flex-end';
  let frame=0,startTime=0,completed=false,nodes=[],generation=0,context,lastSound=0,autoCloseTimer;
  function closeTerminal() {
    clearTimeout(autoCloseTimer);
    generation++;
    cancelAnimationFrame(frame);
    panel.hidden = true;
    panel.classList.remove('terminal-minimizing');
    task.hidden = true;
  }
  function scheduleAutoClose() {
    clearTimeout(autoCloseTimer);
    autoCloseTimer = setTimeout(closeTerminal, 20000);
  }
  const lines=[
    [0,0,'BLACKHEARTS INVESTIGATIVE SYSTEM','heading'],[100,0,'Version 4.2.6 | Secure Environment',''],
    [250,500,'> boot --profile confidential --integrity-check',''],[850,0,'[BOOT] Inicializando núcleo investigativo…',''],
    [1100,420,'[OK] Núcleo operacional carregado.','ok'],[1650,0,'[SYS] ID de sessão: BH-SECURE',''],
    [1850,400,'> verify_identity --encrypted-channel',''],[2350,0,'[OK] Conexão segura estabelecida.','ok'],
    [2600,500,'[AUTH] Verificando credenciais e permissões…',''],[3300,0,'[OK] Credenciais autenticadas.','ok'],
    [3550,0,'[WARNING] Ambiente confidencial. Auditoria de sessão habilitada.','warning'],
    [3900,500,'> load modules: cases / evidence / secure-storage',''],[4550,0,'[OK] Módulos investigativos disponíveis.','ok'],
    [4800,450,'[SYS] Sincronizando índice operacional…',''],[5400,0,'[OK] Banco de dados sincronizado.','ok'],
    [5700,450,'> finalize_authorization --clearance verified',''],
    [6200,0,'Developed by Sakai','developer-credit'],
    [6400,0,'[OK] Ambiente operacional pronto.','ok']
  ];
  // Activate audio during the login gesture, before the loading screen finishes.
  document.querySelector('#login-form').addEventListener('submit', async () => {
    if (usernameInput.value.trim() !== 'sakai' || passwordInput.value !== '123') return;
    try { context ||= new (window.AudioContext || window.webkitAudioContext)(); await context.resume(); } catch {}
  });
  function tick(now) {
    if (!siteVolume || !context || context.state !== 'running' || now-lastSound < 65) return;
    lastSound = now;
    const time = context.currentTime;
    const oscillator = context.createOscillator();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    const notes = [587.33, 659.25, 698.46, 783.99];
    const pitch = notes[Math.floor(Math.random()*notes.length)];
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(pitch, time);
    oscillator.frequency.exponentialRampToValueAtTime(pitch*.86, time+.035);
    filter.type = 'lowpass';
    filter.frequency.value = 1800;
    filter.Q.value = .5;
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(siteVolume/100*.025, time+.003);
    gain.gain.exponentialRampToValueAtTime(.0001, time+.045);
    oscillator.connect(filter); filter.connect(gain); gain.connect(context.destination);
    oscillator.start(time); oscillator.stop(time+.05);
  }
  function finish(){if(completed)return;completed=true;nodes.forEach((node,i)=>node.textContent=lines[i][2]);const message=document.createElement('div');message.className='terminal-confirmation';message.innerHTML='<strong>IDENTIDADE CONFIRMADA</strong><strong>ACESSO AUTORIZADO — BLACKHEARTS</strong><p>Bem-vindo, Investigador. Seu ambiente operacional está pronto.</p><span>investigador@blackhearts:~$ <b class="terminal-cursor">▌</b></span>';output.append(message);output.scrollTop=output.scrollHeight;progress.style.setProperty('--progress','100%');progress.setAttribute('aria-valuenow','100');status.textContent='Acesso autorizado. Ambiente pronto.';skip.hidden=true;}
  function minimize(){cancelAnimationFrame(frame);finish();task.hidden=false;task.classList.add('is-minimized');panel.classList.add('terminal-minimizing');const current=++generation;setTimeout(()=>{if(current===generation){panel.hidden=true;panel.classList.remove('terminal-minimizing');}},320);}
  function restore(){generation++;panel.classList.remove('terminal-minimizing');panel.hidden=false;task.hidden=false;task.classList.remove('is-minimized');panel.style.zIndex=++topZ+100;output.scrollTop=output.scrollHeight;}
  function animate(now){const elapsed=now-startTime;if(!completed){let changed=false;lines.forEach(([at,duration,text],i)=>{if(elapsed<at)return;const count=duration&&!reduced.matches?Math.min(text.length,Math.floor(Math.pow(Math.min(1,(elapsed-at)/duration),.85)*text.length)):text.length;const next=text.slice(0,count);if(nodes[i].textContent!==next){nodes[i].textContent=next;changed=true;}});if(changed){output.scrollTop=output.scrollHeight;tick(now);}const percent=Math.min(100,Math.round(elapsed/6800*100));progress.style.setProperty('--progress',percent+'%');progress.setAttribute('aria-valuenow',String(percent));if(elapsed>=6800)finish();}if(elapsed>=8800){minimize();return;}frame=requestAnimationFrame(animate);}
  function start(){cancelAnimationFrame(frame);completed=false;output.replaceChildren();lines[5][2]='[SYS] ID de sessão: BH-'+crypto.randomUUID().slice(0,8).toUpperCase();nodes=lines.map(([, , ,name])=>{const node=document.createElement('div');node.className='terminal-line '+name;output.append(node);return node;});skip.hidden=false;status.textContent='Inicializando ambiente…';restore();startTime=performance.now();frame=requestAnimationFrame(animate);}
  skip.onclick=minimize;panel.querySelector('[data-min]').onclick=minimize;task.onclick=restore;
  const personalizedPrompt = new MutationObserver(() => {
    const prompt = output.querySelector('.terminal-confirmation > span');
    if (prompt) prompt.firstChild.textContent = `${activeProfile || 'investigador'}@blackhearts:~$ `;
    const welcome = output.querySelector('.terminal-confirmation > p');
    if (welcome) welcome.textContent = `Bem-vindo, ${activeProfile || 'Investigador'}. Seu ambiente operacional está pronto.`;
  });
  personalizedPrompt.observe(output, {childList:true});
  panel.querySelector('[data-close]').onclick=()=>{generation++;cancelAnimationFrame(frame);finish();panel.hidden=true;task.hidden=true;};
  document.addEventListener('blackhearts-login',start);
  document.addEventListener('blackhearts-login',scheduleAutoClose);
  document.addEventListener('blackhearts-terminal-open',()=>{if(activeProfile.toLowerCase()==='sakai')scheduleAutoClose();});
  document.addEventListener('blackhearts-lock',closeTerminal);
  panel.querySelector('[data-close]').addEventListener('click',()=>clearTimeout(autoCloseTimer));
  document.addEventListener('blackhearts-terminal-open',()=>{if(activeProfile.toLowerCase()==='sakai')restore();});
  document.addEventListener('blackhearts-lock',()=>{generation++;cancelAnimationFrame(frame);panel.hidden=true;panel.classList.remove('terminal-minimizing');task.hidden=true;});
})();
