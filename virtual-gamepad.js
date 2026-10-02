'use strict';
(() => {
  const state = {enabled:false,rs:{x:0,y:0},rt:0};
  const enabled=document.getElementById('virtualEnabled');
  const stick=document.getElementById('rsStick');
  const knob=stick.querySelector('.stick-knob');
  const select=document.getElementById('rtKey');
  const held=new Set();
  let pointer=null,pendingRT=false;
  for(const [code,label] of [['Space','Space'],['KeyE','E'],['KeyQ','Q'],['Enter','Enter'],['ShiftRight','오른쪽 Shift']]) {
    const option=document.createElement('option');option.value=code;option.textContent=label;select.append(option);
  }
  function render() {
    knob.style.transform=`translate(${state.rs.x*60}px, ${state.rs.y*60}px)`;
    document.getElementById('rsValue').textContent=`X ${state.rs.x.toFixed(2)} / Y ${state.rs.y.toFixed(2)}`;
    const indicator=document.getElementById('rtIndicator');
    indicator.textContent=`RT · ${state.rt}`;indicator.classList.toggle('pressed',Boolean(state.rt));
    stick.classList.toggle('disabled',!state.enabled);
  }
  function reset() {pendingRT=false;held.clear();state.rs.x=state.rs.y=state.rt=0;pointer=null;render();}
  function move(event) {
    const rect=stick.getBoundingClientRect(),radius=rect.width/2-24;
    let x=(event.clientX-rect.left-rect.width/2)/radius,y=(event.clientY-rect.top-rect.height/2)/radius;
    const length=Math.hypot(x,y);if(length>1){x/=length;y/=length;}
    state.rs.x=x;state.rs.y=y;render();
  }
  enabled.addEventListener('change',()=>{state.enabled=enabled.checked;reset();document.getElementById('virtualHint').textContent=state.enabled?'RS를 누른 채 움직이세요. RT 키로 미션을 시작하거나 제출합니다.':'가상 게임패드 꺼짐 · 기존 게임패드와 방향키 / Enter 사용 가능';});
  select.addEventListener('change',reset);
  stick.addEventListener('pointerdown',event=>{if(!state.enabled||pointer!==null||event.button!==0)return;event.preventDefault();pointer=event.pointerId;stick.setPointerCapture(pointer);move(event);});
  stick.addEventListener('pointermove',event=>{if(event.pointerId===pointer)move(event);});
  function release(event){if(event.pointerId!==pointer)return;pointer=null;state.rs.x=state.rs.y=0;render();}
  for(const name of ['pointerup','pointercancel','lostpointercapture'])stick.addEventListener(name,release);
  window.addEventListener('keydown',event=>{
    if(!state.enabled||event.code!==select.value||event.target.closest('input,select,button,textarea,[contenteditable]'))return;
    event.preventDefault();if(!event.repeat)pendingRT=true;held.add(event.code);state.rt=1;render();
  });
  window.addEventListener('keyup',event=>{held.delete(event.code);state.rt=Number(held.has(select.value));render();});
  window.addEventListener('blur',reset);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)reset();});
  state.consumeRTPress=()=>{const pressed=pendingRT;pendingRT=false;return pressed;};
  state.snapshot=()=>({enabled:state.enabled,rs:{...state.rs},rt:state.rt,rtKey:select.value});
  window.virtualGamepad=state;render();
})();
