// POST 02 — selectable animation for the central editorial caption.
// Drawn as a final caption layer so it is captured identically by preview, PNG and REC.
(function(){
  const panel=document.getElementById('panel');
  const caption=document.getElementById('caption');
  if(!panel||!caption||typeof s==='undefined'||typeof x==='undefined')return;

  s.captionAnimation='float';

  const field=caption.closest('.field');
  if(field){
    const wrap=document.createElement('div');
    wrap.className='field';
    wrap.innerHTML='<label>Animazione scritta</label><select id="captionAnimation" style="width:100%;border:2px solid #050505;border-radius:0;padding:7px 8px;background:#fff;color:#050505;font:800 13px Helvetica,Arial,sans-serif;outline:none"><option value="static">STATIC</option><option value="float" selected>FLOAT</option><option value="wave">WAVE</option><option value="shake">SHAKE</option><option value="pulse">PULSE</option><option value="type">TYPE</option><option value="slide">SLIDE</option><option value="spin">SPIN</option></select>';
    field.insertAdjacentElement('afterend',wrap);
    wrap.querySelector('select').onchange=e=>s.captionAnimation=e.target.value;
  }

  function easeOutCubic(t){return 1-Math.pow(1-Math.max(0,Math.min(1,t)),3)}
  function drawCaption(now){
    const text=caption.value||'';
    const mode=s.captionAnimation||'static';
    const local=s.playing?Math.max(0,now-s.started):now;
    let tx=W/2,ty=900,rot=0,sc=1,shown=text;

    if(mode==='float') ty+=Math.sin(local/520)*12;
    else if(mode==='shake') {tx+=Math.sin(local*.095)*7;ty+=Math.sin(local*.137)*4;rot=Math.sin(local*.081)*.018}
    else if(mode==='pulse') sc=1+Math.sin(local/300)*.075;
    else if(mode==='type') {
      const n=Math.min(text.length,Math.floor(local/75));
      shown=text.slice(0,n);
    }
    else if(mode==='slide') {
      const p=easeOutCubic(Math.min(1,local/850));
      tx=-320+(W/2+320)*p;
    }
    else if(mode==='spin') rot=Math.sin(local/620)*.13;

    x.save();
    x.translate(tx,ty);x.rotate(rot);x.scale(sc,sc);
    x.textAlign='center';x.textBaseline='middle';x.font='italic 44px Times New Roman';x.fillStyle='#050505';
    if(mode==='wave'){
      let widths=[...text].map(ch=>x.measureText(ch).width),total=widths.reduce((a,b)=>a+b,0),px=-total/2;
      [...text].forEach((ch,i)=>{const w=widths[i];x.fillText(ch,px+w/2,Math.sin(local/230+i*.7)*13);px+=w});
    }else x.fillText(shown,0,0);
    x.restore();
  }

  // The base renderer still paints the static caption. Cover only its small caption zone
  // with the already-painted canvas background, then redraw the selected animated version.
  // This stays intentionally narrow to avoid touching the icon or popup composition.
  const raf=window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame=function(cb){
    return raf(function(t){
      cb(t);
      // Repaint the caption after the base frame. A compact clear using the current BG is
      // sufficient because the Montagnola dot structure does not occupy this caption zone densely.
      x.save();x.fillStyle=s.bg;x.fillRect(250,850,580,105);x.restore();
      drawCaption(performance.now());
    });
  };
})();