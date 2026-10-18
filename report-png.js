(() => {
window.exportCaseReportPng=async(record,typeNames)=>{
 const width=1200,height=1600,margin=70,lineHeight=29;
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
 const ctx=canvas.getContext('2d');const pages=[];let y=0,page=0;
 ctx.font='21px Arial';
 function wrap(text){const lines=[];for(const paragraph of String(text??'').split('\n')){let line='';for(const char of paragraph){if(ctx.measureText(line+char).width>width-margin*2){lines.push(line);line='';}line+=char;}lines.push(line);}return lines;}
 const entries=[['CASO',record.name],['Código',record.code||'—'],['Status',({active:'Ativo',priority:'Prioridade',archived:'Arquivado',closed:'Encerrado'})[record.status]||record.status],['Classificação',record.classification==='illegal'?'Ilegal':'Legal'],['Briefing',record.description||'Sem briefing.'],['EVIDÊNCIAS',record.evidenceNotes||'Nenhuma anotação de evidências.']];
 for(const item of record.elements||[])entries.push([`${typeNames[item.type]||'Elemento'} — ${item.name}`,`${item.code||'Sem identificação'} · ${item.status||'Em análise'}\n${item.notes||'Sem observações.'}`]);
 if(record.links?.length){entries.push(['VÍNCULOS','']);for(const link of record.links){const from=record.elements?.find(item=>item.id===link.from),to=record.elements?.find(item=>item.id===link.to);entries.push(['',`${from?.name||'Elemento'} → ${link.label} → ${to?.name||'Elemento'}`]);}}
 for(const folder of record.folders||[])entries.push(['PASTA — '+folder.name,folder.notes||'Sem observações.']);
 function start(){page++;ctx.fillStyle='#111113';ctx.fillRect(0,0,width,height);ctx.fillStyle='#eeeeee';ctx.font='bold 28px Arial';ctx.fillText('BLACKHEARTS',margin,75);ctx.font='14px Arial';ctx.fillStyle='#999';ctx.fillText('RELATÓRIO DE INVESTIGAÇÃO',margin,104);ctx.fillText(new Date().toLocaleString('pt-BR'),margin,130);ctx.fillStyle='#555';ctx.fillRect(margin,150,width-margin*2,1);y=195;}
 async function finish(){ctx.font='14px Arial';ctx.fillStyle='#888';ctx.fillText('Developed by Sakai',margin,height-40);ctx.textAlign='right';ctx.fillText('Página '+page,width-margin,height-40);ctx.textAlign='left';const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('Não foi possível gerar o PNG.');pages.push(blob);}
 start();
 for(const [title,text] of entries){ctx.font='21px Arial';const lines=wrap(text);if(y+70>height-95){await finish();start();}if(title){ctx.fillStyle='#eee';ctx.font='bold 21px Arial';for(const part of wrap(title)){if(y+lineHeight>height-95){await finish();start();}ctx.fillText(part,margin,y);y+=lineHeight;}y+=5;}ctx.font='21px Arial';ctx.fillStyle='#bdbdbd';for(const line of lines){if(y+lineHeight>height-95){await finish();start();ctx.font='21px Arial';ctx.fillStyle='#bdbdbd';}ctx.fillText(line,margin,y);y+=lineHeight;}y+=20;}
 await finish();
 const filename='relatorio-'+record.name.replace(/[^a-z0-9]/gi,'-');
 function download(index){const url=URL.createObjectURL(pages[index]),a=document.createElement('a');a.href=url;a.download=filename+(pages.length>1?'-pagina-'+(index+1):'')+'.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);}
 if(pages.length===1){download(0);return;}
 const dialog=document.createElement('dialog');dialog.className='rename-icon-dialog';const title=document.createElement('h2');title.textContent='Relatório PNG · '+pages.length+' páginas';dialog.append(title);pages.forEach((_,index)=>{const button=document.createElement('button');button.type='button';button.textContent='Baixar página '+(index+1);button.style.margin='5px';button.onclick=()=>download(index);dialog.append(button);});const close=document.createElement('button');close.textContent='Fechar';close.onclick=()=>dialog.close();dialog.append(close);dialog.onclose=()=>dialog.remove();document.body.append(dialog);dialog.showModal();
};
})();
