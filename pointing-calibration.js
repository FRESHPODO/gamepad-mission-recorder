'use strict';
(function(root){
  function normalize(x,y,c){
    if(!c)return {x,y};
    const dx=x-c.center.x,dy=y-c.center.y;
    return {x:Math.max(-1,Math.min(1,dx/(dx>=0?c.range.right:c.range.left))),y:Math.max(-1,Math.min(1,dy/(dy>=0?c.range.down:c.range.up)))};
  }
  function rangeValid(range){return ['left','right','up','down'].every(k=>Number.isFinite(range[k])&&range[k]>=.25);}
  const api={normalize,rangeValid};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PointingCalibration=api;
})(typeof globalThis!=='undefined'?globalThis:this);
