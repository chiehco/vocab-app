import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { contentDb } from "../../db/contentDb";
import { progressDb, setSetting } from "../../db/progressDb";
import type { WordRecord } from "../../db/types";
import { resolveGroupWords } from "../direct/groupScope";
import { groupWords } from "../direct/groupWords";
import { UNIT_SCOPE_PREFIX, type GroupScope } from "./useGroupScope";
import { ScopePicker, UnitTiles } from "../../components/ScopePicker";
import { findUnitByKey, resolveTextbookScope, unitKey, unitsFor, type TextbookScope } from "../vocabulary/textbookCatalog";

interface Props {
  /** 記住上次選擇用的鍵，每個遊戲一把 */
  gameKey: string;
  scope: GroupScope;
  /** 這個遊戲能出題的字才算數，清單上顯示的字數用它算 */
  eligible: (word: WordRecord) => boolean;
  /** 一局至少要幾個合格字；不足的群組仍列出但標示 */
  minimum: number;
  /** 字數後面的量詞，跟該遊戲設定頁的用語一致 */
  countLabel?: string;
}

type Mode = "default" | "unit" | "group";
const settingKey = (gameKey: string) => `gameDeck:${gameKey}`;

/**
 * 遊戲設定頁的出題範圍：預設字池、選單元（?unit=，2026-10-07 加入）、自選群組（?group=&from=game）。
 * 選擇會記住，下次打開同一個遊戲直接套用；解析交給 useGroupScope。
 */
export default function GroupDeckPicker({ gameKey, scope, eligible, minimum, countLabel = "可入陣" }: Props) {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeUnit = scope.groupId?.startsWith(UNIT_SCOPE_PREFIX) ? findUnitByKey(scope.groupId.slice(UNIT_SCOPE_PREFIX.length)) : undefined;
  const scopeMode: Mode = activeUnit || scope.groupId?.startsWith(UNIT_SCOPE_PREFIX) ? "unit" : scope.groupId ? "group" : "default";
  const [picked, setPicked] = useState<Mode | null>(null);
  const mode = picked ?? scopeMode;
  const [unitScope, setUnitScope] = useState<TextbookScope | undefined>(() => resolveTextbookScope(activeUnit ?? {}));
  // 使用者在這個畫面按過「預設」之後，就不再自動套回記住的範圍（記憶清除是非同步的）
  const choseDefault = useRef(false);
  const data = useLiveQuery(async () => {
    const [groups, words] = await Promise.all([
      progressDb.customGroups.orderBy("updatedAt").reverse().toArray(),
      contentDb.words.toArray(),
    ]);
    return { groups: groups.map((group) => ({ group, count: resolveGroupWords(group, words).filter(eligible).length })), words };
  }, [eligible]);
  const remembered = useLiveQuery(async () => {
    const row = await progressDb.settings.get(settingKey(gameKey));
    return (row?.value as string | null | undefined) ?? null;
  }, [gameKey]);

  // 記住的單元在首次渲染後才恢復；網址切換單元時也同步選單。
  useEffect(() => {
    if (activeUnit) setUnitScope(resolveTextbookScope(activeUnit));
  }, [activeUnit]);

  // 沒帶範圍進來、但上次選過單元或群組且它還在：直接套用
  useEffect(() => {
    if (scope.groupId || !remembered || !data || choseDefault.current) return;
    const next = new URLSearchParams(searchParams);
    if (remembered.startsWith(UNIT_SCOPE_PREFIX)) {
      if (!findUnitByKey(remembered.slice(UNIT_SCOPE_PREFIX.length))) return;
      next.set("unit", remembered.slice(UNIT_SCOPE_PREFIX.length));
    } else {
      if (!data.groups.some((item) => item.group.id === remembered)) return;
      next.set("group", remembered);
      next.set("from", "game");
    }
    setSearchParams(next, { replace: true });
  }, [scope.groupId, remembered, data, searchParams, setSearchParams]);

  function apply(changes: { group?: string; unit?: string }) {
    const next = new URLSearchParams(searchParams);
    for (const key of ["group", "from", "unit"]) next.delete(key);
    if (changes.group) { next.set("group", changes.group); next.set("from", "game"); }
    if (changes.unit) next.set("unit", changes.unit);
    setSearchParams(next, { replace: true });
  }
  function chooseDefault() {
    choseDefault.current = true;
    setPicked("default");
    void setSetting(settingKey(gameKey), null);
    if (scope.groupId) apply({});
  }
  function chooseGroup(id: string) {
    choseDefault.current = false;
    void setSetting(settingKey(gameKey), id);
    apply({ group: id });
  }
  function chooseUnit(key: string) {
    choseDefault.current = false;
    void setSetting(settingKey(gameKey), UNIT_SCOPE_PREFIX + key);
    apply({ unit: key });
  }
  const unitCount = (wordIds: string[]) => data ? groupWords(wordIds, data.words).filter(eligible).length : 0;

  return (
    <section className="game-shell-options" aria-label="選擇出題範圍">
      <p>出題範圍</p>
      <button aria-pressed={mode === "default"} onClick={chooseDefault}>
        <span>預設</span><small>依學習進度出題</small>
      </button>
      {unitScope && <button aria-pressed={mode === "unit"} onClick={() => setPicked("unit")}>
        <span>選單元</span><small>只出某個單元的字</small>
      </button>}
      {mode === "unit" && unitScope && (
        <div className="game-shell-sublist game-shell-units">
          <ScopePicker scope={unitScope} onChange={setUnitScope} />
          <UnitTiles units={unitsFor(unitScope)} selected={activeUnit ? unitKey(activeUnit) : undefined} onSelect={(u) => chooseUnit(unitKey(u))}
            detail={(u) => { const n = unitCount(u.wordIds); return n < minimum ? `只有 ${n} 個${countLabel}` : `${n} 個${countLabel}`; }} />
        </div>
      )}
      <button aria-pressed={mode === "group"} onClick={() => setPicked("group")}>
        <span>自選群組</span><small>只出某個群組的字</small>
      </button>
      {mode === "group" && (
        !data ? <p className="game-shell-note">正在整理群組…</p>
        : data.groups.length === 0 ? <p className="game-shell-note">還沒有群組。<Link to="/groups?create=1">去建立一個</Link></p>
        : (
          <div className="game-shell-sublist" role="list">
            {data.groups.map(({ group, count }) => (
              <button key={group.id} role="listitem" aria-pressed={scope.groupId === group.id} onClick={() => chooseGroup(group.id)}>
                <span>{group.name}</span>
                <small>{count < minimum ? `只有 ${count} 個${countLabel}，至少要 ${minimum} 個` : `${count} 個${countLabel}`}</small>
              </button>
            ))}
          </div>
        )
      )}
    </section>
  );
}
