import { buildUsagePatternDisplay } from "./usagePattern";
import "./usage-pattern.css";

export default function UsagePatternList({
  english,
  chinese,
}: {
  english?: string | null;
  chinese?: string | null;
}) {
  const { items, unalignedChinese } = buildUsagePatternDisplay(english, chinese);
  if (items.length === 0) return null;

  const list = (
    <ul className="usage-pattern-items">
      {items.map((item, index) => (
        <li key={`${item.english}:${index}`}>
          <b>{item.english}</b>
          {item.chinese && <small>{item.chinese}</small>}
        </li>
      ))}
    </ul>
  );

  // Keep aligned rendering unchanged, including its original single-list root.
  if (!unalignedChinese) return list;

  // One wrapper keeps both parts in the same ReviewScreen grid cell.
  return (
    <div className="usage-pattern-with-note">
      {list}
      <section className="usage-pattern-unaligned-zh" aria-label="中文用法說明">
        <strong>中文用法說明</strong>
        <p>{unalignedChinese}</p>
      </section>
    </div>
  );
}
