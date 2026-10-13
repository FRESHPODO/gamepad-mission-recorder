const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const elements=new Map();
const context={console,structuredClone,PointingCalibration:require('./pointing-calibration.js'),performance:{now:()=>0},devicePixelRatio:1,ResizeObserver:class{observe(){}},requestAnimationFrame(){},setTimeout(){},navigator:{getGamepads:()=>[]},window:{addEventListener(){}},document:{body:{classList:{toggle(){}}},getElementById(id){if(!elements.has(id))elements.set(id,{value:'',disabled:false,textContent:'',addEventListener(){},getBoundingClientRect:()=>({width:800,height:540}),getContext:()=>({setTransform(){}})});return elements.get(id);},addEventListener(){}}};
vm.createContext(context);vm.runInContext(fs.readFileSync('pointing.js','utf8'),context);
vm.runInContext(`
for(const [w,h] of [[294,220],[344,267],[404,337]]){const a=fittedAmplitude(w,h,40,'ring'),diameter=a/Math.sin(7*Math.PI/15);if(diameter+40+20>Math.min(w,h)+1e-8||a<100)throw Error('mobile targets overflow');}
if(selectionButton({id:'Nintendo Switch 2 Pro Controller'})!==1||selectionButton({id:'057e-2069'})!==1||selectionButton({id:'Xbox Wireless Controller'})!==0)throw Error('selection button mapping');
const ts=targets({task:'ring',amplitude:320});
const base={padMode:'position',deadzone:0,speed:500,task:'reciprocal',amplitude:320};
const absolute=movePad({x:100,y:100},.5,-.5,base,.01,800,540);
const absoluteLater=movePad({x:700,y:400},.5,-.5,base,2,800,540);
if(absolute.x!==480||absolute.y!==190||absoluteLater.x!==absolute.x||absoluteLater.y!==absolute.y)throw Error('position depends on time/history');
const doubled=movePad({x:0,y:0},.5,0,{...base,positionRadiusScale:2},1,800,540);if(doubled.x!==560||doubled.y!==270)throw Error('radius multiplier');const clipped=movePad({x:0,y:0},1,0,{...base,positionRadiusScale:2,amplitude:440},1,800,540);if(clipped.x!==800)throw Error('radius clipping');
for(const [w,h] of [[800,540],[1000,600],[320,240]]){const ring={...base,task:'ring',amplitude:180,positionRadiusScale:1},r=placementRadius(ring);for(let i=0;i<15;i++){const theta=-Math.PI/2+i*2*Math.PI/15,p=movePad({x:0,y:0},Math.cos(theta),Math.sin(theta),ring,.01,w,h);if(Math.abs(p.x-(w/2+r*Math.cos(theta)))>1e-8||Math.abs(p.y-(h/2+r*Math.sin(theta)))>1e-8)throw Error('maximum input does not reach target centers');}}
const calibrated=PointingCalibration.normalize(.8,0,{center:{x:0,y:0},range:{left:.8,right:.8,up:.8,down:.8}});const endpoint=movePad({x:0,y:0},calibrated.x,calibrated.y,{...base,deadzone:.1},.01,800,540);if(endpoint.x!==560)throw Error('physical measured endpoint fails target radius');
const center=movePad(absolute,0,0,base,.1,800,540);
if(center.x!==400||center.y!==270)throw Error('position release not centered');
const velocity={...base,padMode:'velocity'};
const step=movePad({x:100,y:100},1,0,velocity,.2,800,540);
const half=movePad({x:100,y:100},1,0,velocity,.1,800,540);
const twice=movePad(half,1,0,velocity,.1,800,540);
if(step.x!==200||twice.x!==step.x)throw Error('velocity integration');
if(movePad(step,0,0,velocity,1,800,540).x!==200)throw Error('velocity release');
if(movePad(step,.05,0,{...base,deadzone:.1},1,800,540).x!==400)throw Error('position deadzone');
if(movePad(step,.05,0,{...velocity,deadzone:.1},1,800,540).x!==200)throw Error('velocity deadzone');
const visited=new Set();let index=0;
for(let i=0;i<15;i++){visited.add(index);const next=(index+7)%15;if(Math.abs(Math.hypot(ts[index].x-ts[next].x,ts[index].y-ts[next].y)-320)>1e-8)throw Error('amplitude mismatch');index=next;}
if(visited.size!==15)throw Error('target sequence incomplete');
const result=summarize([-2,-1,0,1,2].map((axisError,i)=>({axisError,mtMs:1000,effectiveAmplitude:320,hit:i!==0})));
if(result.error!==20||Math.abs(result.we-4.133*Math.sqrt(2.5))>1e-8||!Number.isFinite(result.tp))throw Error('summary mismatch');
if(summarize(Array.from({length:5},()=>({axisError:0,mtMs:1000,effectiveAmplitude:320,hit:true}))).tp!==null)throw Error('zero SD');
run={settings:{device:'mouse',task:'ring',width:40,trials:5},targets:ts,index:0,rows:[],trajectory:[],previous:null,started:null,paused:false,practice:true};
cursor={...ts[0]};select(100);if(run.rows.length!==0)throw Error('initial selection counted');
cursor={x:0,y:0};select(1100);if(run.rows.length!==1||run.rows[0].hit||run.rows[0].mtMs!==1000||run.index!==14)throw Error('miss not recorded/advanced');
draw=()=>{};let virtualPress=true;
window.pointingVirtualPad={setEnabled(){},read:()=>({x:(ts[0].x-400)/placementRadius({task:'ring',amplitude:320}),y:(ts[0].y-270)/placementRadius({task:'ring',amplitude:320}),pressed:false,press:virtualPress,key:'Space'})};
run={settings:{device:'virtual',padMode:'position',deadzone:0,speed:500,task:'ring',amplitude:320,width:40,trials:5},targets:ts,index:0,rows:[],trajectory:[],previous:null,started:null,paused:false,practice:true};
frame(10);if(run.started!==10||run.index!==7||run.controller.mapping!=='virtual')throw Error('virtual input not connected to task');
virtualPress=false;frame(20);if(run.rows.length!==0||run.trajectory.at(-1).x!==cursor.x)throw Error('virtual duplicate press or missing trajectory');
run=null;$('device').value='gamepad';$('stick').value='left';
const physical={id:'Nintendo Switch test',mapping:'standard',axes:[.02,-.03,0,0]};calibrationTick(physical,0);$('calibrateCenter').onclick();
for(let i=1;i<=60;i++)calibrationTick(physical,i*20);
if(calibrationRun?.phase!=='ready')throw Error('center workflow');$('calibrateRange').onclick();
for(const [x,y] of [[.82,-.03],[-.73,-.03],[.02,-.73],[.02,.87]]){physical.axes=[x,y,0,0];calibrationTick(physical,1300);}
$('calibrateFinish').onclick();const savedCalibration=padCalibrations.get(calibrationKey(physical,'left'));
if(!savedCalibration||calibrationRun!==null||Math.abs(savedCalibration.range.right-.8)>1e-8)throw Error('range workflow');
`,context);
console.log('PASS: position mapping/time independence/release, velocity integration/release, both deadzones, ring amplitude/order, summary, zero-SD guard, first-hit exclusion, miss advancement/time');
