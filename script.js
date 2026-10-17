const boot = document.querySelector('#boot');
const desktop = document.querySelector('#desktop');
function desktopSymbol(name) {
  return `<svg class="metallic-icon" viewBox="0 0 64 64" aria-hidden="true"><use href="assents/desktop-icons.svg#${name}"></use></svg>`;
}
const desktopSymbols = {case:'folder',evidence:'folder',database:'database',cameras:'camera',audio:'audio',trash:'trash'};
document.querySelectorAll('.desktop-icon').forEach(button => {
  button.firstElementChild.innerHTML = desktopSymbol(desktopSymbols[button.dataset.open]);
});
document.querySelectorAll('.window-app-icon').forEach(element => {
  element.innerHTML = desktopSymbol(element.closest('[data-window]').dataset.window === 'case' ? 'folder' : 'document');
});
document.querySelectorAll('.menu-row > span').forEach(element => element.innerHTML = desktopSymbol('document'));
document.querySelector('.taskbar-app').innerHTML = desktopSymbol('folder');
const volumeIcon = document.querySelector('.volume-icon');
volumeIcon.setAttribute('role', 'button');
volumeIcon.tabIndex = 0;
volumeIcon.setAttribute('aria-expanded', 'false');
let siteVolume = Number(localStorage.getItem('bh-site-volume') ?? 50);
if (!Number.isFinite(siteVolume)) siteVolume = 50;
siteVolume = Math.max(0, Math.min(100, siteVolume));
let lastVolume = siteVolume || 50;
let audioContext;
const volumePanel = document.createElement('div');
volumePanel.className = 'volume-panel';
volumePanel.hidden = true;
volumePanel.innerHTML = '<span class="volume-panel-title">VOLUME</span><output id="volume-value"></output><input id="site-volume" type="range" min="0" max="100" aria-label="Volume do site"><button type="button" id="volume-mute">Silenciar</button>';
volumeIcon.parentElement.append(volumePanel);
const volumeSlider = volumePanel.querySelector('input');
function updateSiteVolume() {
  volumeSlider.value = siteVolume;
  volumePanel.querySelector('output').textContent = `${siteVolume}%`;
  volumePanel.querySelector('button').textContent = siteVolume ? 'Silenciar' : 'Ativar som';
  volumeIcon.classList.toggle('is-muted', siteVolume === 0);
  volumeIcon.setAttribute('aria-label', `Volume do site: ${siteVolume}%`);
  localStorage.setItem('bh-site-volume', siteVolume);
  document.querySelectorAll('audio,video').forEach(media => media.volume = siteVolume / 100);
}
async function playVolumeTone() {
  if (!siteVolume) return;
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    await audioContext.resume();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const now = audioContext.currentTime;
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(660, now);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(siteVolume / 100 * .12, now + .015);
    gain.gain.exponentialRampToValueAtTime(.0001, now + .22);
    oscillator.connect(gain); gain.connect(audioContext.destination);
    oscillator.start(now); oscillator.stop(now + .24);
  } catch { /* Audio may be unavailable in this browser. */ }
}
function toggleVolumePanel() { volumePanel.hidden = !volumePanel.hidden; volumeIcon.setAttribute('aria-expanded', String(!volumePanel.hidden)); if (!volumePanel.hidden) volumeSlider.focus(); }
volumeIcon.addEventListener('click', toggleVolumePanel);
volumeIcon.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggleVolumePanel(); } });
volumeSlider.addEventListener('input', () => { siteVolume = Number(volumeSlider.value); updateSiteVolume(); });
volumeSlider.addEventListener('change', playVolumeTone);
volumePanel.querySelector('button').addEventListener('click', () => { if (siteVolume) { lastVolume = siteVolume; siteVolume = 0; } else siteVolume = lastVolume; updateSiteVolume(); playVolumeTone(); });
document.addEventListener('click', event => { if (!volumePanel.contains(event.target) && !volumeIcon.contains(event.target)) { volumePanel.hidden = true; volumeIcon.setAttribute('aria-expanded', 'false'); } });
document.addEventListener('keydown', event => { if (event.key === 'Escape' && !volumePanel.hidden) { volumePanel.hidden = true; volumeIcon.setAttribute('aria-expanded', 'false'); volumeIcon.focus(); } });
updateSiteVolume();
const starField = document.querySelector('#star-field');

