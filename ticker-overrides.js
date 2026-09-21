// Edge tickers for POST ANIMATO 01.
// Safe version: NEVER replaces p5 draw().
(function(){
  const TICKER_H=58;
  const tickerState={enabled:false,top:'EX CASA DEL CUSTODE',bottom:'ASAP — CUSTODIA — BOLOGNA — ALTRI NOMI',speed:85};
  function drawTicker(textValue,y,dir){push();noStroke();fill('#050505');rect(0,y,BASE_W,TICKER_H);textFont('Helvetica');textStyle(BOLD);textSize(27);fill('#ffffff');textAlign(LEFT,CENTER);const unit=((textValue||'—').trim()||'—')+'   ✦   ';const tw=max(120,textWidth(unit));const off=((millis()/1000*tickerState.speed)%tw+tw)%tw;for(let q=-tw*2;q<BASE_W+tw*2;q+=tw)text(unit,q+(dir>0?off:-off),y+TICKER_H/2);pop()}
  function drawEdgeTickers(){if(!tickerState.enabled)return;drawTicker(tickerState.top,0,1);drawTicker(tickerState.bottom,BASE_H-TICKER_H,-1)}
  ['drawFinalComposition','drawAnimatedSequence','drawStrobeFinal'].forEach(name=>{const original=window[name];if(typeof original!=='function')return;window[name]=function(){const result=original.apply(this,arguments);drawEdgeTickers();return result}});
  window.addEventListener('load',()=>{
    const panel=document.getElementById('editor-panel');if(!panel)return;
    const section=document.createElement('div');section.className='section';
    section.innerHTML='<div class="section-title">STRISCE SCORREVOLI</div><div class="field"><label style="display:flex;align-items:center;gap:7px"><input id="anim-ticker-on" type="checkbox"> VISUALIZZA STRISCE</label></div><div class="field"><label>Testo sopra →</label><input id="anim-ticker-top" value="EX CASA DEL CUSTODE"></div><div class="field"><label>Testo sotto ←</label><input id="anim-ticker-bottom" value="ASAP — CUSTODIA — BOLOGNA — ALTRI NOMI"></div><div class="field"><label>Velocità</label><input id="anim-ticker-speed" type="range" min="20" max="220" step="5" value="85"></div>';
    const controls=panel.querySelector('.control-row')?.closest('.section');if(controls)controls.insertAdjacentElement('afterend',section);else panel.appendChild(section);
    section.querySelector('#anim-ticker-on').onchange=e=>{tickerState.enabled=e.target.checked;if(tickerState.enabled){state.showBrandBlock=false;const brand=document.getElementById('logo-band-on');if(brand)brand.checked=false}};
    section.querySelector('#anim-ticker-top').oninput=e=>tickerState.top=e.target.value;
    section.querySelector('#anim-ticker-bottom').oninput=e=>tickerState.bottom=e.target.value;
    section.querySelector('#anim-ticker-speed').oninput=e=>tickerState.speed=+e.target.value;
    state.showBrandBlock=false;const brand=document.getElementById('logo-band-on');if(brand)brand.checked=false;
  });
})();