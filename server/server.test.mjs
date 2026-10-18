import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
test('authentication, roles, persistence, conflicts and logout',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'bh-test-')),port=34567;
 const child=spawn(process.execPath,['server/server.mjs'],{env:{...process.env,PORT:String(port),DATABASE_PATH:join(dir,'test.sqlite'),ADMIN_USERNAME:'admin-test',ADMIN_PASSWORD:'test-only-password-123'}});
 try{
  await new Promise((resolve,reject)=>{child.stdout.once('data',resolve);child.once('exit',code=>reject(Error('Server exited '+code)));setTimeout(()=>reject(Error('Timeout')),10000).unref();});
  const request=async(path,method='GET',data,token)=>{const response=await fetch('http://127.0.0.1:'+port+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(data?{body:JSON.stringify(data)}:{})});return {status:response.status,value:await response.json()};};
  assert.equal((await request('/api/cases')).status,401);
  assert.equal((await request('/api/login','POST',{username:'admin-test',password:'wrong'})).status,401);
  const login=await request('/api/login','POST',{username:'admin-test',password:'test-only-password-123'});assert.equal(login.status,200);const token=login.value.token;
  assert.equal((await request('/api/users','POST',{username:'investigator',password:'test-investigator-123',role:'investigator'},token)).status,201);
  const record={id:'case-1',name:'Preserved',folders:[],elements:[{id:'n1',x:100,y:150}],links:[]};
  assert.equal((await request('/api/cases','PUT',{revision:0,cases:[record]},token)).status,200);
  assert.equal((await request('/api/cases','PUT',{revision:0,cases:[]},token)).status,409);
  const member=(await request('/api/login','POST',{username:'investigator',password:'test-investigator-123'})).value.token;
  const state=await request('/api/cases','GET',null,member);assert.deepEqual(state.value.cases,[record]);
  assert.equal((await request('/api/users','GET',null,member)).status,403);
  assert.equal((await request('/api/cases','PUT',{revision:1,cases:[]},member)).status,403);
  await request('/api/logout','POST',{},token);assert.equal((await request('/api/me','GET',null,token)).status,401);
 }finally{child.kill();await new Promise(resolve=>child.once('exit',resolve));rmSync(dir,{recursive:true,force:true});}
});
