import { useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { contentDb } from "../../db/contentDb";
import { progressDb, setSetting } from "../../db/progressDb";
import type { WordRecord } from "../../db/types";
import { resolveGroupWords } from "../direct/groupScope";
import { CUSTOM_DECK, DECK_PARAM, FROM_PARAM, GROUP_PARAM, withoutScopeParams, type GroupScope } from "./useGroupScope";

interface Props {
  /** 記住上次選擇用的鍵，每個遊戲一把 */
  gameKey: string;
  scope: GroupScope;
  /**
   * 用這個遊戲實際的選字規則算可出題數。必須是模組層級的穩定函式（會進 useLiveQuery 的相依）。
   * 傳規則而不是單字條件，選單顯示的數字才會跟開局區一致（花牌還會排掉撞義的字）。
   */
  countDeck: (words: WordRecord[]) => number;
  /** 一局至少要幾個合格字；不足的群組仍列出但標示 */
  minimum: number;
  /** 字數後面的量詞，跟該遊戲設定頁的用語一致 */
  countLabel?: string;
}

const settingKey = (gameKey: string) => `gameDeck:${gameKey}`;

/**
 * 遊戲設定頁的「群組」選項：預設群組走遊戲原本的字池，自選群組把群組編號放進網址
 * （from=game），其餘交給 useGroupScope。選擇會記住，下次打開同一個遊戲直接套用。
 *
 * 「自選群組」本身也寫進網址（deck=custom），這樣還沒挑到群組時遊戲看得見這個狀態，
 * 不會讓人在自選模式下用預設字池開局。
 */
export default function GroupDeckPicker({ gameKey, scope, countDeck, minimum, countLabel = "可入陣" }: Props) {
  const [searchParams, setSearchParams] = useSearchParams();
  // 使用者在這個畫面按過「預設群組」之後，就不再自動套回記住的群組（記憶清除是非同步的）
  const choseDefault = useRef(false);
  const data = useLiveQuery(async () => {
    const [groups, words] = await Promise.all([
      progressDb.customGroups.orderBy("updatedAt").reverse().toArray(),
      contentDb.words.toArray(),
    ]);
    return groups.map((group) => ({ group, count: countDeck(resolveGroupWords(group, words)) }));
  }, [countDeck]);
  const remembered = useLiveQuery(async () => {
    const row = await progressDb.settings.get(settingKey(gameKey));
    return (row?.value as string | null | undefined) ?? null;
  }, [gameKey]);

  // 沒帶群組進來、但上次選過自選群組且它還在：直接套用
  useEffect(() => {
    if (scope.groupId || !remembered || !data || choseDefault.current) return;
    if (!data.some((item) => item.group.id === remembered)) return;
    const next = new URLSearchParams(searchParams);
    next.set(GROUP_PARAM, remembered);
    next.set(FROM_PARAM, "game");
    next.set(DECK_PARAM, CUSTOM_DECK);
    setSearchParams(next, { replace: true });
  }, [scope.groupId, remembered, data, searchParams, setSearchParams]);

  const showList = scope.pendingPick || !!scope.groupId;

  function chooseDefault() {
    choseDefault.current = true;
    void setSetting(settingKey(gameKey), null);
    setSearchParams(withoutScopeParams(searchParams), { replace: true });
  }

  function chooseCustom() {
    if (showList) return;
    const next = new URLSearchParams(searchParams);
    next.set(DECK_PARAM, CUSTOM_DECK);
    setSearchParams(next, { replace: true });
  }

  function chooseGroup(id: string) {
    choseDefault.current = false;
    void setSetting(settingKey(gameKey), id);
    const next = new URLSearchParams(searchParams);
    next.set(GROUP_PARAM, id);
    next.set(FROM_PARAM, "game");
    next.set(DECK_PARAM, CUSTOM_DECK);
    setSearchParams(next, { replace: true });
  }

  return (
    <section className="game-shell-options" aria-label="選擇出題群組">
      <p>群組</p>
      <button aria-pressed={!showList} onClick={chooseDefault}>
        <span>預設群組</span><small>依學習進度出題</small>
      </button>
      <button aria-pressed={showList} onClick={chooseCustom}>
        <span>自選群組</span><small>只出某個群組的字</small>
      </button>
      {showList && (
        !data ? <p className="game-shell-note">正在整理群組…</p>
        : data.length === 0 ? <p className="game-shell-note">還沒有群組。<Link to="/groups?create=1">去建立一個</Link></p>
        : (
          <>
            {scope.pendingPick && <p className="game-shell-note" aria-live="polite">還沒選群組，挑一個才能開局。</p>}
            <div className="game-shell-sublist" role="list">
              {data.map(({ group, count }) => (
                <button key={group.id} role="listitem" aria-pressed={scope.groupId === group.id} onClick={() => chooseGroup(group.id)}>
                  <span>{group.name}</span>
                  <small>{count < minimum ? `只有 ${count} 個${countLabel}，至少要 ${minimum} 個` : `${count} 個${countLabel}`}</small>
                </button>
              ))}
            </div>
          </>
        )
      )}
    </section>
  );
}
