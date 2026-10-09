// Periodic in t for every scroll/time value, including both endpoint tangents.
// Scrolling changes the twist and silhouette but never cuts the loop open.
export const RIBBON_STRANDS = 32;

// Three mesh bands form each wider strand. Real negative space between the
// 32 strands remains readable instead of stacking 96 subpixel slits.
export function ribbonCoordinate(band,side){
  const strand=Math.floor(band/3),local=(band%3+side)/3;
  const width=.50+.08*Math.sin(strand*2.39996);
  return -1+2*(strand+(1-width)/2+local*width)/RIBBON_STRANDS;
}

export const RIBBON_GLSL = `
  vec3 shape(float t,float v){
    float phase=uScroll*0.9;
    float angle=t+uScroll*0.18*sin(t*2.0);
    float wave=sin(t*3.0+uTime*0.28)*0.025;
    float radius=2.18+0.16*cos(t*3.0)+v*(0.70+uScroll*0.10)*cos(t*2.0+phase)+wave;
    return vec3(radius*cos(angle),radius*sin(angle),v*0.82*sin(t*2.0+phase)+0.19*sin(t*3.0)+uScroll*0.18*sin(t*2.0));
  }
`;

export function ribbonPoint(t,v,scroll=0,time=0){
  const phase=scroll*.9,angle=t+scroll*.18*Math.sin(t*2);
  const wave=Math.sin(t*3+time*.28)*.025;
  const radius=2.18+.16*Math.cos(t*3)+v*(.70+scroll*.10)*Math.cos(t*2+phase)+wave;
  return [radius*Math.cos(angle),radius*Math.sin(angle),v*.82*Math.sin(t*2+phase)+.19*Math.sin(t*3)+scroll*.18*Math.sin(t*2)];
}
