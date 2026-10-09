import { CanvasTexture, LinearFilter, RepeatWrapping } from './vendor/three/three.min.mjs';

// Rasterized locally from public-domain Natural Earth land polygons.
// Red channel: land. Green channel: subtle latitude/longitude graticule.
export function createEarthTexture(onReady){
  const map=document.createElement('canvas');map.width=2048;map.height=1024;
  const ctx=map.getContext('2d');
  ctx.fillStyle='#000';ctx.fillRect(0,0,map.width,map.height);
  const texture=new CanvasTexture(map);
  texture.wrapS=RepeatWrapping;texture.minFilter=LinearFilter;texture.magFilter=LinearFilter;
  function draw(data){
    ctx.fillStyle='#000';ctx.fillRect(0,0,map.width,map.height);
    ctx.fillStyle='#ff0000';
    for(const feature of data.features){
      const polygons=feature.geometry.type==='Polygon'?[feature.geometry.coordinates]:feature.geometry.coordinates;
      for(const polygon of polygons){
        ctx.beginPath();
        for(const ring of polygon){
          ring.forEach(([lon,lat],i)=>{
            const x=(lon+180)/360*map.width,y=(90-lat)/180*map.height;
            if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
          });
          ctx.closePath();
        }
        ctx.fill('evenodd');
      }
    }
    ctx.globalCompositeOperation='lighten';ctx.strokeStyle='#003900';ctx.lineWidth=1.2;
    ctx.beginPath();
    for(let lon=-180;lon<=180;lon+=30){const x=(lon+180)/360*map.width;ctx.moveTo(x,0);ctx.lineTo(x,map.height);}
    for(let lat=-60;lat<=60;lat+=30){const y=(90-lat)/180*map.height;ctx.moveTo(0,y);ctx.lineTo(map.width,y);}
    ctx.stroke();ctx.globalCompositeOperation='source-over';
    texture.needsUpdate=true;onReady();
  }
  let disposed=false;
  const controller=new AbortController();
  fetch(new URL('./earth-land.geojson',import.meta.url),{signal:controller.signal})
    .then(response=>{if(!response.ok)throw new Error(`Map request failed: ${response.status}`);return response.json();})
    .then(data=>{if(!disposed)draw(data);})
    .catch(error=>{if(!disposed)console.warn('Earth coastline data unavailable.',error.message);});
  return {texture,dispose(){disposed=true;controller.abort();texture.dispose();}};
}
