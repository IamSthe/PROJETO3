import assert from 'node:assert/strict';
globalThis.window={};await import('./connection-routing.js');const route=window.routeInvestigationLink;
const orthogonal=points=>points.slice(1).every((p,i)=>p[0]===points[i][0]||p[1]===points[i][1]);
const boxes=new Map([['a',{x:200,y:20,w:165,h:210}],['b',{x:200,y:500,w:165,h:210}]]);
let result=route({from:'a',to:'b'},boxes);assert.equal(result.fromPort,'bottom');assert.equal(result.toPort,'top');assert.ok(orthogonal(result.points));assert.deepEqual(result.points[0],[282.5,230]);
for(const fromPort of ['left','right','top','bottom'])for(const toPort of ['left','right','top','bottom']){result=route({from:'a',to:'b',fromPort,toPort},boxes);assert.equal(result.fromPort,fromPort);assert.equal(result.toPort,toPort);assert.ok(orthogonal(result.points));}
boxes.set('c',{x:200,y:310,w:165,h:100});result=route({from:'a',to:'b'},boxes);const obstacle=boxes.get('c');
for(let i=1;i<result.points.length;i++){const a=result.points[i-1],b=result.points[i];assert.ok(!(a[0]===b[0]?a[0]>obstacle.x&&a[0]<obstacle.x+obstacle.w&&Math.max(a[1],b[1])>obstacle.y&&Math.min(a[1],b[1])<obstacle.y+obstacle.h:a[1]>obstacle.y&&a[1]<obstacle.y+obstacle.h&&Math.max(a[0],b[0])>obstacle.x&&Math.min(a[0],b[0])<obstacle.x+obstacle.w));}
result=route({from:'a',to:'b',routePoints:[[100,260],[100,450]]},boxes);assert.ok(orthogonal(result.points));assert.ok(result.points.some(p=>p[0]===100));
boxes.delete('c');boxes.set('b',{x:50,y:500,w:165,h:210});boxes.set('d',{x:380,y:500,w:165,h:210});const links=[{from:'a',to:'b'},{from:'a',to:'d'}];const routes=links.map(link=>route(link,boxes,links));assert.ok(routes.every(r=>Math.max(...r.points.map(p=>p[1]))<=500));assert.ok(routes.every(r=>r.points.some(p=>p[1]===365)));
console.log('PASS: automatic ports, 16 manual combinations, obstacle avoidance, manual routing, hierarchy');
