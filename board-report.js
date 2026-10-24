(() => {
 const MAX_PIXELS=16000000,MAX_SIDE=8192,TILE=2048,MARGIN=80;
 const pause=()=>new Promise(resolve=>setTimeout(resolve,0));
 const STYLE_PROPERTIES=('display position left top right bottom width height min-width min-height max-width max-height box-sizing padding-top padding-right padding-bottom padding-left margin-top margin-right margin-bottom margin-left border-top border-right border-bottom border-left border-radius background background-color background-image background-size background-position box-shadow outline color font-family font-size font-style font-weight line-height letter-spacing text-align text-transform text-decoration white-space word-break overflow-wrap text-overflow overflow overflow-x overflow-y object-fit object-position vertical-align flex-direction align-items justify-content gap flex-grow flex-shrink flex-basis z-index opacity fill stroke stroke-width stroke-linejoin stroke-linecap text-anchor paint-order isolation -webkit-line-clamp -webkit-box-orient').split(' ');
 const readData=blob=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);});
 window.captureBoardExportSnapshot=async board=>{
  const clone=board.cloneNode(true),originals=[board,...board.querySelectorAll('*')],copies=[clone,...clone.querySelectorAll('*')];
  let left=Infinity,top=Infinity,right=-Infinity,bottom=-Infinity;
  const include=(x,y,w,h)=>{left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x+w);bottom=Math.max(bottom,y+h);};
  for(const node of board.querySelectorAll('.iw-node'))include(parseFloat(node.style.left)||0,parseFloat(node.style.top)||0,node.offsetWidth,node.offsetHeight);
  for(const node of board.querySelectorAll('.iw-link-path,.iw-connection text')){const box=node.getBBox();include(box.x-4,box.y-4,box.width+8,box.height+8);}
  for(let i=0;i<originals.length;i++){
   const computed=getComputedStyle(originals[i]);copies[i].removeAttribute('style');
   for(const property of [...STYLE_PROPERTIES,'grid-template-columns','grid-template-rows','row-gap','column-gap','align-content','align-self'])copies[i].style.setProperty(property,computed.getPropertyValue(property));
   copies[i].style.visibility='visible';copies[i].style.animation='none';copies[i].style.transition='none';
   if(originals[i] instanceof HTMLImageElement){const response=await fetch(originals[i].currentSrc||originals[i].src);if(!response.ok)throw Error('Não foi possível carregar uma fotografia.');copies[i].src=await readData(await response.blob());copies[i].removeAttribute('srcset');}
   if(i%40===0)await pause();
  }
  clone.querySelectorAll('.iw-route-handle').forEach(node=>node.remove());
  clone.style.position='relative';clone.style.left='0';clone.style.top='0';clone.style.zoom='1';clone.style.transform='none';clone.style.margin='0';clone.style.overflow='visible';
  if(!Number.isFinite(left))throw Error('Adicione elementos ao quadro antes de exportar.');
  return {left:left-MARGIN,top:top-MARGIN,width:Math.ceil(right-left+MARGIN*2),height:Math.ceil(bottom-top+MARGIN*2),markup:new XMLSerializer().serializeToString(clone),nodes:board.querySelectorAll('.iw-node').length,links:board.querySelectorAll('.iw-connection').length};
 };
 window.renderBoardExportPng=async(plan,resolution=1)=>{
  const scale=Math.min(resolution,MAX_SIDE/plan.width,MAX_SIDE/plan.height,Math.sqrt(MAX_PIXELS/(plan.width*plan.height)));
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.floor(plan.width*scale));canvas.height=Math.max(1,Math.floor(plan.height*scale));
  const ctx=canvas.getContext('2d');if(!ctx)throw Error('Não foi possível reservar memória para a imagem.');
  try{
   for(let y=0;y<canvas.height;y+=TILE)for(let x=0;x<canvas.width;x+=TILE){
    const w=Math.min(TILE,canvas.width-x),h=Math.min(TILE,canvas.height-y);
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${plan.left+x/scale} ${plan.top+y/scale} ${w/scale} ${h/scale}"><rect x="${plan.left}" y="${plan.top}" width="${plan.width}" height="${plan.height}" fill="#0a0a0a"/><foreignObject x="0" y="0" width="${Math.max(plan.width+Math.abs(plan.left),2400)}" height="${Math.max(plan.height+Math.abs(plan.top),1600)}">${plan.markup}</foreignObject></svg>`;
    const image=new Image();image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);await image.decode();ctx.drawImage(image,x,y);image.src='';await pause();
   }
   const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('Falha ao gerar PNG.');return {blob,width:canvas.width,height:canvas.height,scale};
  }finally{canvas.width=canvas.height=1;}
 };
 window.exportBoardSummary=async(host,record)=>{
  const dialog=document.createElement('dialog');dialog.className='rename-icon-dialog board-export-dialog';dialog.innerHTML='<h2>Prévia do quadro completo</h2><p role="status">Preparando captura fiel…</p><label>Resolução<select aria-label="Resolução"><option value="1">1x</option><option value="2">2x</option><option value="3">3x</option></select></label><div class="board-export-preview"><img alt="Prévia integral do quadro investigativo"></div><p>O PNG preserva a geometria e os textos visíveis dos cartões. Para textos completos, utilize o relatório escrito.</p><button data-download disabled>Baixar PNG completo</button> <button data-close>Fechar</button>';document.body.append(dialog);dialog.showModal();
  let closed=false,url=null,result=null,busy=false;
  const status=dialog.querySelector('[role="status"]'),select=dialog.querySelector('select'),download=dialog.querySelector('[data-download]'),preview=dialog.querySelector('img');
  const pdf=document.createElement('button');pdf.type='button';pdf.textContent='Imprimir / Salvar PDF';pdf.disabled=true;download.after(pdf);
  dialog.querySelector('[data-close]').onclick=()=>dialog.close();dialog.onclose=()=>{closed=true;if(url)URL.revokeObjectURL(url);dialog.remove();};
  try{
   if(!host.createBoardExportSnapshot)throw Error('Abra uma investigação para exportar o quadro.');
   const plan=await host.createBoardExportSnapshot();if(closed)return;
   const generate=async()=>{if(busy||closed)return;busy=true;select.disabled=true;download.disabled=true;pdf.disabled=true;status.textContent='Gerando prévia completa…';try{const next=await renderBoardExportPng(plan,Number(select.value));if(closed)return;if(url)URL.revokeObjectURL(url);result=next;url=URL.createObjectURL(next.blob);preview.src=url;await preview.decode();status.textContent=`${plan.nodes} cartões · ${plan.links} vínculos · ${next.width} × ${next.height} px.`+(next.scale<Number(select.value)-.001?' Resolução limitada automaticamente para proteger a memória.':'');download.disabled=false;pdf.disabled=false;}catch(error){if(!closed)status.textContent=error.message;}finally{busy=false;select.disabled=false;}};
   select.onchange=generate;
   download.onclick=()=>{if(!result||!url||busy)return;const a=document.createElement('a');a.href=url;a.download='quadro-'+(record.name||'investigacao').replace(/[^a-z0-9]/gi,'-')+'.png';a.click();};
   pdf.onclick=async()=>{
    if(!result||!url||busy)return;const frame=document.createElement('iframe');frame.title='Impressão do quadro completo';frame.style.cssText='position:fixed;width:1px;height:1px;left:-10000px;border:0';document.body.append(frame);
    try{const doc=frame.contentDocument;doc.title='Quadro — '+(record.name||'Investigação');const style=doc.createElement('style');style.textContent=`@page{size:${result.width*.75}pt ${result.height*.75}pt;margin:0}html,body{margin:0;padding:0}img{display:block;width:100%;height:auto;print-color-adjust:exact}`;doc.head.append(style);const image=doc.createElement('img');image.src=url;image.alt='Quadro investigativo completo';doc.body.append(image);await image.decode();frame.contentWindow.addEventListener('afterprint',()=>frame.remove(),{once:true});frame.contentWindow.focus();frame.contentWindow.print();setTimeout(()=>frame.remove(),60000);}catch{frame.remove();status.textContent='Não foi possível abrir a impressão. Você ainda pode baixar o PNG.';}
   };
   await generate();
  }catch(error){if(!closed)status.textContent=error.message;}
 };
})();
