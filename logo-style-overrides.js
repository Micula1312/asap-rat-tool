// Shared logo treatment: transparent by default, optional white disc, never a black stroke.
(function(){
  state.logoBackground='none';
  const previousBuild=buildEditor;
  buildEditor=function(){
    previousBuild();
    const sections=[...document.querySelectorAll('#editor-panel .section')];
    const sec=sections.find(s=>/loghi/i.test(s.querySelector('.section-title')?.textContent||''));
    if(!sec||sec.querySelector('#logo-bg-mode'))return;
    const field=document.createElement('div');field.className='field';field.id='logo-bg-mode';
    const label=document.createElement('label');label.textContent='SFONDO LOGHI';
    const select=document.createElement('select');
    select.innerHTML='<option value="none">NESSUNO</option><option value="white">BIANCO</option>';
    select.value=state.logoBackground;
    select.onchange=()=>state.logoBackground=select.value;
    field.append(label,select);sec.insertBefore(field,sec.firstChild.nextSibling);
  };

  drawLogoSlot=function(i,logoAmount,iconScale){
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