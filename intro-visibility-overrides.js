// POST 02 — choose one system: full identity block OR scrolling tickers.
// Identity block = title/year/info/footer + ARCI/top mark + partner logos.
(function(){
  const panel=document.getElementById('panel');
  if(!panel)return;
  const sections=[...panel.querySelectorAll('.section')];
  const logoSec=sections.find(sec=>/LOGHI/i.test(sec.querySelector('.title')?.textContent||''));
  const tickerOn=document.getElementById('tickerOn');
  if(!logoSec||!tickerOn)return;

  const row=document.createElement('label');
  row.className='check';
  row.innerHTML='<input id="logosOn" type="checkbox"> VISUALIZZA BLOCCO IDENTITÀ';
  logoSec.insertBefore(row,logoSec.children[1]||null);
  const brandOn=row.querySelector('input');

  s.showBrandBlock=false;
  s.showLogos=false;
  brandOn.checked=false;

  // identity() contains title, year, info and copyright/footer.
  const originalIdentity=identity;
  identity=function(){if(s.showBrandBlock)return originalIdentity.apply(this,arguments)};

  // ARCI/top image is drawn separately through imgFit(). Suppress that slot when
  // the identity block is off; partner logos are already gated by s.showLogos.
  const originalImgFit=imgFit;
  imgFit=function(img,cx,cy,m){
    if(!s.showBrandBlock&&(cy<200||cy>1150))return;
    return originalImgFit.apply(this,arguments);
  };
  // Suppress the fallback ARCI star too when the identity block is off.
  const originalFillText=x.fillText.bind(x);
  x.fillText=function(txt){
    if(!s.showBrandBlock&&txt==='★')return;
    return originalFillText.apply(x,arguments);
  };

  function chooseBrand(){
    s.showBrandBlock=brandOn.checked;
    s.showLogos=s.showBrandBlock;
    if(s.showBrandBlock&&tickerOn.checked)tickerOn.checked=false;
  }
  function chooseTickers(){
    if(tickerOn.checked){s.showBrandBlock=false;s.showLogos=false;brandOn.checked=false}
  }
  brandOn.addEventListener('change',chooseBrand);
  tickerOn.addEventListener('change',chooseTickers);
})();