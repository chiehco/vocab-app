import { gsatYears } from './gsatStore';

export default function GsatYearSelector({year,onChange}:{year:string;onChange:(year:string)=>void}) {
  const archived=Number(year)<110;
  const years=gsatYears.filter(y=>(Number(y)<110)===archived);
  return <div>
    <p>{archived?'舊題區 · 106–109 年（補充練習）':'主要練習 · 110–115 年'}</p>
    <label>選擇年度 <select aria-label="選擇年度" value={year} onChange={e=>onChange(e.target.value)}>{years.map(y=><option key={y} value={y}>{y} 年</option>)}</select></label>
    <p><button onClick={()=>onChange(archived?'115':'109')}>{archived?'返回主要練習（110–115）':'查看舊題區（106–109）'}</button></p>
  </div>;
}
