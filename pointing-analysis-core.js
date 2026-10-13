'use strict';
(function(root){
  const finite=v=>typeof v==='number'&&Number.isFinite(v),mean=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:null;
  const sd=a=>{if(a.length<2)return null;const m=mean(a);return Math.sqrt(a.reduce((s,v)=>s+(v-m)**2,0)/(a.length-1));};
  const round=v=>finite(v)?Math.round(v*1e6)/1e6:v;
  function basic(rows){
    const mt=mean(rows.map(r=>r.mtMs)),errors=rows.filter(r=>!r.hit).length,axis=rows.map(r=>r.axisError),we=sd(axis)===null?null:4.133*sd(axis),ae=rows.every(r=>finite(r.effectiveAmplitude))?mean(rows.map(r=>r.effectiveAmplitude)):null;
    const ide=we>0&&ae>0?Math.log2(ae/we+1):null;
    return {n:rows.length,mt,mtSD:sd(rows.map(r=>r.mtMs)),errorRate:rows.length?errors/rows.length*100:null,errors,axisBias:mean(axis),lateralBias:mean(rows.map(r=>r.lateralError)),endpointError:mean(rows.map(r=>r.endpointError)),sd:sd(axis),we,ae,ide,tp:rows.length>=5&&ide!==null&&mt>0?ide/(mt/1000):null};
  }
  function pathMetrics(row,samples,start,maxGap=100){
    if(!start||!finite(start.x)||!finite(start.y))return {reason:'시작 선택 좌표 없음'};
    if(samples.some(p=>!finite(p.t)||!finite(p.x)||!finite(p.y)))return {reason:'잘못된 동선 좌표'};
    let ps=samples.filter(p=>p.t>=0&&p.t<=row.mtMs).sort((a,b)=>a.t-b.t);
    if(ps.filter(p=>p.t>0&&p.t<row.mtMs).length<1)return {reason:'중간 동선 표본 없음'};
    ps=[{t:0,...start},...ps,{t:row.mtMs,x:row.x,y:row.y}].filter((p,i,a)=>!i||p.t!==a[i-1].t||p.x!==a[i-1].x||p.y!==a[i-1].y);
    if(ps.length<3)return {reason:'동선 표본 3개 미만'};
    let gap=0,length=0;for(let i=1;i<ps.length;i++){gap=Math.max(gap,ps[i].t-ps[i-1].t);length+=Math.hypot(ps[i].x-ps[i-1].x,ps[i].y-ps[i-1].y);}
    if(gap>maxGap)return {reason:`표본 간격 ${maxGap} ms 초과`};
    const ux=(row.targetX-row.fromX)/row.amplitude,uy=(row.targetY-row.fromY)/row.amplitude;
    const lateral=ps.map(p=>-(p.x-row.fromX)*uy+(p.y-row.fromY)*ux),along=ps.map(p=>(p.x-row.fromX)*ux+(p.y-row.fromY)*uy);
    let entries=0,inside=false;for(const p of ps){const next=Math.hypot(p.x-row.targetX,p.y-row.targetY)<=row.width/2;if(next&&!inside)entries++;inside=next;}
    const changes=values=>{let count=0,sign=0,extreme=values[0];for(let i=1;i<values.length;i++){const delta=values[i]-extreme;if(!sign){if(Math.abs(delta)>=.5){sign=Math.sign(delta);extreme=values[i];}}else if(sign*delta>=0)extreme=values[i];else if(Math.abs(delta)>=.5){count++;sign=-sign;extreme=values[i];}}return count;};
    let crossings=0,sign=0;for(const value of lateral){if(Math.abs(value)<.5)continue;const next=Math.sign(value);if(sign&&sign!==next)crossings++;sign=next;}
    const straight=Math.hypot(row.x-start.x,row.y-start.y);
    return {samples:ps.length,maxGap:gap,tre:Math.max(0,entries-1),mdc:changes(lateral),odc:changes(along),tac:crossings,mv:sd(lateral),me:mean(lateral.map(Math.abs)),mo:mean(lateral),length,efficiency:length>0?Math.min(1,straight/length):null};
  }
  function regression(points){
    if(new Set(points.map(p=>round(p.id))).size<3)return {reason:'서로 다른 ID 조건이 3개 이상 필요합니다.',n:points.length};
    const xs=points.map(p=>p.id),ys=points.map(p=>p.mt),xm=mean(xs),ym=mean(ys),sxx=xs.reduce((s,x)=>s+(x-xm)**2,0),b=xs.reduce((s,x,i)=>s+(x-xm)*(ys[i]-ym),0)/sxx,a=ym-b*xm;
    const sse=xs.reduce((s,x,i)=>s+(ys[i]-a-b*x)**2,0),sst=ys.reduce((s,y)=>s+(y-ym)**2,0);
    return {n:points.length,a,b,r2:sst>0?1-sse/sst:null,rmse:Math.sqrt(sse/points.length),points};
  }
  function analyze(sources,options={}){
    const groups=new Map(),seen=new Set(),report={files:sources.length,sessions:0,duplicates:0,excludedSessions:0,invalidRows:0,issues:[]};
    for(const source of sources){if(!source.data||!Array.isArray(source.data.sessions)) {report.issues.push(`${source.name}: 포인팅 sessions 형식이 아닙니다.`);continue;}
      for(const session of source.data.sessions){
        if(!session||!session.settings||!Array.isArray(session.rows)){report.issues.push(`${source.name}: 세션 구조 오류`);continue;}
        const signature=JSON.stringify(session);if(seen.has(signature)){report.duplicates++;continue;}seen.add(signature);report.sessions++;
        if(session.practice||session.status!=='completed'&&!options.includeInterrupted){report.excludedSessions++;continue;}
        const s=session.settings,z=session.size||{},controller=session.controller?.id||'unknown',policy=source.data.selectionPolicy||'unknown';
        const meta={participant:s.participant||'unknown',device:s.device||'unknown',padMode:s.padMode||'none',task:s.task||'unknown',speed:s.padMode==='velocity'?s.speed:null,deadzone:s.device==='mouse'?null:s.deadzone,stick:s.device==='mouse'?null:s.stick,virtualKey:s.virtualKey||null,screenWidth:z.width??null,screenHeight:z.height??null,dpr:z.dpr??null,controller,controllerButton:session.controller?.button??null,positionRadiusScale:s.padMode==='position'?(s.positionRadiusScale??null):null,positionMapping:s.padMode==='position'?(s.positionMapping||'unknown'):'not-applicable',policy};
        // Missing metadata is isolated instead of silently pooling incompatible records.
        const missing=!s.participant||!s.device||!s.task||!finite(z.width)||!finite(z.height)||!finite(z.dpr)||(s.device==='gamepad'&&controller==='unknown')||(s.device!=='mouse'&&(!finite(s.deadzone)||!s.stick||(s.padMode==='velocity'&&!finite(s.speed))));
        const baseKey=JSON.stringify(meta)+(missing?`:${source.name}:${session.startedAt}:${report.sessions}`:'');
        const samples=new Map();for(const p of Array.isArray(session.trajectory)?session.trajectory:[]){if(!p||!Number.isInteger(p.trial))continue;const bucket=samples.get(p.trial)||[];bucket.push(p);samples.set(p.trial,bucket);}
        let previous=session.initialSelection||null;
        for(const raw of session.rows){
          if(!raw||!['fromX','fromY','targetX','targetY','x','y','mtMs','width'].every(k=>finite(raw[k]))||raw.mtMs<=0||raw.width<=0){report.invalidRows++;previous=null;continue;}
          const amplitude=Math.hypot(raw.targetX-raw.fromX,raw.targetY-raw.fromY);if(amplitude<=0){report.invalidRows++;previous=null;continue;}
          const ux=(raw.targetX-raw.fromX)/amplitude,uy=(raw.targetY-raw.fromY)/amplitude,ex=raw.x-raw.targetX,ey=raw.y-raw.targetY;
          const start=finite(raw.startX)&&finite(raw.startY)?{x:raw.startX,y:raw.startY}:previous&&finite(previous.x)&&finite(previous.y)?previous:null;
          const axisError=ex*ux+ey*uy;
          const row={...raw,amplitude,id:Math.log2(amplitude/raw.width+1),axisError,lateralError:-ex*uy+ey*ux,endpointError:Math.hypot(ex,ey),hit:Math.hypot(ex,ey)<=raw.width/2,effectiveAmplitude:finite(raw.effectiveAmplitude)?raw.effectiveAmplitude:start?amplitude+axisError-((start.x-raw.fromX)*ux+(start.y-raw.fromY)*uy):null};
          const key=baseKey+JSON.stringify([round(amplitude),round(raw.width)]);
          if(!groups.has(key))groups.set(key,{key,baseKey,meta,amplitude:round(amplitude),width:round(raw.width),rows:[],paths:[],pathExclusions:{},sources:new Set(),sessions:new Set()});const group=groups.get(key);
          group.rows.push(row);group.sources.add(source.name);group.sessions.add(signature);
          const ps=samples.get(raw.trial)||[];
          const legacy=s.device!=='mouse'&&ps.length&&!ps.some(p=>finite(p.rawX))&&ps.every(p=>Math.abs(p.x)<=1&&Math.abs(p.y)<=1);
          const result=legacy?{reason:'구버전 스틱값/화면좌표 혼합'}:pathMetrics(row,ps,start,options.maxGap||100);
          if(result.reason)group.pathExclusions[result.reason]=(group.pathExclusions[result.reason]||0)+1;else group.paths.push(result);
          previous={x:raw.x,y:raw.y};
        }
      }
    }
    const conditions=Array.from(groups.values()).map(g=>{
      const pathSummary={};for(const k of ['tre','mdc','odc','tac','mv','me','mo','length','efficiency'])pathSummary[k]=mean(g.paths.map(p=>p[k]).filter(finite));
      return {...g,rows:undefined,paths:undefined,sources:Array.from(g.sources),sessions:g.sessions.size,id:Math.log2(g.amplitude/g.width+1),summary:basic(g.rows),pathN:g.paths.length,pathSummary};
    });
    const models=new Map();for(const g of conditions){if(!models.has(g.baseKey))models.set(g.baseKey,{meta:g.meta,conditions:[]});models.get(g.baseKey).conditions.push(g);}
    const regressions=Array.from(models.values()).map(m=>({...m,fit:regression(m.conditions.map(c=>({id:c.id,mt:c.summary.mt,amplitude:c.amplitude,width:c.width,n:c.summary.n})))}));
    return {report,conditions,regressions,options:{includeInterrupted:Boolean(options.includeInterrupted),maxGap:options.maxGap||100}};
  }
  function demo(){
    const sessions=[];for(const amplitude of [120,240,360])for(let block=0;block<2;block++){
      const s={settings:{participant:'DEMO',device:'mouse',padMode:'none',task:'reciprocal',amplitude,width:30},size:{width:800,height:540,dpr:1},status:'completed',startedAt:`demo-${amplitude}-${block}`,rows:[],trajectory:[],initialSelection:{x:100,y:200}};let previous={...s.initialSelection};
      for(let i=0;i<6;i++){const left=i%2===0,fromX=left?100:100+amplitude,targetX=left?100+amplitude:100,error=[-4,-2,0,2,4,1][i],x=targetX+error,y=200,mtMs=120+220*Math.log2(amplitude/30+1),ux=left?1:-1;
        s.rows.push({trial:i+1,fromX,fromY:200,targetX,targetY:200,x,y,startX:previous.x,startY:previous.y,width:30,mtMs,effectiveAmplitude:amplitude+error*ux-(previous.x-fromX)*ux});
        for(let j=0;j<=50;j++){const q=j/50;s.trajectory.push({trial:i+1,t:q*mtMs,x:previous.x+(x-previous.x)*q,y:200+3*Math.sin(q*Math.PI)});}previous={x,y};
      }sessions.push(s);
    }return {version:3,selectionPolicy:'advance-on-every-selection; first hit excluded',sessions};
  }
  const api={analyze,basic,pathMetrics,regression,demo};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PointingAnalysis=api;
})(typeof globalThis!=='undefined'?globalThis:this);
