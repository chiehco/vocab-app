import { useSearchParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { contentDb } from "../../db/contentDb";
import { progressDb } from "../../db/progressDb";
import { resolveGroupWords } from "../direct/groupScope";
import type { CustomGroup } from "../direct/model";
import type { WordRecord } from "../../db/types";

/** 範圍是從哪裡指定的：群組頁連過來，或在遊戲設定頁自己選的 */
export type GroupScopeOrigin = "group" | "game" | null;

export interface GroupScope {
  groupId: string | null;
  group: CustomGroup | undefined;
  words: WordRecord[] | undefined;
  /** 有 groupId 但資料還在讀 */
  loading: boolean;
  /** 有 groupId 但群組已不存在 */
  missing: boolean;
  origin: GroupScopeOrigin;
  /** 離開遊戲時回哪裡：群組頁連來的回群組頁，其餘回遊戲模式頁 */
  returnTo: string;
}

/** 讀網址 ?group=，有就把群組解析成主表單字；沒有就回傳空 scope，遊戲走原本的隨機字池。 */
export function useGroupScope(fallbackReturnTo = "/games"): GroupScope {
  const [searchParams] = useSearchParams();
  const groupId = searchParams.get("group");
  const origin: GroupScopeOrigin = groupId ? (searchParams.get("from") === "game" ? "game" : "group") : null;
  const scope = useLiveQuery(async () => {
    if (!groupId) return null;
    const [group, words] = await Promise.all([progressDb.customGroups.get(groupId), contentDb.words.toArray()]);
    return { group, words: group ? resolveGroupWords(group, words) : [] };
  }, [groupId]);
  const loading = !!groupId && scope === undefined;
  return {
    groupId,
    group: scope?.group,
    words: scope?.words,
    loading,
    missing: !!groupId && !loading && !scope?.group,
    origin,
    returnTo: origin === "group" ? `/groups?group=${encodeURIComponent(groupId!)}` : fallbackReturnTo,
  };
}
