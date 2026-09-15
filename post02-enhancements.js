// POST 02 UI/render enhancements. Loaded after the inline composer.
(function(){
  const $=id=>document.getElementById(id), panel=$('panel'), canvas=$('c');
  if(!panel||!canvas)return;
  const caption=$('caption');
  if(caption){
    const field=caption.closest('.field');
    const anim=document.createElement('div');anim.className='field';
    anim.innerHTML='<label>Animazione scritta</label><select id="captionAnim" style="width:100%;border:2px solid #050505;padding:7px 8px;background:#fff;font:800 13px Helvetica"><option value="float">FLOAT</option><option value="static">STATIC</option><option value="wave">WAVE</option><option value="shake">SHAKE</option><option value="pulse">PULSE</option><option value="type">TYPE</option><option value="slide">SLIDE</option><option value="spin">SPIN</option></select>';
    field.insertAdjacentElement('afterend',anim);
  }
  const logoTitle=[...panel.querySelectorAll('.title')].find(n=>n.textContent.trim()==='LOGHI');
  if(logoTitle){
    const field=document.createElement('div');field.className='field';field.innerHTML='<label>Sfondo loghi</label><select id="logoBg" style="width:100%;border:2px solid #050505;padding:7px 8px;background:#fff;font:800 13px Helvetica"><option value="none">NESSUNO</option><option value="white">BIANCO</option></select>';
    logoTitle.insertAdjacentElement('afterend',field);
  }

  // Overlay only the caption with animation; cover the original caption area first using current bg.
  const ctx=canvas.getContext('2d'), oldRAF=window.requestAnimationFrame.bind(window);
  function animatedCaption(){
    const sel=$('captionAnim');if(!sel||!caption)return;
    const mode=sel.value, now=performance.now(), t=(now-(window.s?.started||0))/1000, text=caption.value;
    // redraw a small clean band behind the original caption; subtle enough to preserve the dot field.
    ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#050505';ctx.font='italic 44px Times New Roman';
    let dx=0,dy=0,rot=0,sc=1,alpha=1,out=text;
    if(mode==='float')dy=Math.sin(now/650)*12;
    else if(mode==='wave'){dy=Math.sin(now/300)*9;rot=Math.sin(now/520)*.035}
    else if(mode==='shake'){dx=(Math.random()-.5)*10;dy=(Math.random()-.5)*8;rot=(Math.random()-.5)*.025}
    else if(mode==='pulse')sc=1+Math.sin(now/330)*.10;
    else if(mode==='type'){const q=Math.max(0,Math.min(1,t/1.25));out=text.slice(0,Math.ceil(text.length*q))}
    else if(mode==='slide'){const q=Math.max(0,Math.min(1,t/.8));dx=(1-q)*-520;alpha=q}
    else if(mode==='spin')rot=Math.sin(now/500)*.12;
    ctx.translate(540+dx,900+dy);ctx.rotate(rot);ctx.scale(sc,sc);ctx.globalAlpha=alpha;ctx.fillText(out,0,0);ctx.restore();
  }
  // draw after the main canvas frame without replacing its render lifecycle.
  function overlayLoop(){animatedCaption();oldRAF(overlayLoop)}oldRAF(overlayLoop);
})();