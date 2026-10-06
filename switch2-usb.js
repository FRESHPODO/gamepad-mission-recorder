'use strict';
// Protocol reference: https://github.com/ndeadly/switch2_controller_research/blob/master/commands.md
// Only volatile USB initialisation/report selection; no flash or pairing writes.
(() => {
  const button=document.getElementById('connectSwitch2'),status=document.getElementById('usbStatus');
  let device=null,busy=false;
  const show=text=>{status.textContent=text;};
  async function close(){if(device?.opened){try{await device.close();}catch{}}device=null;}
  async function command(outEndpoint,inEndpoint,subcommand,payload){
    const packet=new Uint8Array([3,0x91,0,subcommand,0,payload.length,0,0,...payload]);
    const result=await device.transferOut(outEndpoint,packet);
    if(result.status!=='ok')throw new Error(`USB 명령 전송 실패: ${result.status}`);
    let timer;
    try{
      const reply=await Promise.race([
        device.transferIn(inEndpoint,64),
        new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('USB 응답 시간 초과 · 케이블을 다시 연결하고 다른 패드 프로그램을 종료하세요.')),2000);})
      ]);
      if(reply.status!=='ok'||!reply.data||reply.data.byteLength<8)throw new Error('USB 응답이 올바르지 않습니다.');
      const data=reply.data;
      if(data.getUint8(0)!==3||data.getUint8(1)!==1||data.getUint8(3)!==subcommand||data.getUint8(5)!==0xf8)throw new Error(`USB 초기화 거부 · 응답 ${Array.from(new Uint8Array(data.buffer,data.byteOffset,data.byteLength)).map(v=>v.toString(16).padStart(2,'0')).join(' ')}`);
    }finally{clearTimeout(timer);}
  }
  button.addEventListener('click',async()=>{
    if(busy)return;
    if(!window.isSecureContext||!navigator.usb){show('Chrome에서 http://localhost 주소 또는 HTTPS로 열어주세요.');return;}
    busy=true;button.disabled=true;
    let stage='장치 선택';
    try{
      await close();
      device=await navigator.usb.requestDevice({filters:[{vendorId:0x057e,productId:0x2069}]});
      stage='USB 열기';show(stage+' 중…');await device.open();
      if(!device.configuration)await device.selectConfiguration(1);
      const iface=device.configuration.interfaces.find(i=>i.interfaceNumber===1);
      const alternate=iface?.alternates.find(a=>a.endpoints.some(e=>e.direction==='out'&&e.type==='bulk')&&a.endpoints.some(e=>e.direction==='in'&&e.type==='bulk'));
      if(!alternate)throw new Error('Switch 2 USB 통신 인터페이스를 찾지 못했습니다.');
      stage='USB 인터페이스 확보';await device.claimInterface(1);
      if(iface.alternate.alternateSetting!==alternate.alternateSetting)await device.selectAlternateInterface(1,alternate.alternateSetting);
      const out=alternate.endpoints.find(e=>e.direction==='out'&&e.type==='bulk').endpointNumber;
      const input=alternate.endpoints.find(e=>e.direction==='in'&&e.type==='bulk').endpointNumber;
      stage='USB 입력 초기화';show(stage+' 중…');
      await command(out,input,0x0d,[1,0,255,255,255,255,255,255]);
      stage='게임패드 입력 형식 선택';await command(out,input,0x0a,[9,0,0,0]);
      stage='HID 입력 활성화';await command(out,input,3,[1,0,0,0]);
      show('USB 초기화 완료 · A 버튼을 누르고 아래 입력값을 확인하세요. 감지되지 않으면 진단 내용을 복사해 알려주세요.');
    }catch(error){
      show(error.name==='NotFoundError'?'장치 선택을 취소했습니다.':`${stage} 실패: ${error.message}${stage==='USB 인터페이스 확보'?' · Steam과 외부 연결 도구를 닫고 USB를 다시 연결하세요.':''}`);
    }finally{await close();busy=false;button.disabled=false;}
  });
  navigator.usb?.addEventListener('disconnect',event=>{if(event.device.productId===0x2069)show('Switch 2 USB가 분리되었습니다. 다시 연결한 뒤 USB 연결 버튼을 누르세요.');});
})();
