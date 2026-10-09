const encoder=new TextEncoder();
const hex=(bytes:Uint8Array)=>Array.from(bytes,b=>b.toString(16).padStart(2,"0")).join("");
async function derive(password:string,salt:Uint8Array){
 const key=await crypto.subtle.importKey("raw",encoder.encode(password),"PBKDF2",false,["deriveBits"]);
 const bits=await crypto.subtle.deriveBits({name:"PBKDF2",salt:salt as BufferSource,iterations:100000,hash:"SHA-256"},key,256);
 return new Uint8Array(bits);
}
export async function hashDeletionPassword(password:string){
 const salt=crypto.getRandomValues(new Uint8Array(16));
 return `pbkdf2:${hex(salt)}:${hex(await derive(password,salt))}`;
}
export async function verifyDeletionPassword(password:string,stored:string){
 const [version,saltHex,hashHex]=stored.split(":");
 if(version!=="pbkdf2"||!saltHex||!hashHex||!/^[a-f0-9]{32}$/.test(saltHex)||!/^[a-f0-9]{64}$/.test(hashHex))return false;
 const salt=new Uint8Array(saltHex.match(/../g)!.map(v=>parseInt(v,16)));
 const computed=hex(await derive(password,salt));let difference=0;
 for(let i=0;i<hashHex.length;i++)difference|=computed.charCodeAt(i)^hashHex.charCodeAt(i);
 return difference===0;
}
