// Procedural Montagnola retinatura — the ONLY decorative dot system.
// Squared abstraction of the park plan, built on the same 24px movement grid.
(function(){
  function dottedMontagnola(){
    push();
    const cx=540,cy=665,step=24;
    noStroke();fill(5,5,5,72);
    [168,264,360].forEach(r=>{
      for(let x=cx-r;x<=cx+r;x+=step){circle(x,cy-r,5);circle(x,cy+r,5)}
      for(let y=cy-r+step;y<cy+r;y+=step){circle(cx-r,y,5);circle(cx+r,y,5)}
    });
    for(let d=-360;d<=360;d+=step){circle(cx+d,cy,4.5);circle(cx,cy+d,4.5)}
    for(let d=-264;d<=264;d+=step){circle(cx+d,cy+d,4);circle(cx+d,cy-d,4)}
    for(let r=48;r<=96;r+=24){
      for(let a=0;a<Math.PI*2;a+=Math.PI/8){
        const px=Math.round((cx+Math.cos(a)*r)/step)*step;
        const py=Math.round((cy+Math.sin(a)*r)/step)*step;
        circle(px,py,5.5);
      }
    }
    pop();
  }
  window.drawMontagnolaDots=dottedMontagnola;

  // Old Pac-Man blocked-cell dots are no longer drawn: the Montagnola retinatura
  // is now the single meaningful dotted layer. GRID.blocked still exists internally
  // for routing, so rat movement behaviour is not changed.
  if(typeof window.drawBlockedDots==='function') window.drawBlockedDots=function(){};
  try{ drawBlockedDots=function(){}; }catch(e){}

  ['drawFinalComposition','drawAnimatedSequence'].forEach(name=>{
    const original=window[name];if(typeof original!=='function')return;
    window[name]=function(){dottedMontagnola();return original.apply(this,arguments)};
  });
})();