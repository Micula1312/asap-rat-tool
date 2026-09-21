// POST 02 — selectable animation for the central editorial caption.
// No background patching: render() calls drawAnimatedCaption() directly.
(function(){
  const caption=document.getElementById('caption');
  if(!caption||typeof s==='undefined'||typeof x==='undefined')return;

  s.captionAnimation='float';
  s.captionColor='#050505';
  s.captionSize=44;

  const captionField=caption.closest('.field');
  const styleRow=document.createElement('div');
  styleRow.className='row';
  styleRow.innerHTML='<div class="field"><label>Colore scritta</label><input id="captionColor" type="color" value="#050505" style="height:38px;padding:3px;cursor:pointer"></div><div class="field"><label>Dimensione · <span id="captionSizeValue">44</span> px</label><input id="captionSize" type="range" min="18" max="120" step="1" value="44"></div>';
  captionField.insertAdjacentElement('afterend',styleRow);
  styleRow.querySelector('#captionColor').oninput=e=>s.captionColor=e.target.value;
  styleRow.querySelector('#captionSize').oninput=e=>{
    s.captionSize=Number(e.target.value);
    styleRow.querySelector('#captionSizeValue').textContent=e.target.value;
  };

  const section=document.createElement('div');
  section.className='section';
  section.id='caption-animation-panel';
  section.innerHTML='<div class="title">ANIMAZIONE NEW PROGRAMME!</div><div class="field"><label>Preset</label><select id="captionAnimation" style="width:100%;border:2px solid #050505;border-radius:0;padding:8px;background:#fff;color:#050505;font:900 12px Helvetica,Arial,sans-serif"><option value="static">STATIC</option><option value="float" selected>FLOAT</option><option value="wave">WAVE</option><option value="shake">SHAKE</option><option value="pulse">PULSE</option><option value="type">TYPE</option><option value="slide">SLIDE</option><option value="spin">SPIN</option></select></div><div class="hint">ANIMA SOLO LA STRINGA “NEW PROGRAMME!”</div>';
  const textSection=caption.closest('.section');
  textSection.insertAdjacentElement('afterend',section);
  section.querySelector('#captionAnimation').onchange=e=>s.captionAnimation=e.target.value;

  const ease=t=>1-Math.pow(1-Math.max(0,Math.min(1,t)),3);
  window.drawAnimatedCaption=function(now){
    const text=caption.value||'',mode=s.captionAnimation||'static';
    const local=s.playing?Math.max(0,now-s.started):now;
    let tx=W/2,ty=900,rot=0,sc=1,shown=text;
    if(mode==='float')ty+=Math.sin(local/520)*12;
    else if(mode==='shake'){tx+=Math.sin(local*.095)*7;ty+=Math.sin(local*.137)*4;rot=Math.sin(local*.081)*.018}
    else if(mode==='pulse')sc=1+Math.sin(local/300)*.075;
    else if(mode==='type')shown=s.playing?text.slice(0,Math.min(text.length,Math.floor(local/75))):text;
    else if(mode==='slide'&&s.playing){const p=ease(Math.min(1,local/850));tx=-320+(W/2+320)*p}
    else if(mode==='spin')rot=Math.sin(local/620)*.13;
    x.save();x.translate(tx,ty);x.rotate(rot);x.scale(sc,sc);x.textAlign='center';x.textBaseline='middle';x.font=`italic ${s.captionSize||44}px Times New Roman`;x.fillStyle=s.captionColor||'#050505';
    if(mode==='wave'){
      const chars=[...text],widths=chars.map(ch=>x.measureText(ch).width),total=widths.reduce((a,b)=>a+b,0);let px=-total/2;
      chars.forEach((ch,i)=>{const w=widths[i];x.fillText(ch,px+w/2,Math.sin(local/230+i*.7)*13);px+=w});
    }else x.fillText(shown,0,0);
    x.restore();
  };
})();
