(() => {
 const vectors={top:[0,-1],bottom:[0,1],left:[-1,0],right:[1,0]};
 const simplify=points=>{
  const result=[];
  for(const p of points){
   if(result.length&&p[0]===result.at(-1)[0]&&p[1]===result.at(-1)[1])continue;
   while(result.length>1){const a=result.at(-2),b=result.at(-1);if((a[0]===b[0]&&b[0]===p[0])||(a[1]===b[1]&&b[1]===p[1]))result.pop();else break;}
   const repeated=result.findIndex(q=>q[0]===p[0]&&q[1]===p[1]);if(repeated>=0)result.splice(repeated+1);else result.push([...p]);
  }
  return result;
 };
 const anchor=(b,side)=>({top:[b.x+b.w/2,b.y],bottom:[b.x+b.w/2,b.y+b.h],left:[b.x,b.y+b.h/2],right:[b.x+b.w,b.y+b.h/2]})[side];
 function clear(a,b,boxes){return !boxes.some(o=>a[0]===b[0]?a[0]>o.x&&a[0]<o.x+o.w&&Math.max(a[1],b[1])>o.y&&Math.min(a[1],b[1])<o.y+o.h:a[1]>o.y&&a[1]<o.y+o.h&&Math.max(a[0],b[0])>o.x&&Math.min(a[0],b[0])<o.x+o.w);}
 function route(start,end,boxes){
  const candidates=[ [start,[end[0],start[1]],end],[start,[start[0],end[1]],end] ];
  const xs=new Set([(start[0]+end[0])/2]),ys=new Set([(start[1]+end[1])/2]);
  for(const b of boxes){xs.add(b.x-2);xs.add(b.x+b.w+2);ys.add(b.y-2);ys.add(b.y+b.h+2);}
  for(const x of xs)candidates.push([start,[x,start[1]],[x,end[1]],end]);
  for(const y of ys)candidates.push([start,[start[0],y],[end[0],y],end]);
  const score=p=>p.slice(1).reduce((n,b,i)=>n+Math.abs(b[0]-p[i][0])+Math.abs(b[1]-p[i][1]),0)+p.length*8;
  const valid=candidates.filter(p=>p.slice(1).every((b,i)=>clear(p[i],b,boxes))).sort((a,b)=>score(a)-score(b));if(valid.length)return valid[0];
  // Visibility-grid A*: only nearby obstacles enter the search; far cards cannot cross it.
  const xValues=[...new Set([start[0],end[0],...xs])].sort((a,b)=>a-b),yValues=[...new Set([start[1],end[1],...ys])].sort((a,b)=>a-b);
  const width=xValues.length,key=(x,y)=>y*width+x,first=key(xValues.indexOf(start[0]),yValues.indexOf(start[1])),last=key(xValues.indexOf(end[0]),yValues.indexOf(end[1]));
  const open=[{id:first,g:0,f:0}],cost=new Map([[first,0]]),previous=new Map();
  while(open.length){open.sort((a,b)=>b.f-a.f);const current=open.pop();if(current.g!==cost.get(current.id))continue;if(current.id===last){const path=[];let id=last;while(id!==undefined){path.push([xValues[id%width],yValues[Math.floor(id/width)]]);id=previous.get(id);}return path.reverse();}
   const x=current.id%width,y=Math.floor(current.id/width),a=[xValues[x],yValues[y]];
   for(const [nx,ny] of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]]){if(nx<0||ny<0||nx>=width||ny>=yValues.length)continue;const b=[xValues[nx],yValues[ny]];if(!clear(a,b,boxes))continue;const id=key(nx,ny),g=current.g+Math.abs(a[0]-b[0])+Math.abs(a[1]-b[1]);if(g>=(cost.get(id)??Infinity))continue;cost.set(id,g);previous.set(id,current.id);open.push({id,g,f:g+Math.abs(b[0]-end[0])+Math.abs(b[1]-end[1])});}
  }
  return candidates.sort((a,b)=>score(a)-score(b))[0]; // Overlapping cards may make a clear route impossible.
 }
 window.routeInvestigationLink=(link,boxes,links=[])=>{
  const a=boxes.get(link.from),b=boxes.get(link.to);if(!a||!b)return null;
  const dx=b.x+b.w/2-a.x-a.w/2,dy=b.y+b.h/2-a.y-a.h/2,vertical=Math.abs(dy)>=Math.abs(dx)*.65;
  const fromPort=vectors[link.fromPort]?link.fromPort:vertical?(dy>=0?'bottom':'top'):(dx>=0?'right':'left');
  const toPort=vectors[link.toPort]?link.toPort:vertical?(dy>=0?'top':'bottom'):(dx>=0?'left':'right');
  const start=anchor(a,fromPort),end=anchor(b,toPort),s=start.map((v,i)=>v+vectors[fromPort][i]*20),t=end.map((v,i)=>v+vectors[toPort][i]*20);
  const obstacles=[...boxes.values()].map(o=>({x:o.x-8,y:o.y-8,w:o.w+16,h:o.h+16}));
  const near=obstacles.filter(o=>o.x+o.w>=Math.min(s[0],t[0])-100&&o.x<=Math.max(s[0],t[0])+100&&o.y+o.h>=Math.min(s[1],t[1])-100&&o.y<=Math.max(s[1],t[1])+100);
  let middle;
  if(Array.isArray(link.routePoints)&&link.routePoints.length){middle=[s];for(const p of [...link.routePoints,t]){if(!Array.isArray(p)||!p.every(Number.isFinite))continue;const prev=middle.at(-1);if(prev[0]!==p[0]&&prev[1]!==p[1])middle.push([p[0],prev[1]]);middle.push(p);}}
  else {
   if(fromPort==='bottom'&&toPort==='top'){
    const children=links.filter(l=>l.from===link.from&&(!l.fromPort||l.fromPort==='auto')&&(!l.toPort||l.toPort==='auto')&&!l.routePoints).map(l=>boxes.get(l.to)).filter(o=>o&&o.y>=a.y+a.h+40);
    if(children.length>1){const lane=(a.y+a.h+Math.min(...children.map(o=>o.y)))/2,p=[s,[s[0],lane],[t[0],lane],t];if(p.slice(1).every((v,i)=>clear(p[i],v,obstacles)))middle=p;}
   }
   middle ||= route(s,t,near);
   if(!middle.slice(1).every((v,i)=>clear(middle[i],v,obstacles)))middle=route(s,t,obstacles);
  }
  const points=simplify([start,...middle,end]);let longest=0,label=[(start[0]+end[0])/2,(start[1]+end[1])/2];
  points.slice(1).forEach((p,i)=>{const length=Math.abs(p[0]-points[i][0])+Math.abs(p[1]-points[i][1]);if(length>longest){longest=length;label=[(p[0]+points[i][0])/2,(p[1]+points[i][1])/2];}});
  return {points,label,fromPort,toPort,start,end};
 };
})();
