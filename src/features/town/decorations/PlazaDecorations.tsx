import DecorationArt from './DecorationArt';
import { decorationFor, PLAZA_SIZE, type OwnedDecoration } from './model';
export default function PlazaDecorations({owned,omitId}:{owned:OwnedDecoration[];omitId?:string}) {
  return <div className="plaza-placements" aria-hidden="true">{owned.filter(row=>row.placement&&row.id!==omitId).map(row=>{
    const item=decorationFor(row.sku),p=row.placement;if(!item||!p)return null;
    return <div className="plaza-decoration" key={row.id} style={{left:`${p.x/PLAZA_SIZE*100}%`,top:`${p.y/PLAZA_SIZE*100}%`,width:`${item.width/PLAZA_SIZE*100}%`,height:`${item.height/PLAZA_SIZE*100}%`}}><DecorationArt sku={row.sku} decorative/></div>;
  })}</div>;
}
