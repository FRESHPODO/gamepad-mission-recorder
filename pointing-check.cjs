const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const elements=new Map();
const context={console,performance:{now:()=>0},devicePixelRatio:1,ResizeObserver:class{observe(){}},requestAnimationFrame(){},setTimeout(){},navigator:{getGamepads:()=>[]},window:{addEventListener(){}},document:{body:{classList:{toggle(){}}},getElementById(id){if(!elements.has(id))elements.set(id,{value:'',disabled:false,textContent:'',addEventListener(){},getBoundingClientRect:()=>({width:800,height:540}),getContext:()=>({setTransform(){}})});return elements.get(id);},addEventListener(){}}};
vm.createContext(context);vm.runInContext(fs.readFileSync('pointing.js','utf8'),context);
vm.runInContext(`
for(const [w,h] of [[294,220],[344,267],[404,337]]){const a=fittedAmplitude(w,h,40,'ring'),diameter=a/Math.sin(7*Math.PI/15);if(diameter+40+20>Math.min(w,h)+1e-8||a<100)throw Error('mobile targets overflow');}
if(selectionButton({id:'Nintendo Switch 2 Pro Controller'})!==1||selectionButton({id:'057e-2069'})!==1||selectionButton({id:'Xbox Wireless Controller'})!==0)throw Error('selection button mapping');
const ts=targets({task:'ring',amplitude:320});
const base={padMode:'position',deadzone:0,speed:500};
const absolute=movePad({x:100,y:100},.5,-.5,base,.01,800,540);
const absoluteLater=movePad({x:700,y:400},.5,-.5,base,2,800,540);
if(absolute.x!==600||absolute.y!==135||absoluteLater.x!==absolute.x||absoluteLater.y!==absolute.y)throw Error('position depends on time/history');
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
window.pointingVirtualPad={read:()=>({x:(ts[0].x-400)/400,y:(ts[0].y-270)/270,pressed:false,press:virtualPress,key:'Space'})};
run={settings:{device:'virtual',padMode:'position',deadzone:0,speed:500,task:'ring',width:40,trials:5},targets:ts,index:0,rows:[],trajectory:[],previous:null,started:null,paused:false,practice:true};
frame(10);if(run.started!==10||run.index!==7||run.controller.mapping!=='virtual')throw Error('virtual input not connected to task');
virtualPress=false;frame(20);if(run.rows.length!==0||run.trajectory.at(-1).x!==cursor.x)throw Error('virtual duplicate press or missing trajectory');
`,context);
console.log('PASS: position mapping/time independence/release, velocity integration/release, both deadzones, ring amplitude/order, summary, zero-SD guard, first-hit exclusion, miss advancement/time');
