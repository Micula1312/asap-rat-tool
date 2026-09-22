// Print-ready PDF export for every identity logo variant.
(function(){
  const logoCard=document.querySelector('.logo-card');
  if(!logoCard||typeof svgs==='undefined')return;

  const style=document.createElement('style');
  style.textContent='.print-panel{margin:0 0 20px;padding:12px;background:#fff;border:2px solid #050505;box-shadow:5px 5px 0 #ff61b6}.print-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.print-field label{display:block;margin-bottom:4px;font:900 9px Helvetica;text-transform:uppercase}.print-field input,.print-field select{width:100%;border:2px solid #050505;padding:8px;background:#fff;font:900 12px Helvetica}.print-status{margin-top:8px;font:800 10px/1.35 Helvetica}.buttons button.print{background:#ff61b6}@media(max-width:520px){.print-grid{grid-template-columns:1fr}}';
  document.head.appendChild(style);

  const panel=document.createElement('div');
  panel.className='print-panel';
  panel.innerHTML='<div class="variant-label">EXPORT PDF STAMPA</div><div class="print-grid"><div class="print-field"><label>Larghezza finale (cm)</label><input id="printWidthCm" type="number" min="5" max="500" step="1" value="100"></div><div class="print-field"><label>Risoluzione</label><select id="printDpi"><option value="72">72 DPI · cartellone distante</option><option value="150" selected>150 DPI · grande formato</option><option value="300">300 DPI · insegna ravvicinata</option></select></div></div><div class="print-status" id="printStatus">PDF alla misura reale · logo rasterizzato ad alta risoluzione per bloccare resa e colori.</div>';
  logoCard.querySelector('.title').insertAdjacentElement('afterend',panel);

  const widthInput=panel.querySelector('#printWidthCm');
  const dpiInput=panel.querySelector('#printDpi');
  const status=panel.querySelector('#printStatus');
  const dimensions=svg=>{
    const doc=new DOMParser().parseFromString(svg,'image/svg+xml').documentElement;
    return {w:Number(doc.getAttribute('width')),h:Number(doc.getAttribute('height'))};
  };
  const updateStatus=()=>{
    const cm=Number(widthInput.value)||100,dpi=Number(dpiInput.value)||150;
    status.textContent=`PDF alla misura reale · ${cm} cm · ${dpi} DPI · ${Math.round(cm/2.54*dpi).toLocaleString('it-IT')} px di larghezza`;
  };
  widthInput.addEventListener('input',updateStatus);
  dpiInput.addEventListener('change',updateStatus);

  function baseName(key){
    return `ex-casa-del-custode-logo-${key==='one'?'orizzontale':key==='two'?'due-righe':key==='ratOne'?'orizzontale-topo':key==='ratTwo'?'due-righe-topo':key==='editionTwo'?'due-righe-rat-edition':'rat-edition'}`;
  }
  function exportPrintPdf(key){
    if(!window.jspdf?.jsPDF){alert('Modulo PDF non disponibile. Ricarica la pagina e riprova.');return;}
    const svg=svgs[key],source=dimensions(svg),cm=Math.max(5,Math.min(500,Number(widthInput.value)||100)),dpi=Number(dpiInput.value)||150;
    const pxW=Math.round(cm/2.54*dpi),pxH=Math.round(pxW*source.h/source.w),maxSide=12000,maxArea=64000000;
    if(pxW>maxSide||pxH>maxSide||pxW*pxH>maxArea){alert(`Dimensione troppo grande per il browser (${pxW} × ${pxH} px). Riduci i centimetri o scegli 72/150 DPI.`);return;}
    status.textContent=`PREPARO PDF · ${pxW.toLocaleString('it-IT')} × ${pxH.toLocaleString('it-IT')} px…`;
    const img=new Image(),url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));
    img.onload=()=>{
      const canvas=document.createElement('canvas');canvas.width=pxW;canvas.height=pxH;
      const ctx=canvas.getContext('2d',{alpha:true});ctx.clearRect(0,0,pxW,pxH);ctx.drawImage(img,0,0,pxW,pxH);URL.revokeObjectURL(url);
      const widthMm=cm*10,heightMm=widthMm*source.h/source.w;
      const pdf=new window.jspdf.jsPDF({orientation:widthMm>=heightMm?'landscape':'portrait',unit:'mm',format:[widthMm,heightMm],compress:true,putOnlyUsedFonts:true});
      pdf.addImage(canvas.toDataURL('image/png'),'PNG',0,0,widthMm,heightMm,undefined,'FAST');
      pdf.setProperties({title:`EX CASA DEL CUSTODE · ${key}`,subject:`Logo stampa ${cm} cm · ${dpi} DPI`,creator:'EX CASA ID VISIVA'});
      pdf.save(`${baseName(key)}-${cm}cm-${dpi}dpi.pdf`);
      status.textContent=`✓ PDF PRONTO · ${cm} cm · ${dpi} DPI · ${pxW.toLocaleString('it-IT')} × ${pxH.toLocaleString('it-IT')} px`;
      canvas.width=canvas.height=1;
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
