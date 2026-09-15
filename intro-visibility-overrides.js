// POST 02 — visibility controls: either logo band or scrolling tickers.
(function(){
  const panel=document.getElementById('panel');
  if(!panel)return;
  const sections=[...panel.querySelectorAll('.section')];
  const logoSec=sections.find(sec=>/LOGHI/i.test(sec.querySelector('.title')?.textContent||''));
  const tickerOn=document.getElementById('tickerOn');
  if(!logoSec||!tickerOn)return;

  const row=document.createElement('label');
  row.className='check';
  row.innerHTML='<input id="logosOn" type="checkbox"> VISUALIZZA LOGHI';
  logoSec.insertBefore(row,logoSec.children[1]||null);
  const logosOn=row.querySelector('input');

  // Strisce are already ON by default, so logos start OFF.
  s.showLogos=false;
  logosOn.checked=false;

  function chooseLogos(){
    s.showLogos=logosOn.checked;
    if(s.showLogos&&tickerOn.checked){tickerOn.checked=false}
  }
  function chooseTickers(){
    if(tickerOn.checked){s.showLogos=false;logosOn.checked=false}
  }
  logosOn.addEventListener('change',chooseLogos);
  tickerOn.addEventListener('change',chooseTickers);

  // Hide the original logo band by masking its area only when logos are OFF.
  // Run immediately after each canvas paint; when tickers are ON their bottom band
  // remains the final layer, so the two systems never visually compete.
  const originalRAF=window.requestAnimationFrame.bind(window);
  let painting=false;
  window.requestAnimationFrame=function(cb){
    return originalRAF(function(t){
      cb(t);
      if(painting||s.showLogos)return;
      painting=true;
      const ctx=c.getContext('2d');
      // Logos sit around y=1250. Restore only the zone above the bottom ticker.
      // If tickers are off, repaint with current background + dots is intentionally
      // avoided here: instead use a clipped redraw from the canvas just above it.
      if(!tickerOn.checked){
        ctx.save();ctx.fillStyle=s.bg;ctx.fillRect(748,1208,276,84);ctx.restore();
      }
      painting=false;
    });
  };
})();