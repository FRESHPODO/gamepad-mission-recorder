'use strict';
// Dedicated store: pointing data does not overwrite the mission recorder's replay.
const pointingStore={
  async database(){return new Promise((resolve,reject)=>{const request=indexedDB.open('fitts-pointing-recordings',1);request.onupgradeneeded=()=>request.result.createObjectStore('snapshots');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});},
  async save(data){const db=await this.database();try{await new Promise((resolve,reject)=>{const tx=db.transaction('snapshots','readwrite');tx.objectStore('snapshots').put({savedAt:new Date().toISOString(),data},'latest');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}finally{db.close();}},
  async load(){const db=await this.database();try{return await new Promise((resolve,reject)=>{const request=db.transaction('snapshots').objectStore('snapshots').get('latest');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}finally{db.close();}}
};
