// POST 01 — full brand block OR scrolling tickers.
// Brand block = title/year/info/footer + ARCI/top mark + partner logos.
(function(){
  state.logoBackground='none';
  state.showBrandBlock=true;

  // logo-style-overrides loads after patch.js, so this wraps the complete identity
  // function including the ARCI/top mark added there.
  const previousIdentity=drawIdentity;
  drawIdentity=function(){
    if(!state.showBrandBlock)return;
    return previousIdentity.apply(this,arguments);
  };

  const previousBuild=buildEditor;
  buildEditor=function(){
    previousBuild();
    const sections=[...document.querySelectorAll('#editor-panel .section')];
    const sec=sections.find(s=>/loghi/i.test(s.querySelector('.section-title')?.textContent||''));
    if(!sec||sec.querySelector('#logo-bg-mode'))return;

    const vis=document.createElement('div');vis.className='field';vis.id='logo-visibility';
    vis.innerHTML='<label style="display:flex;align-items:center;gap:7px"><input id="logo-band-on" type="checkbox" checked> VISUALIZZA BLOCCO IDENTITÀ</label>';
    vis.querySelector('input').onchange=e=>{
      state.showBrandBlock=e.target.checked;
      if(state.showBrandBlock){
        const ticker=document.getElementById('anim-ticker-on');
        if(ticker&&ticker.checked){ticker.checked=false;ticker.dispatchEvent(new Event('change'))}
      }
    };

    const field=document.createElement('div');field.className='field';field.id='logo-bg-mode';
    const label=document.createElement('label');label.textContent='SFONDO LOGHI';
    const select=document.createElement('select');
    select.innerHTML='<option value="none">NESSUNO</option><option value="white">BIANCO</option>';
    select.value=state.logoBackground;
    select.onchange=()=>state.logoBackground=select.value;
    field.append(label,select);
    sec.insertBefore(field,sec.firstChild.nextSibling);
    sec.insertBefore(vis,field);
  };

  drawLogoSlot=function(i,logoAmount,iconScale){
    if(!state.showBrandBlock)return;
    const d=66,x=[795,885,975][i],y=1297,icon=state.logoIcons[i]||['🍒','🍋','🍇'][i];
    push();translate(x,y);
    if(logoAmount<.98){push();scale(iconScale);noStroke();textAlign(CENTER,CENTER);textSize(54);text(icon,0,0);pop()}
    if(logoAmount>0){
      push();scale(logoAmount);
      if(state.logoBackground==='white'){noStroke();fill(COLORS.white);circle(0,0,d)}
      const img=state.logos[i];
      if(img){const m=state.logoBackground==='white'?d*.72:d*.92,s=min(m/img.width,m/img.height);imageMode(CENTER);image(img,0,0,img.width*s,img.height*s);imageMode(CORNER)}
      else{noStroke();fill(COLORS.black);textAlign(CENTER,CENTER);textFont('Helvetica');textStyle(BOLD);textSize(9);text(state.logoLabels[i],0,0)}
      pop();
    }
    pop();
  };
})();