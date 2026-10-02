'use strict';
const sessionStore={
  async database(){return new Promise((resolve,reject)=>{const request=indexedDB.open('gamepad-recordings',1);request.onupgradeneeded=()=>request.result.createObjectStore('sessions');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});},
  async save(session){const db=await this.database();try{await new Promise((resolve,reject)=>{const tx=db.transaction('sessions','readwrite');tx.objectStore('sessions').put(session,'latest');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}finally{db.close();}},
  async load(){const db=await this.database();try{return await new Promise((resolve,reject)=>{const request=db.transaction('sessions').objectStore('sessions').get('latest');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}finally{db.close();}}
};
