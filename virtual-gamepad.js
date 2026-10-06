'use strict';
(() => {
  const state = {enabled:false,rs:{x:0,y:0},rt:0};
  const enabled=document.getElementById('virtualEnabled');
  const stick=document.getElementById('rsStick');
  const knob=stick.querySelector('.stick-knob');
  const select=document.getElementById('rtKey');
  const rtTouch=document.getElementById('rtTouch');
  const mobile=window.matchMedia('(max-width: 760px), (pointer: coarse)');
  const held=new Set();
  let pointer=null,rtPointer=null,pendingRT=false;
  for(const [code,label] of [['Space','Space'],['KeyE','E'],['KeyQ','Q'],['Enter','Enter'],['ShiftRight','오른쪽 Shift']]) {
    const option=document.createElement('option');option.value=code;option.textContent=label;select.append(option);
  }
  function render() {
    const radius=stick.getBoundingClientRect().width/2-24;
    knob.style.transform=`translate(${state.rs.x*radius}px, ${state.rs.y*radius}px)`;
    document.getElementById('rsValue').textContent=`X ${state.rs.x.toFixed(2)} / Y ${state.rs.y.toFixed(2)}`;
    const indicator=document.getElementById('rtIndicator');
    indicator.textContent=`RT · ${state.rt}`;indicator.classList.toggle('pressed',Boolean(state.rt));
    stick.classList.toggle('disabled',!state.enabled);
    rtTouch.disabled=!state.enabled;
    rtTouch.classList.toggle('pressed',Boolean(state.rt));
    rtTouch.setAttribute('aria-pressed',String(Boolean(state.rt)));
  }
  function reset() {pendingRT=false;held.clear();state.rs.x=state.rs.y=state.rt=0;pointer=rtPointer=null;render();}
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
  rtTouch.addEventListener('pointerdown',event=>{
    if(!state.enabled||rtPointer!==null||event.button!==0)return;
    event.preventDefault();rtPointer=event.pointerId;rtTouch.setPointerCapture(rtPointer);
    pendingRT=true;state.rt=1;render();
  });
  function releaseRT(event){if(event.pointerId!==rtPointer)return;rtPointer=null;state.rt=Number(held.has(select.value));render();}
  for(const name of ['pointerup','pointercancel','lostpointercapture'])rtTouch.addEventListener(name,releaseRT);
  rtTouch.addEventListener('click',event=>{if(state.enabled&&event.detail===0){pendingRT=true;}});
  window.addEventListener('keydown',event=>{
    if(!state.enabled||event.code!==select.value||event.target.closest('input,select,button,textarea,[contenteditable]'))return;
    event.preventDefault();if(!event.repeat)pendingRT=true;held.add(event.code);state.rt=1;render();
  });
  window.addEventListener('keyup',event=>{held.delete(event.code);state.rt=Number(rtPointer!==null||held.has(select.value));render();});
  window.addEventListener('blur',reset);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)reset();});
  state.consumeRTPress=()=>{const pressed=pendingRT;pendingRT=false;return pressed;};
  state.snapshot=()=>({enabled:state.enabled,rs:{...state.rs},rt:state.rt,rtKey:select.value});
  function setMobileLayout(){
    document.body.classList.toggle('mobile-controls',mobile.matches);
    if(mobile.matches){enabled.checked=true;state.enabled=true;}
    reset();
    document.getElementById('virtualHint').textContent=mobile.matches?'왼쪽 RS로 이동 · 오른쪽 RT로 시작 / 제출':'RS를 누른 채 움직이세요. RT 키 또는 버튼으로 시작 / 제출합니다.';
  }
  mobile.addEventListener('change',setMobileLayout);
  window.addEventListener('resize',render);
  window.virtualGamepad=state;setMobileLayout();
})();
