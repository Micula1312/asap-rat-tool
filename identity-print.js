// Print-ready PDF export for every identity logo variant.
(function(){
  const logoCard=document.querySelector('.logo-card');
  if(!logoCard||typeof svgs==='undefined')return;

  const style=document.createElement('style');
  style.textContent='.print-panel{margin:0 0 20px;padding:12px;background:#fff;border:2px solid #050505;box-shadow:5px 5px 0 #ff61b6}.print-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.print-field label{display:block;margin-bottom:4px;font:900 9px Helvetica;text-transform:uppercase}.print-field input,.print-field select{width:100%;border:2px solid #050505;padding:8px;background:#fff;font:900 12px Helvetica}.print-status{margin-top:8px;font:800 10px/1.35 Helvetica}.buttons button.print{background:#ff61b6}@media(max-width:700px){.print-grid{grid-template-columns:1fr}}';
  document.head.appendChild(style);

  const panel=document.createElement('div');
  panel.className='print-panel';
  panel.innerHTML='<div class="variant-label">EXPORT PDF PER LA STAMPA</div><div class="print-grid"><div class="print-field"><label>Larghezza finale (cm)</label><input id="printWidthCm" type="number" min="5" max="500" step="1" value="100"></div><div class="print-field"><label>Risoluzione</label><select id="printDpi"><option value="72">72 DPI · cartellone distante</option><option value="150" selected>150 DPI · grande formato</option><option value="300">300 DPI · insegna ravvicinata</option></select></div><div class="print-field"><label>Sfondo PDF</label><select id="printBackground"><option value="transparent" selected>SENZA SFONDO</option><option value="white">BIANCO</option><option value="black">NERO</option></select></div></div><div class="print-status" id="printStatus">PDF alla misura reale · pronto per la stampa.</div>';
  logoCard.querySelector('.title').insertAdjacentElement('afterend',panel);

  const widthInput=panel.querySelector('#printWidthCm');
  const dpiInput=panel.querySelector('#printDpi');
  const backgroundInput=panel.querySelector('#printBackground');
  const status=panel.querySelector('#printStatus');
  const dimensions=svg=>{
    const doc=new DOMParser().parseFromString(svg,'image/svg+xml').documentElement;
    return {w:Number(doc.getAttribute('width')),h:Number(doc.getAttribute('height'))};
  };
  const updateStatus=()=>{
    const cm=Number(widthInput.value)||100,dpi=Number(dpiInput.value)||150,bg=backgroundInput.options[backgroundInput.selectedIndex].text;
    status.textContent=`PDF PER LA STAMPA · ${cm} cm · ${dpi} DPI · ${bg} · ${Math.round(cm/2.54*dpi).toLocaleString('it-IT')} px`;
  };
  widthInput.addEventListener('input',updateStatus);
  dpiInput.addEventListener('change',updateStatus);
  backgroundInput.addEventListener('change',updateStatus);

  function baseName(key){
    return `ex-casa-del-custode-logo-${key==='one'?'orizzontale':key==='two'?'due-righe':key==='ratOne'?'orizzontale-topo':key==='ratTwo'?'due-righe-topo':key==='editionTwo'?'due-righe-rat-edition':'rat-edition'}`;
  }
  async function deflate(bytes){
    if(typeof CompressionStream==='undefined')return {bytes,filter:''};
    const stream=new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate'));
    return {bytes:new Uint8Array(await new Response(stream).arrayBuffer()),filter:'/Filter /FlateDecode'};
  }
  async function makePrintPdf(canvas,widthMm,heightMm,transparent){
    if(transparent)return makeTransparentPrintPdf(canvas,widthMm,heightMm);
    const jpeg=canvas.toDataURL('image/jpeg',1).split(',')[1];
    const binary=atob(jpeg),imageBytes=new Uint8Array(binary.length);
    for(let i=0;i<binary.length;i++)imageBytes[i]=binary.charCodeAt(i);
    const encoder=new TextEncoder(),parts=[];let length=0;
    const offsets=[0];
    const pushText=value=>{const bytes=encoder.encode(value);parts.push(bytes);length+=bytes.length;};
    const pushBytes=bytes=>{parts.push(bytes);length+=bytes.length;};
    const object=(id,body)=>{offsets[id]=length;pushText(`${id} 0 obj\n${body}\nendobj\n`);};
    const widthPt=widthMm/25.4*72,heightPt=heightMm/25.4*72;
    pushText('%PDF-1.4\n%EXCASA\n');
    object(1,'<< /Type /Catalog /Pages 2 0 R >>');
    object(2,'<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
    object(3,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${widthPt.toFixed(3)} ${heightPt.toFixed(3)}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`);
    offsets[4]=length;pushText(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageBytes.length} >>\nstream\n`);pushBytes(imageBytes);pushText('\nendstream\nendobj\n');
    const content=`q\n${widthPt.toFixed(3)} 0 0 ${heightPt.toFixed(3)} 0 0 cm\n/Im0 Do\nQ\n`;
    object(5,`<< /Length ${encoder.encode(content).length} >>\nstream\n${content}endstream`);
    const xref=length;pushText('xref\n0 6\n0000000000 65535 f \n');
    for(let i=1;i<=5;i++)pushText(`${String(offsets[i]).padStart(10,'0')} 00000 n \n`);
    pushText(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
    return new Blob(parts,{type:'application/pdf'});
  }
  async function makeTransparentPrintPdf(canvas,widthMm,heightMm){
    const rgba=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
    const rgb=new Uint8Array(canvas.width*canvas.height*3),alpha=new Uint8Array(canvas.width*canvas.height);
    for(let p=0,r=0,a=0;p<rgba.length;p+=4){rgb[r++]=rgba[p];rgb[r++]=rgba[p+1];rgb[r++]=rgba[p+2];alpha[a++]=rgba[p+3];}
    const [color,mask]=await Promise.all([deflate(rgb),deflate(alpha)]);
    const encoder=new TextEncoder(),parts=[];let length=0;const offsets=[0];
    const pushText=value=>{const bytes=encoder.encode(value);parts.push(bytes);length+=bytes.length;};
    const pushBytes=bytes=>{parts.push(bytes);length+=bytes.length;};
    const object=(id,body)=>{offsets[id]=length;pushText(`${id} 0 obj\n${body}\nendobj\n`);};
    const streamObject=(id,dictionary,bytes)=>{offsets[id]=length;pushText(`${id} 0 obj\n<< ${dictionary} /Length ${bytes.length} >>\nstream\n`);pushBytes(bytes);pushText('\nendstream\nendobj\n');};
    const widthPt=widthMm/25.4*72,heightPt=heightMm/25.4*72;
    pushText('%PDF-1.4\n%EXCASA\n');
    object(1,'<< /Type /Catalog /Pages 2 0 R >>');
    object(2,'<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
    object(3,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${widthPt.toFixed(3)} ${heightPt.toFixed(3)}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 6 0 R >>`);
    streamObject(4,`/Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 ${color.filter} /SMask 5 0 R`,color.bytes);
    streamObject(5,`/Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceGray /BitsPerComponent 8 ${mask.filter}`,mask.bytes);
    const content=`q\n${widthPt.toFixed(3)} 0 0 ${heightPt.toFixed(3)} 0 0 cm\n/Im0 Do\nQ\n`;
    object(6,`<< /Length ${encoder.encode(content).length} >>\nstream\n${content}endstream`);
    const xref=length;pushText('xref\n0 7\n0000000000 65535 f \n');
    for(let i=1;i<=6;i++)pushText(`${String(offsets[i]).padStart(10,'0')} 00000 n \n`);
    pushText(`trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
    return new Blob(parts,{type:'application/pdf'});
  }
  function exportPrintPdf(key){
    const svg=svgs[key],source=dimensions(svg),cm=Math.max(5,Math.min(500,Number(widthInput.value)||100)),dpi=Number(dpiInput.value)||150,bg=backgroundInput.value;
    const pxW=Math.round(cm/2.54*dpi),pxH=Math.round(pxW*source.h/source.w),maxSide=12000,maxArea=bg==='transparent'?24000000:64000000;
    if(pxW>maxSide||pxH>maxSide||pxW*pxH>maxArea){alert(`Dimensione troppo grande per il browser (${pxW} × ${pxH} px). Riduci i centimetri o scegli 72/150 DPI.`);return;}
    status.textContent=`PREPARO PDF · ${pxW.toLocaleString('it-IT')} × ${pxH.toLocaleString('it-IT')} px…`;
    const img=new Image(),url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));
    img.onload=async()=>{
      const canvas=document.createElement('canvas');canvas.width=pxW;canvas.height=pxH;
      const ctx=canvas.getContext('2d',{alpha:bg==='transparent'});
      if(bg!=='transparent'){ctx.fillStyle=bg==="black"?'#000000':'#ffffff';ctx.fillRect(0,0,pxW,pxH);}
      ctx.drawImage(img,0,0,pxW,pxH);URL.revokeObjectURL(url);
      const widthMm=cm*10,heightMm=widthMm*source.h/source.w;
      try{
        const pdf=await makePrintPdf(canvas,widthMm,heightMm,bg==='transparent');
        dl(pdf,`${baseName(key)}-${cm}cm-${dpi}dpi-${bg}.pdf`);
        status.textContent=`✓ PDF STAMPA PRONTO · ${cm} cm · ${dpi} DPI · ${backgroundInput.options[backgroundInput.selectedIndex].text} · ${pxW.toLocaleString('it-IT')} × ${pxH.toLocaleString('it-IT')} px`;
      }catch(error){console.error(error);status.textContent='ERRORE CREAZIONE PDF';}
      finally{canvas.width=canvas.height=1;}
    };
    img.onerror=()=>{URL.revokeObjectURL(url);status.textContent='ERRORE CREAZIONE PDF';};
    img.src=url;
  }

  document.querySelectorAll('.logo-variants .buttons').forEach(buttons=>{
    const source=buttons.querySelector('[data-logo]');if(!source)return;
    const button=document.createElement('button');button.className='print';button.type='button';button.textContent='PDF · STAMPA';
    button.addEventListener('click',()=>exportPrintPdf(source.dataset.logo));buttons.appendChild(button);
  });
  updateStatus();
})();
