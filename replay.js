'use strict';
const $=id=>document.getElementById(id),canvas=$('canvas'),ctx=canvas.getContext('2d');
let session={version:1,records:[]},replay=null,playing=false,position=0,frameIndex=0,last=performance.now();
function notice(message){$('notice').textContent=message;}
function validateSession(data){
  if(data?.version!==1||!Array.isArray(data.records))throw Error('버전 1 기록 JSON을 선택하세요.');
  for(const r of data.records){
    if(!Number.isInteger(r.mission)||!definitions[r.mission]||!Number.isFinite(r.durationMs)||r.durationMs<0||!Number.isFinite(r.errorRate)||!Array.isArray(r.samples)||!r.samples.length)throw Error('미션 기록 형식이 올바르지 않습니다.');
    if(r.path!==undefined&&(!Array.isArray(r.path)||r.path.length<2||r.path.some(p=>!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite))))throw Error('경로 형식이 올바르지 않습니다.');
    let previous=-1;
    for(const s of r.samples){
      if(!['t','x','y','rawX','rawY','inputX','inputY'].every(k=>Number.isFinite(s[k]))||s.t<0||s.t<previous||s.t>r.durationMs||!Array.isArray(s.bars)||s.bars.some(b=>!Number.isFinite(b.spawnMs)||!Number.isFinite(b.gap))||(s.rt!==undefined&&(!Number.isFinite(s.rt)||s.rt<0||s.rt>1)))throw Error('입력 표본 형식이 올바르지 않습니다.');
      previous=s.t;
    }
  }
  return data;
}
function setSession(data){
  session=validateSession(data);$('record').replaceChildren();$('resultList').replaceChildren();
  session.records.forEach((r,i)=>{
    const option=document.createElement('option');option.value=i;option.textContent=`${i+1}. ${r.name}`;$('record').append(option);
    const row=document.createElement('div');row.className='result';row.textContent=`${i+1}. ${r.name} · ${(r.durationMs/1000).toFixed(1)}초 · ${r.success?'성공':'실패'}`;$('resultList').append(row);
  });
  selectRecord(0);notice(session.records.length?'Space 재생 / 정지 · Q 이전 프레임 · W 다음 프레임':'저장된 미션이 없습니다. JSON을 불러오세요.');
}
function selectRecord(index){
  replay=session.records[index]??null;playing=false;position=0;frameIndex=0;
  $('seek').max=Math.max(0,(replay?.samples.length??1)-1);$('seek').value=0;
  $('title').textContent=replay?.name??'기록을 선택하세요';$('description').textContent=replay?definitions[replay.mission].description:'저장한 JSON을 불러오세요.';
  for(const id of ['play','back','forward','seek'])$(id).disabled=!replay;
  render();
}
function indexAt(time){let lo=0,hi=replay.samples.length-1;while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(replay.samples[mid].t<=time)lo=mid;else hi=mid-1;}return lo;}
function togglePlay(){if(!replay)return;if(!playing&&position>=replay.durationMs){position=0;frameIndex=0;}playing=!playing;last=performance.now();render();}
function stepFrame(delta){if(!replay)return;playing=false;frameIndex=Math.max(0,Math.min(replay.samples.length-1,frameIndex+delta));position=replay.samples[frameIndex].t;render();}
function render(){
  $('play').textContent=playing?'정지 · Space':'재생 · Space';
  if(!replay){ctx.clearRect(0,0,W,H);$('status').textContent='기록 대기';return;}
  // Pass the selected frame explicitly so duplicate timestamps remain individually accessible.
  drawMission({replay,position,session,frameIndex});
  const s=replay.samples[frameIndex],x=Math.max(-1,Math.min(1,s.rawX)),y=Math.max(-1,Math.min(1,s.rawY));
  $('replayKnob').style.transform=`translate(${x*60}px, ${y*60}px)`;
  $('rsValue').textContent=`X ${s.rawX.toFixed(2)} / Y ${s.rawY.toFixed(2)}`;
  const rt=s.rt??(s.virtualGamepad?.enabled?s.virtualGamepad.rt:undefined);
  $('rtIndicator').textContent=rt===undefined?'RT · 기록 없음':`RT · ${rt.toFixed(2)}`;
  $('rtIndicator').classList.toggle('pressed',rt!==undefined&&rt>.5);
  const source={virtual:'가상 패드',gamepad:'실제 패드',keyboard:'키보드'}[s.inputSource]??'이전 기록';
  $('inputDetails').textContent=`${source} · 프레임 ${frameIndex+1} / ${replay.samples.length} · 적용 X ${s.inputX.toFixed(2)} / Y ${s.inputY.toFixed(2)}`;
  $('status').textContent=playing?'재생 중':'정지';$('seek').value=frameIndex;
  $('time').textContent=`${(position/1000).toFixed(3)} / ${(replay.durationMs/1000).toFixed(3)}초`;
}
$('record').onchange=()=>selectRecord(Number($('record').value));
$('play').onclick=togglePlay;$('back').onclick=()=>stepFrame(-1);$('forward').onclick=()=>stepFrame(1);
$('seek').oninput=()=>{if(!replay)return;playing=false;frameIndex=Number($('seek').value);position=replay.samples[frameIndex].t;render();};
window.addEventListener('keydown',event=>{
  if(event.target.closest('input,select,textarea,[contenteditable]'))return;
  if(!['Space','KeyQ','KeyW'].includes(event.code))return;
  event.preventDefault();if(event.code==='Space'){if(!event.repeat)togglePlay();}else stepFrame(event.code==='KeyQ'?-1:1);
});
document.addEventListener('visibilitychange',()=>{if(document.hidden){playing=false;render();}last=performance.now();});
$('upload').onchange=async event=>{const file=event.target.files[0];if(!file)return;try{setSession(JSON.parse(await file.text()));}catch(error){notice(error.message);}event.target.value='';};
function frame(now){const dt=now-last;last=now;if(replay&&playing&&!document.hidden){position=Math.min(replay.durationMs,position+dt);frameIndex=indexAt(position);if(position>=replay.durationMs)playing=false;render();}requestAnimationFrame(frame);}
selectRecord(0);requestAnimationFrame(frame);
sessionStore.load().then(data=>{if(data)setSession(data);else notice('JSON을 불러오거나 녹화 페이지에서 기록을 전달하세요.');}).catch(()=>notice('저장한 JSON을 불러오세요.'));
