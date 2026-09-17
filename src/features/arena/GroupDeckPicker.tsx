import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { contentDb } from "../../db/contentDb";
import { progressDb, setSetting } from "../../db/progressDb";
import type { WordRecord } from "../../db/types";
import { resolveGroupWords } from "../direct/groupScope";
import type { GroupScope } from "./useGroupScope";

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

const settingKey = (gameKey: string) => `gameDeck:${gameKey}`;

/**
 * 遊戲設定頁的「群組」選項：預設群組走遊戲原本的字池，自選群組把群組編號放進網址
 * （from=game），其餘交給 useGroupScope。選擇會記住，下次打開同一個遊戲直接套用。
 */
export default function GroupDeckPicker({ gameKey, scope, eligible, minimum, countLabel = "可入陣" }: Props) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [custom, setCustom] = useState(false);
  // 使用者在這個畫面按過「預設群組」之後，就不再自動套回記住的群組（記憶清除是非同步的）
  const choseDefault = useRef(false);
  const data = useLiveQuery(async () => {
    const [groups, words] = await Promise.all([
      progressDb.customGroups.orderBy("updatedAt").reverse().toArray(),
      contentDb.words.toArray(),
    ]);
    return groups.map((group) => ({ group, count: resolveGroupWords(group, words).filter(eligible).length }));
  }, [eligible]);
  const remembered = useLiveQuery(async () => {
    const row = await progressDb.settings.get(settingKey(gameKey));
    return (row?.value as string | null | undefined) ?? null;
  }, [gameKey]);

  // 沒帶群組進來、但上次選過自選群組且它還在：直接套用
  useEffect(() => {
    if (scope.groupId || !remembered || !data || choseDefault.current) return;
    if (!data.some((item) => item.group.id === remembered)) return;
    const next = new URLSearchParams(searchParams);
    next.set("group", remembered);
    next.set("from", "game");
    setSearchParams(next, { replace: true });
  }, [scope.groupId, remembered, data, searchParams, setSearchParams]);

  const showList = custom || !!scope.groupId;

  function chooseDefault() {
    choseDefault.current = true;
    setCustom(false);
    void setSetting(settingKey(gameKey), null);
    if (!scope.groupId) return;
    const next = new URLSearchParams(searchParams);
    next.delete("group");
    next.delete("from");
    setSearchParams(next, { replace: true });
  }

  function chooseGroup(id: string) {
    choseDefault.current = false;
    void setSetting(settingKey(gameKey), id);
    const next = new URLSearchParams(searchParams);
    next.set("group", id);
    next.set("from", "game");
    setSearchParams(next, { replace: true });
  }

  return (
    <section className="game-shell-options" aria-label="選擇出題群組">
      <p>群組</p>
      <button aria-pressed={!showList} onClick={chooseDefault}>
        <span>預設群組</span><small>依學習進度出題</small>
      </button>
      <button aria-pressed={showList} onClick={() => setCustom(true)}>
        <span>自選群組</span><small>只出某個群組的字</small>
      </button>
      {showList && (
        !data ? <p className="game-shell-note">正在整理群組…</p>
        : data.length === 0 ? <p className="game-shell-note">還沒有群組。<Link to="/groups?create=1">去建立一個</Link></p>
        : (
          <div className="game-shell-sublist" role="list">
            {data.map(({ group, count }) => (
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
