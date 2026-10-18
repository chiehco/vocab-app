import { useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { progressDb } from '../../../db/progressDb';
import { DECORATIONS, PLAZA_SIZE, covers, decorationFor, isDecorationTown, placementError, type DecorationSku, type OwnedDecoration, type PlazaPosition } from './model';
import { placeOwnedDecoration, purchaseAndPlace, storeOwnedDecoration } from './store';
import DecorationArt from './DecorationArt';
import PlazaDecorations from './PlazaDecorations';
import './decorations.css';

type Draft={kind:'buy';sku:DecorationSku;purchaseId:string;position?:PlazaPosition}|{kind:'move';sku:DecorationSku;ownedId:string;position?:PlazaPosition};
export default function DecorationShopScreen() {
  const {level,unit}=useParams(),town=`${level}/${unit}`,townUrl=isDecorationTown(town)?`/town/${town}`:'/';
  const data=useLiveQuery(async()=>{
    try{return {owned:await progressDb.townDecorations.toArray(),balance:(await progressDb.rewardWallet.get('local'))?.balance??0,error:''};}
    catch{return {owned:[] as OwnedDecoration[],balance:0,error:'裝飾與金幣暫時讀不到，請稍後重新整理。'};}
  },[]);
  const [tab,setTab]=useState<'shop'|'owned'>('shop'),[draft,setDraft]=useState<Draft|null>(null);
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const lock=useRef(false),cellRefs=useRef<(HTMLButtonElement|null)[]>([]),[activeCell,setActiveCell]=useState(0);
  const owned=data?.owned??[],placed=owned.filter(row=>row.placement?.town===town);
  const item=draft?decorationFor(draft.sku):undefined;
  const moving=draft?.kind==='move'?owned.find(row=>row.id===draft.ownedId):undefined;
  const position=draft?.position;
  const invalid=item&&position&&isDecorationTown(town)?placementError(item,position,town,owned,draft?.kind==='move'?draft.ownedId:undefined):null;
  const cost=draft?.kind==='buy'?item?.price??0:0,gap=data?Math.max(0,cost-data.balance):0;
  const ready=!!data&&!data.error&&!!item&&!!position&&!invalid&&!gap&&!busy;
  function start(next:Draft){if(lock.current)return;setDraft(next);setError('');setNotice('');setActiveCell(next.position?next.position.y*PLAZA_SIZE+next.position.x:0);window.scrollTo({top:0,behavior:'instant'});}
  async function act(action:()=>Promise<unknown>,message:string) {
    if(lock.current)return;lock.current=true;setBusy(true);setError('');
    try{await action();setDraft(null);setNotice(message);}catch(error){setError(error instanceof Error?error.message:'尚未保存，請再試一次。');}
    finally{lock.current=false;setBusy(false);}
  }
  function confirm(){
    if(!ready||!draft||!position||!isDecorationTown(town))return;
    const current=draft;
    void act(()=>current.kind==='buy'?purchaseAndPlace({id:current.purchaseId,sku:current.sku,town,...position}):placeOwnedDecoration(current.ownedId,town,position),current.kind==='buy'?`${item!.name}已購買並放好。`:'位置已保存，沒有再次扣款。');
  }
  function selectCell(x:number,y:number){if(!draft||busy)return;setActiveCell(y*PLAZA_SIZE+x);setDraft({...draft,position:{x,y}});setError('');}
  if(!isDecorationTown(town))return <div className="decoration-shop"><h1>找不到這個廣場</h1><Link to="/">回首頁</Link></div>;
  return <div className={`decoration-shop ${draft?'is-editing':''}`}>
    <header className="decoration-shop-header"><Link to={townUrl} onClick={event=>{if(lock.current)event.preventDefault();}}>← 回小鎮</Link><h1>{draft?'布置廣場':'廣場商店'}</h1><p className="decoration-wallet" role="status" aria-label={`遊戲金幣 ${data&&!data.error?data.balance:'讀取中'}`}><span aria-hidden="true">◉</span> {data&&!data.error?data.balance:'…'}</p></header>
    {data?.error&&<p role="alert">{data.error}</p>}
    {!draft?<>
      <div className="decoration-tabs" role="group" aria-label="商店與持有裝飾"><button aria-pressed={tab==='shop'} onClick={()=>{setTab('shop');setError('');}}>裝飾商店</button><button aria-pressed={tab==='owned'} onClick={()=>{setTab('owned');setError('');}}>我的裝飾（{owned.length}）</button></div>
      {notice&&<p role="status" className="decoration-notice">{notice}</p>}{error&&<p role="alert">{error}</p>}
      {tab==='shop'?<>
        <p className="decoration-muted">用遊戲金幣添一點風景。先選裝飾，再點位置，確認後才扣款。</p>
        <div className="decoration-catalog">{DECORATIONS.map(product=><article className="decoration-product" key={product.id}>
          <DecorationArt sku={product.id}/><h2>{product.name}</h2><p>{product.width}×{product.height} 格 <strong>◉ {product.price}</strong></p>
          <button onClick={()=>start({kind:'buy',sku:product.id,purchaseId:crypto.randomUUID()})}>選位置</button>
          <small>{data&&!data.error&&data.balance<product.price?`還差 ${product.price-data.balance} 金幣`:'可先預覽放置'}</small>
        </article>)}</div>
      </>:<>
        <p className="decoration-muted">搬動與收回都不收費，已買的裝飾會保留。</p>
        {!data?<p role="status">正在讀取裝飾…</p>:!owned.length?<p className="decoration-empty">還沒有裝飾。到商店看看喜歡的風景。</p>:<ul className="decoration-owned">{owned.map(row=>{const product=decorationFor(row.sku);if(!product)return null;return <li key={row.id}>
          <DecorationArt sku={row.sku}/><div><h2>{product.name}</h2><p>{row.placement?`${row.placement.town} · 第 ${row.placement.y+1} 排第 ${row.placement.x+1} 格`:'已收好，尚未放置'}</p>
          <div className="decoration-owned-actions"><button disabled={busy} onClick={()=>start({kind:'move',sku:row.sku,ownedId:row.id,position:row.placement?.town===town?{x:row.placement.x,y:row.placement.y}:undefined})}>{row.placement?.town===town?'搬動':row.placement?'移到本廣場':'放置'}</button>{row.placement&&<button disabled={busy} onClick={()=>void act(()=>storeOwnedDecoration(row.id),`${product.name}已收回，沒有扣款。`)}>收回</button>}</div>
          </div></li>;})}</ul>}
      </>}
    </>:item&&<section className="decoration-editor" aria-label="廣場布置">
      <div className="decoration-selection"><DecorationArt sku={item.id}/><div><h2>{item.name}</h2><p>{item.width}×{item.height} 格 · {draft.kind==='buy'?`${item.price} 金幣`:'已持有，不再收費'}</p>{moving?.placement&&moving.placement.town!==town&&<small>將從 {moving.placement.town} 移到本廣場</small>}</div></div>
      <div className="decoration-grid" role="grid" aria-label="6×6中央廣場" aria-rowcount={6} aria-colcount={6}>
        {Array.from({length:PLAZA_SIZE},(_,y)=><div role="row" className="decoration-grid-row" key={y}>{Array.from({length:PLAZA_SIZE},(_,x)=>{
          const index=y*PLAZA_SIZE+x,inPreview=!!position&&covers(item,position,x,y);
          const occupant=placed.find(row=>row.id!==(draft.kind==='move'?draft.ownedId:undefined)&&covers(decorationFor(row.sku)!,row.placement!,x,y));
          return <button type="button" role="gridcell" key={x} aria-rowindex={y+1} aria-colindex={x+1} aria-selected={position?.x===x&&position?.y===y}
            aria-label={`第 ${y+1} 排第 ${x+1} 格${occupant?`，已有${decorationFor(occupant.sku)!.name}`:''}`} tabIndex={index===activeCell?0:-1} disabled={busy}
            className={inPreview?invalid?'is-invalid':'is-preview':''} ref={element=>{cellRefs.current[index]=element;}}
            onClick={()=>selectCell(x,y)} onKeyDown={event=>{
              const offsets:Record<string,number>={ArrowLeft:-1,ArrowRight:1,ArrowUp:-PLAZA_SIZE,ArrowDown:PLAZA_SIZE};
              if(!(event.key in offsets))return;event.preventDefault();const next=index+offsets[event.key];
              if(next<0||next>=PLAZA_SIZE*PLAZA_SIZE||(event.key==='ArrowLeft'&&x===0)||(event.key==='ArrowRight'&&x===PLAZA_SIZE-1))return;
              setActiveCell(next);cellRefs.current[next]?.focus();
            }}/>
        })}</div>)}
        <PlazaDecorations owned={placed} omitId={draft.kind==='move'?draft.ownedId:undefined}/>
        {position&&<div className={`decoration-placement-preview ${invalid?'is-invalid':''}`} aria-hidden="true" style={{left:`${position.x/6*100}%`,top:`${position.y/6*100}%`,width:`${item.width/6*100}%`,height:`${item.height/6*100}%`}}><DecorationArt sku={item.id} decorative/></div>}
      </div>
      <div className="decoration-editor-actions">
        <p role="status" className={invalid?'decoration-invalid':'decoration-muted'}>{busy?'正在保存…':invalid??(position?`第 ${position.y+1} 排第 ${position.x+1} 格${draft.kind==='buy'?` · 確認將扣 ${cost} 金幣`:' · 確認只保存位置'}`:'點一格選擇放置起點。')}</p>
        {gap>0&&<p className="decoration-invalid">還差 {gap} 金幣，尚未購買。</p>}{error&&<p role="alert">{error}</p>}
        <div><button className="decoration-confirm" disabled={!ready} onClick={event=>{if(event.detail>1)return;confirm();}}>{busy?'保存中…':draft.kind==='buy'?`確認購買 · ${cost} 金幣`:'確認位置 · 不收費'}</button><button disabled={busy} onClick={()=>{setDraft(null);setError('');}}>取消</button></div>
      </div>
    </section>}
  </div>;
}
