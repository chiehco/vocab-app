export const PLAZA_SIZE = 6;
export const DECORATIONS = [
  {id:'plant',name:'小盆栽',width:1,height:1,price:30},
  {id:'flowerbed',name:'花圃',width:2,height:1,price:60},
  {id:'bench',name:'長椅',width:2,height:1,price:90},
  {id:'lamp',name:'路燈',width:1,height:1,price:150},
  {id:'fountain',name:'小噴泉',width:2,height:2,price:240},
] as const;
export type DecorationSku = typeof DECORATIONS[number]['id'];
export type DecorationItem = typeof DECORATIONS[number];
export type DecorationTown = 'LV1/1' | 'LV4/17';
export interface PlazaPosition {x:number;y:number}
export interface DecorationPlacement extends PlazaPosition {town:DecorationTown}
/** One permanent ownership receipt per purchase; returning to storage only removes placement. */
export interface OwnedDecoration {
  id:string; sku:DecorationSku; pricePaid:number; purchasedAt:number;
  placement?:DecorationPlacement;
}
export const decorationFor = (sku:string) => DECORATIONS.find(item=>item.id===sku);
export const decorationAsset = (sku:DecorationSku) => `${import.meta.env.BASE_URL}town/decorations/${sku}.svg`;
export const isDecorationTown = (value:unknown):value is DecorationTown => value==='LV1/1' || value==='LV4/17';
export function covers(item:DecorationItem,position:PlazaPosition,x:number,y:number) {
  return x>=position.x && x<position.x+item.width && y>=position.y && y<position.y+item.height;
}
export function placementError(item:DecorationItem,position:PlazaPosition,town:DecorationTown,owned:readonly OwnedDecoration[],excludeId?:string):string|null {
  if(!Number.isInteger(position.x)||!Number.isInteger(position.y)||position.x<0||position.y<0
    ||position.x+item.width>PLAZA_SIZE||position.y+item.height>PLAZA_SIZE)return '超出廣場範圍，請換一格。';
  for(const other of owned) {
    if(other.id===excludeId||other.placement?.town!==town)continue;
    const shape=decorationFor(other.sku);
    if(!shape)return '裝飾資料暫時無法辨識，請先匯出備份。';
    const p=other.placement;
    if(position.x<p.x+shape.width&&position.x+item.width>p.x&&position.y<p.y+shape.height&&position.y+item.height>p.y)
      return `與${shape.name}重疊，請換一格。`;
  }
  return null;
}
export function isOwnedDecoration(value:unknown):value is OwnedDecoration {
  if(!value||typeof value!=='object')return false;
  const row=value as OwnedDecoration,item=decorationFor(row.sku);
  if(typeof row.id!=='string'||!row.id||row.id.length>128||!item||row.pricePaid!==item.price
    ||!Number.isFinite(row.purchasedAt)||row.purchasedAt<0||!Number.isFinite(new Date(row.purchasedAt).getTime()))return false;
  return row.placement===undefined || !!row.placement&&isDecorationTown(row.placement.town)
    && placementError(item,row.placement,row.placement.town,[])===null;
}
export function validDecorationBackup(value:unknown):value is OwnedDecoration[] {
  if(!Array.isArray(value)||!value.every(isOwnedDecoration)||new Set(value.map(row=>row.id)).size!==value.length)return false;
  if(!Number.isSafeInteger(value.reduce((total,row)=>total+row.pricePaid,0)))return false;
  return value.every(row=>!row.placement || placementError(decorationFor(row.sku)!,row.placement,row.placement.town,value,row.id)===null);
}
