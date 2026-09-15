// Procedural Montagnola retinatura — no image asset.
// A squared abstraction of the park plan, built only from grid dots.
(function(){
  function dottedMontagnola(){
    push();
    const cx=540,cy=665,step=24;
    noStroke();fill(5,5,5,72);
    // square concentric rings: abstract the circular Montagnola into the project's grid language
    [168,264,360].forEach(r=>{
      for(let x=cx-r;x<=cx+r;x+=step){circle(x,cy-r,5);circle(x,cy+r,5)}
      for(let y=cy-r+step;y<cy+r;y+=step){circle(cx-r,y,5);circle(cx+r,y,5)}
    });
    // four main radial/axial paths
    for(let d=-360;d<=360;d+=step){circle(cx+d,cy,4.5);circle(cx,cy+d,4.5)}
    // diagonal access paths, quantised to the same grid
    for(let d=-264;d<=264;d+=step){circle(cx+d,cy+d,4);circle(cx+d,cy-d,4)}
    // central clearing/fountain marker
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

  // Add it to all existing map render branches without replacing p5 draw().
  ['drawFinalComposition','drawAnimatedSequence'].forEach(name=>{
    const original=window[name];if(typeof original!=='function')return;
    window[name]=function(){dottedMontagnola();return original.apply(this,arguments)};
  });
})();