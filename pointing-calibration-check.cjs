const assert=require('node:assert/strict'),C=require('./pointing-calibration.js');
const c={center:{x:.02,y:-.03},range:{left:.75,right:.8,up:.7,down:.9}};
for(const [rawX,rawY,x,y]of [[.82,-.03,1,0],[-.73,-.03,-1,0],[.02,-.73,0,-1],[.02,.87,0,1],[.02,-.03,0,0]]){const p=C.normalize(rawX,rawY,c);assert(Math.abs(p.x-x)<1e-10);assert(Math.abs(p.y-y)<1e-10);}
assert.equal(C.rangeValid(c.range),true);assert.equal(C.rangeValid({...c.range,up:0}),false);assert.deepEqual(C.normalize(.8,0,null),{x:.8,y:0});
console.log('PASS: measured center and asymmetric endpoints map to 0 and +/-1; incomplete range rejected');
