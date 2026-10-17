const boot = document.querySelector('#boot');
const desktop = document.querySelector('#desktop');
const starField = document.querySelector('#star-field');

for (let index = 0; index < 84; index += 1) {
  const star = document.createElement('i');
  star.className = `star${Math.random() < .18 ? ' is-blue' : ''}`;
  star.style.setProperty('--size', `${Math.random() < .13 ? 2 : 1}px`);
  star.style.setProperty('--opacity', `${.22 + Math.random() * .62}`);
  star.style.setProperty('--duration', `${18 + Math.random() * 28}s`);
  star.style.setProperty('--delay', `${-Math.random() * 42}s`);
  const driftX = -20 + Math.random() * 40;
  const driftY = -28 + Math.random() * 56;
  star.style.setProperty('--drift-x', `${driftX}px`);
  star.style.setProperty('--drift-y', `${driftY}px`);
  star.style.setProperty('--drift-half-x', `${driftX * .48}px`);
  star.style.setProperty('--drift-half-y', `${driftY * .48}px`);
  star.style.setProperty('--depth', `${.25 + Math.random() * .9}`);
  star.style.left = `${Math.random() * 100}%`;
  star.style.top = `${Math.random() * 100}%`;
  starField.append(star);
}

let pointerFrame;
window.addEventListener('pointermove', event => {
  const moveX = (event.clientX / innerWidth - .5) * -18;
  const moveY = (event.clientY / innerHeight - .5) * -13;
  cancelAnimationFrame(pointerFrame);
  pointerFrame = requestAnimationFrame(() => {
    starField.querySelectorAll('.star').forEach(star => {
      const depth = Number(star.style.getPropertyValue('--depth')) || 1;
      star.style.setProperty('--parallax-x', `${moveX * depth}px`);
      star.style.setProperty('--parallax-y', `${moveY * depth}px`);
    });
  });
});

function startDesktop() {
  boot.classList.add('done');
  desktop.classList.add('ready');
  desktop.setAttribute('aria-hidden', 'false');
}

const loginForm = document.querySelector('#login-form');
const usernameInput = document.querySelector('#username');
const passwordInput = document.querySelector('#password');
const rememberCheckbox = document.querySelector('#remember-me');
const loginError = document.querySelector('#login-error');
const startupStatus = document.querySelector('#startup-status');
const startupLoading = document.querySelector('#startup-loading');
const savedLogin = localStorage.getItem('windows-demo-login');

if (savedLogin) {
  try {
    const credentials = JSON.parse(savedLogin);
    usernameInput.value = credentials.username || '';
    passwordInput.value = credentials.password || '';
    rememberCheckbox.checked = true;
  } catch {
    localStorage.removeItem('windows-demo-login');
  }
}

loginForm.addEventListener('submit', event => {
  event.preventDefault();
  const username = usernameInput.value.trim();
  const password = passwordInput.value;

  if (username !== 'sakai' || password !== '123') {
    loginError.textContent = 'Nome ou senha incorretos. Confira os dados e tente novamente.';
    passwordInput.focus();
    return;
  }

  loginError.textContent = '';
  if (rememberCheckbox.checked) {
    localStorage.setItem('windows-demo-login', JSON.stringify({username, password}));
  } else {
    localStorage.removeItem('windows-demo-login');
  }
  boot.classList.add('loading');
  startupLoading.setAttribute('aria-hidden', 'false');
  const startupMessages = [
    'Iniciando informações...',
    'Carregando perfil do usuário...',
    'Preparando área de trabalho...',
    'Quase pronto...'
  ];
  startupMessages.forEach((message, index) => {
    setTimeout(() => { startupStatus.textContent = message; }, index * 900);
  });
  setTimeout(startDesktop, 3600);
});

let topZ = 5;
const windows = [...document.querySelectorAll('.window')];
function bringForward(win) { win.style.zIndex = ++topZ; }
windows.forEach(win => {
  win.addEventListener('pointerdown', () => bringForward(win));
  const header = win.querySelector('.window-header');
  let drag = null;
  header.addEventListener('pointerdown', event => {
    if (event.target.closest('button')) return;
    const rect = win.getBoundingClientRect();
    drag = {x:event.clientX-rect.left,y:event.clientY-rect.top};
    header.setPointerCapture(event.pointerId);
  });
  header.addEventListener('pointermove', event => {
    if (!drag) return;
    win.style.left = `${Math.max(0,Math.min(innerWidth-win.offsetWidth,event.clientX-drag.x))}px`;
    win.style.top = `${Math.max(0,Math.min(innerHeight-65,event.clientY-drag.y))}px`;
    win.style.right = 'auto';
  });
  header.addEventListener('pointerup', () => drag = null);
  win.querySelector('.close').addEventListener('click', () => win.classList.add('hidden'));
  win.querySelector('.minimize').addEventListener('click', () => win.classList.toggle('minimized'));
});

const toast = document.querySelector('#toast');
let toastTimer;
function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2100);
}
const labels = {case:'Caso 04-2026',evidence:'Evidências',database:'Banco de dados',cameras:'Câmeras',audio:'Áudios',trash:'Lixeira',report:'Relatório inicial',timeline:'Linha do tempo',suspects:'Suspeitos'};
document.querySelectorAll('[data-open]').forEach(button => button.addEventListener('click', () => {
  const name = button.dataset.open;
  if (name === 'case' || name === 'evidence') {
    const win = document.querySelector(`[data-window="${name}"]`);
    win.classList.remove('hidden','minimized');
    bringForward(win);
  } else showToast(`${labels[name]} — abrindo pasta...`);
}));
document.querySelector('#start-button').addEventListener('click', () => {
  const win = document.querySelector('[data-window="case"]');
  win.classList.remove('hidden','minimized');
  bringForward(win);
});
function updateClock(){const clock=document.querySelector('#clock');const now=new Date();clock.querySelector('strong').textContent=new Intl.DateTimeFormat('pt-BR',{hour:'2-digit',minute:'2-digit',hour12:false}).format(now);clock.querySelector('small').textContent=new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'}).format(now)}
updateClock(); setInterval(updateClock,1000);
