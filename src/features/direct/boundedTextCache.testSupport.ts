/** Immutable text only; account conservatively for UTF-16 storage. */
export class BoundedTextCache {
 private entries=new Map<string,string>();
 private bytes=0;
 private budget:number;
 private limit:number;
 constructor(budget=64*1024*1024,limit=12){this.budget=budget;this.limit=limit;}
 private cost(key:string,value:string){return 2*(key.length+value.length);}
 get(key:string){
  const value=this.entries.get(key);
  if(value!==undefined){this.entries.delete(key);this.entries.set(key,value);}
  return value;
 }
 set(key:string,value:string){
  const previous=this.entries.get(key);
  if(previous!==undefined){this.bytes-=this.cost(key,previous);this.entries.delete(key);}
  const cost=this.cost(key,value);if(cost>this.budget||this.limit<1)return;
  while(this.entries.size&&(this.bytes+cost>this.budget||this.entries.size>=this.limit)){
   const oldest=this.entries.keys().next().value!;const old=this.entries.get(oldest)!;
   this.entries.delete(oldest);this.bytes-=this.cost(oldest,old);
  }
  this.entries.set(key,value);this.bytes+=cost;
 }
}
