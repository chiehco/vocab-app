import { useLocation, useSearchParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { contentDb } from "../../db/contentDb";
import { progressDb } from "../../db/progressDb";
import { resolveGroupWords } from "../direct/groupScope";
import type { CustomGroup } from "../direct/model";
import type { WordRecord } from "../../db/types";

/** 範圍是從哪裡指定的：群組頁連過來，或在遊戲設定頁自己選的 */
export type GroupScopeOrigin = "group" | "game" | null;

export const GROUP_PARAM = "group";
export const FROM_PARAM = "from";
/** 已按下「自選群組」但還沒挑到群組時留在網址上的記號 */
export const DECK_PARAM = "deck";
export const CUSTOM_DECK = "custom";

/** 拿掉所有範圍參數，其餘查詢字串原樣保留 */
export function withoutScopeParams(params: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(params);
  next.delete(GROUP_PARAM);
  next.delete(FROM_PARAM);
  next.delete(DECK_PARAM);
  return next;
}

export interface GroupScope {
  groupId: string | null;
  group: CustomGroup | undefined;
  /** 只有在 groupId 的字池讀完後才有值；換群組的空窗期是 undefined，不會殘留上一組 */
  words: WordRecord[] | undefined;
  /** 有 groupId 但資料還在讀 */
  loading: boolean;
  /** 有 groupId 但群組已不存在 */
  missing: boolean;
  /** 已選「自選群組」但還沒挑群組：這時候不能用預設字池開局 */
  pendingPick: boolean;
  /** 字池確定可用（預設字池，或群組已讀完且存在）才能開局 */
  ready: boolean;
  origin: GroupScopeOrigin;
  /** 離開遊戲時回哪裡：群組頁連來的回群組頁，其餘回遊戲模式頁 */
  returnTo: string;
  /** 留在同一個遊戲頁、改用預設字池的網址 */
  defaultTo: string;
}

/** 讀網址 ?group=，有就把群組解析成主表單字；沒有就回傳空 scope，遊戲走原本的隨機字池。 */
export function useGroupScope(fallbackReturnTo = "/games"): GroupScope {
  const [searchParams] = useSearchParams();
  const { pathname } = useLocation();
  const groupId = searchParams.get(GROUP_PARAM);
  const origin: GroupScopeOrigin = groupId ? (searchParams.get(FROM_PARAM) === "game" ? "game" : "group") : null;
  const scope = useLiveQuery(async () => {
    if (!groupId) return { groupId: null, group: undefined, words: undefined };
    const [group, words] = await Promise.all([progressDb.customGroups.get(groupId), contentDb.words.toArray()]);
    return { groupId, group, words: group ? resolveGroupWords(group, words) : [] };
  }, [groupId]);

  // useLiveQuery 換 key 時會先回上一輪的結果，所以只認 groupId 對得上的那一份，
  // 否則甲→乙的空窗期會拿甲組的字開局，預設→甲組也會先閃一下「找不到群組」。
  const current = scope && scope.groupId === groupId ? scope : undefined;
  const loading = !!groupId && !current;
  const missing = !!groupId && !!current && !current.group;
  const pendingPick = !groupId && searchParams.get(DECK_PARAM) === CUSTOM_DECK;

  const restQuery = withoutScopeParams(searchParams).toString();
  return {
    groupId,
    group: current?.group,
    words: current?.words,
    loading,
    missing,
    pendingPick,
    ready: groupId ? !loading && !missing : !pendingPick,
    origin,
    returnTo: origin === "group"
      // 群組已刪除就別再指回那一組，但仍留在群組頁這條來源路徑上
      ? (missing ? "/groups" : `/groups?${GROUP_PARAM}=${encodeURIComponent(groupId!)}`)
      : fallbackReturnTo,
    defaultTo: restQuery ? `${pathname}?${restQuery}` : pathname,
  };
}
