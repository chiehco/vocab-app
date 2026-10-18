import { decorationAsset, decorationFor, type DecorationSku } from './model';
export default function DecorationArt({sku,decorative=false}:{sku:DecorationSku;decorative?:boolean}) {
  return <img className="decoration-art" src={decorationAsset(sku)} alt={decorative?'':decorationFor(sku)!.name} draggable={false}/>;
}
