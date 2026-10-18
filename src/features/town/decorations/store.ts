import { progressDb, type VocabProgressDB } from '../../../db/progressDb';
import { decorationFor, isDecorationTown, isOwnedDecoration, placementError, type DecorationSku, type DecorationTown, type OwnedDecoration, type PlazaPosition } from './model';

export interface PurchasePlacement extends PlazaPosition {id:string;sku:DecorationSku;town:DecorationTown}
/** The receipt ID makes retries idempotent. Debit, ownership and position are one IndexedDB transaction. */
export async function purchaseAndPlace(input:PurchasePlacement,db:VocabProgressDB=progressDb) {
  const item=decorationFor(input.sku);
  if(!item||!isDecorationTown(input.town)||typeof input.id!=='string'||!input.id||input.id.length>128)throw Error('無法辨識這次購買，請重新選擇裝飾。');
  return db.transaction('rw',[db.townDecorations,db.rewardWallet],async()=>{
    const previous=await db.townDecorations.get(input.id);
    if(previous) {
      if(previous.sku!==input.sku||!isOwnedDecoration(previous))throw Error('購買識別碼不一致，請重新選擇裝飾。');
      return previous;
    }
    const owned=await db.townDecorations.toArray();
    if(!owned.every(isOwnedDecoration))throw Error('裝飾資料暫時無法辨識，請先匯出備份。');
    const error=placementError(item,input,input.town,owned);if(error)throw Error(error);
    const wallet=await db.rewardWallet.get('local'),balance=wallet?.balance??0;
    if(!Number.isSafeInteger(balance)||balance<0)throw Error('金幣資料暫時無法辨識，請先匯出備份。');
    if(balance<item.price)throw Error(`還差 ${item.price-balance} 金幣，尚未購買。`);
    const purchasedAt=Date.now();
    const record:OwnedDecoration={id:input.id,sku:item.id,pricePaid:item.price,purchasedAt,placement:{town:input.town,x:input.x,y:input.y}};
    await db.townDecorations.add(record);
    await db.rewardWallet.put({id:'local',balance:balance-item.price,updatedAt:purchasedAt});
    return record;
  });
}
export async function placeOwnedDecoration(id:string,town:DecorationTown,position:PlazaPosition,db:VocabProgressDB=progressDb) {
  if(!isDecorationTown(town))throw Error('找不到這個廣場。');
  return db.transaction('rw',db.townDecorations,async()=>{
    const record=await db.townDecorations.get(id);
    if(!isOwnedDecoration(record))throw Error('找不到這件已持有的裝飾。');
    const error=placementError(decorationFor(record.sku)!,position,town,await db.townDecorations.toArray(),id);
    if(error)throw Error(error);
    await db.townDecorations.put({...record,placement:{town,x:position.x,y:position.y}});
  });
}
export async function storeOwnedDecoration(id:string,db:VocabProgressDB=progressDb) {
  return db.transaction('rw',db.townDecorations,async()=>{
    const record=await db.townDecorations.get(id);
    if(!isOwnedDecoration(record))throw Error('找不到這件已持有的裝飾。');
    const {placement:_,...stored}=record;
    await db.townDecorations.put(stored);
  });
}
