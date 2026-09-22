import { buildUsagePatternItems } from "./usagePattern";

export default function UsagePatternList({
  english,
  chinese,
}: {
  english?: string | null;
  chinese?: string | null;
}) {
  const items = buildUsagePatternItems(english, chinese);
  if (items.length === 0) return null;

  return (
    <ul className="usage-pattern-items">
      {items.map((item, index) => (
        <li key={`${item.english}:${index}`}>
          <b>{item.english}</b>
          {item.chinese && <small>{item.chinese}</small>}
        </li>
      ))}
    </ul>
  );
}
