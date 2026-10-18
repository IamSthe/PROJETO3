import http from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes,scryptSync,timingSafeEqual,createHash } from 'node:crypto';
import { mkdirSync,readFileSync,existsSync } from 'node:fs';
import { resolve,dirname,extname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const database=resolve(process.env.DATABASE_PATH||resolve(root,'data/blackhearts.sqlite'));mkdirSync(dirname(database),{recursive:true});
const db=new DatabaseSync(database);db.exec(`PRAGMA journal_mode=WAL;PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,username TEXT UNIQUE COLLATE NOCASE,password TEXT NOT NULL,role TEXT NOT NULL,active INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS state(id INTEGER PRIMARY KEY CHECK(id=1),revision INTEGER NOT NULL,data TEXT NOT NULL);
INSERT OR IGNORE INTO state VALUES(1,0,'[]');`);
const digest=value=>createHash('sha256').update(value).digest('hex');
function passwordHash(password){const salt=randomBytes(16).toString('hex');return salt+':'+scryptSync(password,salt,64).toString('hex');}
function passwordMatches(password,stored){const [salt,hash]=stored.split(':');return timingSafeEqual(scryptSync(password,salt,64),Buffer.from(hash,'hex'));}
if(!db.prepare('SELECT 1 FROM users LIMIT 1').get()){
 const username=process.env.ADMIN_USERNAME,password=process.env.ADMIN_PASSWORD;
 if(!username||!password||password.length<12)throw Error('Configure ADMIN_USERNAME e ADMIN_PASSWORD (mínimo de 12 caracteres).');
 db.prepare('INSERT INTO users VALUES(?,?,?,?,1)').run(randomBytes(16).toString('hex'),username,passwordHash(password),'admin');
}
const origin=process.env.FRONTEND_ORIGIN||'http://localhost:3000',attempts=new Map();
function fail(status,message){const error=Error(message);error.status=status;throw error;}
async function body(req){let size=0,chunks=[];for await(const chunk of req){size+=chunk.length;if(size>15*1024*1024)fail(413,'Dados grandes demais.');chunks.push(chunk);}try{return JSON.parse(Buffer.concat(chunks).toString()||'{}');}catch{fail(400,'JSON inválido.');}}
function userFor(req){const token=req.headers.authorization?.replace(/^Bearer /,'');if(!token)fail(401,'Faça login.');const row=db.prepare('SELECT users.* FROM sessions JOIN users ON users.id=sessions.user_id WHERE sessions.token=? AND expires>? AND users.active=1').get(digest(token),Date.now());if(!row)fail(401,'Sessão expirada.');return row;}
function admin(user){if(user.role!=='admin')fail(403,'Somente administradores.');}
const server=http.createServer(async(req,res)=>{
 const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
 if(req.headers.origin===origin){headers['Access-Control-Allow-Origin']=origin;headers.Vary='Origin';}
 const send=(status,value)=>{res.writeHead(status,headers);res.end(JSON.stringify(value));};
 try{
  const path=new URL(req.url,'http://localhost').pathname;
  if(req.method==='OPTIONS'){res.writeHead(204,{...headers,'Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Allow-Methods':'GET, POST, PUT, OPTIONS'});res.end();return;}
  if(path==='/health')return send(200,{ok:true});
  if(path==='/api/login'&&req.method==='POST'){
   const input=await body(req),key=req.socket.remoteAddress;let limit=attempts.get(key);if(!limit||limit.until<Date.now()){limit={count:0,until:Date.now()+900000};attempts.set(key,limit);}if(limit.count>=10)fail(429,'Muitas tentativas. Aguarde 15 minutos.');limit.count++;
   if(typeof input.username!=='string'||typeof input.password!=='string'||input.password.length>256)fail(400,'Dados inválidos.');
   const user=db.prepare('SELECT * FROM users WHERE username=? AND active=1').get(input.username.trim());if(!user||!passwordMatches(input.password,user.password))fail(401,'Nome ou senha incorretos.');attempts.delete(key);
   const token=randomBytes(32).toString('hex');db.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now());db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(digest(token),user.id,Date.now()+8*3600000);return send(200,{token,user:{id:user.id,username:user.username,role:user.role}});
  }
  if(path.startsWith('/api/')){
   const user=userFor(req);
   if(path==='/api/me'&&req.method==='GET')return send(200,{user:{id:user.id,username:user.username,role:user.role}});
   if(path==='/api/logout'&&req.method==='POST'){db.prepare('DELETE FROM sessions WHERE token=?').run(digest(req.headers.authorization.slice(7)));return send(200,{ok:true});}
   if(path==='/api/cases'&&req.method==='GET'){const state=db.prepare('SELECT * FROM state WHERE id=1').get();return send(200,{revision:state.revision,cases:JSON.parse(state.data)});}
   if(path==='/api/cases'&&req.method==='PUT'){
    const input=await body(req);if(!Number.isInteger(input.revision)||!Array.isArray(input.cases)||input.cases.length>1000)fail(400,'Casos inválidos.');const ids=new Set();for(const item of input.cases){if(!item||typeof item.id!=='string'||typeof item.name!=='string'||!item.name.trim()||ids.has(item.id)||!Array.isArray(item.folders))fail(400,'Caso inválido.');ids.add(item.id);}
    const previous=db.prepare('SELECT * FROM state WHERE id=1').get();
    if(user.role!=='admin'){const old=JSON.parse(previous.data);if(old.some(item=>!ids.has(item.id)))fail(403,'Somente administradores podem excluir casos.');for(const item of input.cases){const prior=old.find(row=>row.id===item.id);if(item.passwordHash!==prior?.passwordHash||item.passwordSalt!==prior?.passwordSalt)fail(403,'Somente administradores podem alterar senhas de casos.');}}
    const result=db.prepare('UPDATE state SET data=?,revision=revision+1 WHERE id=1 AND revision=?').run(JSON.stringify(input.cases),input.revision);if(!result.changes)fail(409,'Outro investigador atualizou os casos. Entre novamente antes de editar.');return send(200,{revision:input.revision+1});
   }
   if(path==='/api/users'&&req.method==='GET'){admin(user);return send(200,{users:db.prepare('SELECT id,username,role,active FROM users').all()});}
   if(path==='/api/users'&&req.method==='POST'){admin(user);const input=await body(req);if(!/^[\w.-]{3,40}$/.test(input.username||'')||typeof input.password!=='string'||input.password.length<12||input.password.length>256||!['admin','investigator'].includes(input.role))fail(400,'Use nome de 3–40 caracteres e senha de 12–256 caracteres.');if(db.prepare('SELECT 1 FROM users WHERE username=?').get(input.username))fail(409,'Nome já cadastrado.');db.prepare('INSERT INTO users VALUES(?,?,?,?,1)').run(randomBytes(16).toString('hex'),input.username,passwordHash(input.password),input.role);return send(201,{ok:true});}
   if(path==='/api/users/deactivate'&&req.method==='POST'){admin(user);const input=await body(req);if(input.id===user.id)fail(400,'Você não pode desativar seu próprio acesso.');db.prepare('UPDATE users SET active=0 WHERE id=?').run(input.id);return send(200,{ok:true});}
   fail(404,'Rota não encontrada.');
  }
  if(path==='/backend-config.js'){res.writeHead(200,{'Content-Type':'text/javascript; charset=utf-8','Cache-Control':'no-store'});res.end('window.BLACKHEARTS_API_URL=location.origin;');return;}
  const file=path==='/'?'index.html':decodeURIComponent(path).slice(1);if(!/^(index\.html|script\.js|cases\.js|[a-z-]+\.(js|css)|assents\/[a-zA-Z0-9_.-]+)$/.test(file))fail(404,'Arquivo não encontrado.');const target=resolve(root,file);if(!existsSync(target))fail(404,'Arquivo não encontrado.');res.writeHead(200,{'Content-Type':({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml'})[extname(target)]||'application/octet-stream','X-Content-Type-Options':'nosniff'});res.end(readFileSync(target));
 }catch(error){send(error.status||500,{error:error.status?error.message:'Falha interna do servidor.'});}
});
server.listen(Number(process.env.PORT||3000),'0.0.0.0',()=>console.log('Blackhearts backend iniciado.'));
