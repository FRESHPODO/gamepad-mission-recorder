'use strict';
(() => {
  const stick=document.getElementById('virtualStick'),knob=stick.querySelector('.virtual-knob'),button=document.getElementById('virtualSelect'),key=document.getElementById('virtualKey');
  const state={x:0,y:0,pressed:false},keys=new Set();
  let enabled=false,stickPointer=null,buttonPointer=null,pending=false;
  function render(){
    const radius=Math.max(1,stick.getBoundingClientRect().width/2-24);
    knob.style.transform=`translate(${state.x*radius}px,${state.y*radius}px)`;
    document.getElementById('virtualValue').textContent=`X ${state.x.toFixed(2)} / Y ${state.y.toFixed(2)}`;
    state.pressed=buttonPointer!==null||keys.has(key.value);
    button.classList.toggle('pressed',state.pressed);button.setAttribute('aria-pressed',String(state.pressed));
  }
  function reset(){
    for(const [element,id] of [[stick,stickPointer],[button,buttonPointer]])if(id!==null&&element.hasPointerCapture(id))element.releasePointerCapture(id);
    stickPointer=buttonPointer=null;keys.clear();pending=false;state.x=state.y=state.pressed=0;render();
  }
  function move(event){
    const rect=stick.getBoundingClientRect(),radius=Math.max(1,rect.width/2-24);
    let x=(event.clientX-rect.left-rect.width/2)/radius,y=(event.clientY-rect.top-rect.height/2)/radius;
    const length=Math.hypot(x,y);if(length>1){x/=length;y/=length;}
    state.x=x;state.y=y;render();
  }
  stick.addEventListener('pointerdown',event=>{if(!enabled||stickPointer!==null||event.button!==0)return;event.preventDefault();stickPointer=event.pointerId;stick.setPointerCapture(stickPointer);move(event);});
  stick.addEventListener('pointermove',event=>{if(event.pointerId===stickPointer)move(event);});
  function releaseStick(event){if(event.pointerId!==stickPointer)return;stickPointer=null;state.x=state.y=0;render();}
  for(const name of ['pointerup','pointercancel','lostpointercapture'])stick.addEventListener(name,releaseStick);
  button.addEventListener('pointerdown',event=>{if(!enabled||buttonPointer!==null||event.button!==0)return;event.preventDefault();buttonPointer=event.pointerId;button.setPointerCapture(buttonPointer);pending=true;render();});
  function releaseButton(event){if(event.pointerId!==buttonPointer)return;buttonPointer=null;render();}
  for(const name of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(name,releaseButton);
  button.addEventListener('click',event=>{if(enabled&&event.detail===0)pending=true;});
  window.addEventListener('keydown',event=>{if(!enabled||event.code!==key.value||event.target.closest('input,select,button,textarea,[contenteditable]'))return;event.preventDefault();if(!event.repeat&&!keys.has(event.code))pending=true;keys.add(event.code);render();});
  window.addEventListener('keyup',event=>{keys.delete(event.code);render();});
  window.addEventListener('blur',reset);document.addEventListener('visibilitychange',()=>{if(document.hidden)reset();});key.addEventListener('change',reset);
  window.pointingVirtualPad={
    setEnabled(value){enabled=value;reset();stick.classList.toggle('disabled',!value);button.disabled=!value;},
    reset,
    read(){const press=pending;pending=false;return {x:state.x,y:state.y,pressed:Boolean(state.pressed),press,key:key.value};}
  };
  window.addEventListener('resize',render);render();
})();