for (let index = 0; index < 84; index += 1) {
  const star = document.createElement('i');
  star.className = `star${Math.random() < .18 ? ' is-blue' : ''}`;
  star.style.setProperty('--size', `${Math.random() < .13 ? 2 : 1}px`);
  star.style.setProperty('--opacity', `${.22 + Math.random() * .62}`);
  star.style.setProperty('--duration', `${18 + Math.random() * 28}s`);
  star.style.setProperty('--delay', `${-Math.random() * 42}s`);
  star.style.left = `${Math.random() * 100}%`;
  star.style.top = '100%';
  starField.append(star);
}


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
let activeProfile = '';
const oldAvatar = document.querySelector('.taskbar-avatar');
const avatarButton = document.createElement('button');
avatarButton.type = 'button';
avatarButton.className = 'taskbar-avatar';
avatarButton.setAttribute('aria-label', 'Escolher foto do perfil');
avatarButton.title = 'Clique para escolher sua foto';
const defaultAvatar = oldAvatar.innerHTML;
avatarButton.innerHTML = defaultAvatar;
oldAvatar.replaceWith(avatarButton);
const avatarInput = document.createElement('input');
avatarInput.type = 'file';
avatarInput.accept = 'image/png,image/jpeg,image/webp';
avatarInput.hidden = true;
document.body.append(avatarInput);
function renderProfilePhoto(photo) {
  avatarButton.replaceChildren();
  if (photo) {
    const image = document.createElement('img');
    image.src = photo;
    image.alt = `Foto de ${activeProfile}`;
    avatarButton.append(image);
  } else avatarButton.innerHTML = defaultAvatar;
}
const avatarMenu = document.createElement('div');
avatarMenu.className = 'avatar-menu';
avatarMenu.hidden = true;
avatarMenu.innerHTML = '<button type="button" data-avatar-view>Visualizar foto</button><button type="button" data-avatar-edit>Editar foto</button>';
document.querySelector('.taskbar-user').append(avatarMenu);
avatarButton.setAttribute('aria-expanded', 'false');
const avatarPreview = document.createElement('dialog');
avatarPreview.className = 'avatar-preview-dialog';
avatarPreview.setAttribute('aria-label', 'Foto do perfil');
avatarPreview.innerHTML = '<button type="button" class="avatar-preview-close" aria-label="Fechar visualização">×</button><div class="avatar-preview-circle"></div><p></p>';
document.body.append(avatarPreview);
function closeAvatarMenu() { avatarMenu.hidden = true; avatarButton.setAttribute('aria-expanded', 'false'); }
avatarButton.addEventListener('click', () => {
  avatarMenu.hidden = !avatarMenu.hidden;
  avatarButton.setAttribute('aria-expanded', String(!avatarMenu.hidden));
});
avatarMenu.querySelector('[data-avatar-edit]').addEventListener('click', () => { closeAvatarMenu(); avatarInput.click(); });
avatarMenu.querySelector('[data-avatar-view]').addEventListener('click', () => {
  closeAvatarMenu();
  const circle = avatarPreview.querySelector('.avatar-preview-circle');
  circle.replaceChildren();
  const photo = avatarButton.querySelector('img');
  if (photo) circle.append(photo.cloneNode(true));
  else circle.innerHTML = defaultAvatar;
  avatarPreview.querySelector('p').textContent = activeProfile;
  avatarPreview.showModal();
});
avatarPreview.querySelector('.avatar-preview-close').addEventListener('click', () => avatarPreview.close());
avatarPreview.addEventListener('click', event => { if (event.target === avatarPreview) { const rect = avatarPreview.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) avatarPreview.close(); } });
document.addEventListener('click', event => { if (!avatarMenu.contains(event.target) && !avatarButton.contains(event.target)) closeAvatarMenu(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeAvatarMenu(); });
avatarInput.addEventListener('change', async () => {
  const file = avatarInput.files[0];
  avatarInput.value = '';
  if (!file || !activeProfile) return;
  if (!['image/png','image/jpeg','image/webp'].includes(file.type)) { showToast('Escolha uma imagem PNG, JPG ou WebP.'); return; }
  if (file.size > 10 * 1024 * 1024) { showToast('Escolha uma imagem de até 10 MB.'); return; }
  let image;
  try {
    image = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128;
    const side = Math.min(image.width, image.height);
    canvas.getContext('2d').drawImage(image, (image.width-side)/2, (image.height-side)/2, side, side, 0, 0, 128, 128);
    const photo = canvas.toDataURL('image/jpeg', .85);
    localStorage.setItem(`bh-profile-photo:${activeProfile.toLocaleLowerCase('pt-BR')}`, photo);
    renderProfilePhoto(photo);
    showToast('Foto do perfil atualizada.');
  } catch { showToast('Não foi possível salvar a foto. Tente outra imagem.'); }
  finally { image?.close(); }
});

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
  document.querySelector('#taskbar-username').textContent = username;
  activeProfile = username;
  renderProfilePhoto(localStorage.getItem(`bh-profile-photo:${username.toLocaleLowerCase('pt-BR')}`));
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
document.querySelector('#desktop-clock-slot').append(document.querySelector('#clock'));
function updateClock(){const clock=document.querySelector('#clock');const now=new Date();clock.querySelector('strong').textContent=new Intl.DateTimeFormat('pt-BR',{hour:'2-digit',minute:'2-digit',hour12:false}).format(now);clock.querySelector('small').textContent=new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short',year:'numeric'}).format(now).replace(/ de /g,' ').replace('.','').toUpperCase()}
updateClock(); setInterval(updateClock,1000);
