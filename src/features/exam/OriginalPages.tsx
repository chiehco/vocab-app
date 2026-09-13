import { examAsset } from './archive';

export default function OriginalPages({images,onReady}:{images:string[];onReady?:(path:string,ready:boolean)=>void}) {
  return <section aria-label="官方原卷頁面" className="gsat-original">
    <p className="direct-muted">原卷保留圖片、表格及標示。點圖片可開啟放大閱讀；回到本頁繼續作答。</p>
    {images.map((path,i)=><a key={path} href={examAsset(path)} target="_blank" rel="noreferrer"><img src={examAsset(path)} alt={`官方原卷頁面 ${i+1}`} onLoad={()=>onReady?.(path,true)} onError={()=>onReady?.(path,false)}/></a>)}
  </section>;
}
