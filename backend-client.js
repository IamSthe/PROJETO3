(() => {
const base=String(window.BLACKHEARTS_API_URL||'').replace(/\/$/,'');
let token=sessionStorage.getItem('bh-server-token')||'',user=null,revision=0,chain=Promise.resolve(),failed=false,pending=0;
async function request(path,options={}){const response=await fetch(base+path,{...options,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{}),...options.headers}});const value=await response.json();if(!response.ok)throw Error(value.error||'Falha no servidor.');return value;}
window.BHBackend={enabled:!!base,get user(){return user;},async login(username,password){const result=await request('/api/login',{method:'POST',body:JSON.stringify({username,password})});token=result.token;user=result.user;sessionStorage.setItem('bh-server-token',token);const state=await request('/api/cases');revision=state.revision;failed=false;document.dispatchEvent(new CustomEvent('blackhearts-server-cases',{detail:state.cases}));return user;},save(cases){if(failed)throw Error('Sincronização interrompida. Entre novamente para carregar os dados atuais.');const snapshot=JSON.stringify(cases);pending++;chain=chain.then(async()=>{if(failed)return;const result=await request('/api/cases',{method:'PUT',body:JSON.stringify({revision,cases:JSON.parse(snapshot)})});revision=result.revision;}).catch(error=>{failed=true;alert('Alteração não salva no servidor: '+error.message+' Entre novamente antes de continuar.');}).finally(()=>pending--);},async logout(){await chain;try{await request('/api/logout',{method:'POST'});}finally{token='';user=null;sessionStorage.removeItem('bh-server-token');}},request};
window.addEventListener('beforeunload',event=>{if(pending){event.preventDefault();event.returnValue='';}});
BHBackend.importLocal=async()=>{
 if(user?.role!=='admin')throw Error('Somente administradores podem importar.');
 await chain;const state=await request('/api/cases');if(state.cases.length)throw Error('A importação inicial só é permitida com o banco vazio.');
 const local=JSON.parse(localStorage.getItem('bh-cases-v1')||'[]');if(!Array.isArray(local)||!local.length)throw Error('Nenhum caso local encontrado neste navegador.');
 if(!confirm('Importar '+local.length+' caso(s) deste navegador para o servidor?'))return;
 const result=await request('/api/cases',{method:'PUT',body:JSON.stringify({revision:state.revision,cases:local})});revision=result.revision;failed=false;document.dispatchEvent(new CustomEvent('blackhearts-server-cases',{detail:local}));
};
setInterval(async()=>{if(!base||!user||pending||failed||document.querySelector('dialog[open]')||document.querySelector('.iw-workspace'))return;try{const state=await request('/api/cases');if(state.revision!==revision){revision=state.revision;document.dispatchEvent(new CustomEvent('blackhearts-server-cases',{detail:state.cases}));}}catch{}},10000);
})();
