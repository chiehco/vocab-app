import WordsWorkspace from './features/modes/WordsWorkspace';
import VocabularyScreen from './features/vocabulary/VocabularyScreen';
import { useEffect, useState } from "react";
import { HashRouter, Navigate, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { ensureContentAvailable, refreshInstalledContent } from "./db/seed";
import { DEFAULT_SETTINGS, getSetting } from "./db/progressDb";
import { withStartupTimeout } from "./db/startup";
import { applyFontScale } from "./settings/fontScale";
import ModeScreen from "./features/modes/ModeScreen";
import ReviewScreen from "./features/review/ReviewScreen";
import SlashScreen from "./features/slash/SlashScreen";
import QuizScreen from "./features/quiz/QuizScreen";
import PlacementScreen from "./features/quiz/PlacementScreen";
import WordBrowserScreen from "./features/browser/WordBrowserScreen";
import WordDetailScreen from "./features/browser/WordDetailScreen";
import ProgressScreen from "./features/progress/ProgressScreen";
import SettingsScreen from "./features/settings/SettingsScreen";
import WordBeastPrototype from "./features/wordbeast/WordBeastPrototype";
import Lv1PilotScreen from "./features/wordbeast/Lv1PilotScreen";
import SpellBarrageScreen from "./features/arena/SpellBarrageScreen";
import MeaningKarutaScreen from "./features/arena/MeaningKarutaScreen";
import DirectScreen from "./features/direct/DirectScreen";
import GroupsScreen from "./features/direct/GroupsScreen";
import ExamHubScreen from "./features/exam/ExamHubScreen";
import GsatScreen from "./features/exam/GsatScreen";
import WrittenScreen from "./features/exam/WrittenScreen";
import UnitCatalogScreen from "./features/units/UnitCatalogScreen";
import UnitStudyScreen from "./features/units/UnitStudyScreen";
import SpeechNotice from "./components/SpeechNotice";
import { stopSpeech } from "./lib/speech";

const NAV_ITEMS = [
  { to: "/", label: "首頁", icon: "home" },
  { to: "/modes/words", label: "單字", icon: "review" },
  { to: "/exam", label: "大考", icon: "trial" },
  { to: "/games", label: "遊戲", icon: "game" },
  { to: "/story", label: "劇情", icon: "archive" },
];

function NavIcon({ name }: { name: string }) {
  if (name === "game") return <svg viewBox="0 0 24 24"><path d="M7 7h10l4 11h-5l-2-3h-4l-2 3H3Z"/><path d="M7 9v5M4.5 11.5h5M16 10h1M18 13h1"/></svg>;
  if (name === "home") return <svg viewBox="0 0 24 24"><path d="m4 11 8-7 8 7v9H4Z" /><path d="M9 20v-6h6v6" /></svg>;
  if (name === "review") return <svg viewBox="0 0 24 24"><path d="M4 5.5Q8 4 12 7v13q-4-3-8-1Z" /><path d="M20 5.5Q16 4 12 7v13q4-3 8-1Z" /></svg>;
  if (name === "trial") return <svg viewBox="0 0 24 24"><path d="M6 4h12l-1 16H7Z" /><path d="M9 8h6M9 12h6M10 16h4" /></svg>;
  if (name === "archive") return <svg viewBox="0 0 24 24"><path d="M5 4h14v16H5Z" /><path d="M8 8h8M8 12h8M8 16h5" /></svg>;
  return <svg viewBox="0 0 24 24"><path d="M5 19V9M10 19V5M15 19v-7M20 19V3" /></svg>;
}

function AppLayout() {
  const location = useLocation();
  useEffect(() => () => stopSpeech(), [location.pathname]);
  const immersive = location.pathname === "/slash"
    || location.pathname.startsWith("/wordbeast")
    || location.pathname.startsWith("/arena/spell-barrage")
    || location.pathname.startsWith("/arena/meaning-karuta")
    || /^\/units\/LV[1-6]\/\d+$/.test(location.pathname);

  return (
    <div className={immersive ? "mx-auto flex min-h-screen max-w-lg flex-col" : "app-frame flex min-h-screen flex-col"}>
      <main className={immersive ? "flex-1" : "flex-1 pb-20"}>
        <Routes>
          <Route path="/" element={<ModeScreen />} />
          <Route path="/review" element={<ReviewScreen />} />
          <Route path="/slash" element={<SlashScreen />} />
          <Route path="/wordbeast" element={<WordBeastPrototype />} />
          <Route path="/wordbeast/lv1" element={<Lv1PilotScreen />} />
          <Route path="/quiz" element={<QuizScreen />} />
          <Route path="/placement" element={<PlacementScreen />} />
          <Route path="/browse" element={<WordBrowserScreen />} />
          <Route path="/word/:wordId" element={<WordDetailScreen />} />
          <Route path="/progress" element={<ProgressScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
          {/* 競技場大廳已併入遊戲模式頁；舊書籤轉過去 */}
          <Route path="/arena" element={<Navigate to="/games" replace />} />
          <Route path="/arena/spell-barrage" element={<SpellBarrageScreen />} />
          <Route path="/arena/meaning-karuta" element={<MeaningKarutaScreen />} />
          <Route path="/practice/direct" element={<DirectScreen />} />
          <Route path="/vocabulary" element={<VocabularyScreen />} />
          <Route path="/groups" element={<GroupsScreen />} />
          <Route path="/modes/words" element={<WordsWorkspace />} />
          <Route path="/games" element={<ModeScreen mode="games" />} />
          <Route path="/story" element={<ModeScreen mode="story" />} />
          <Route path="/exam" element={<ModeScreen mode="exam" />} />
          <Route path="/exam/high-frequency" element={<ExamHubScreen />} />
          <Route path="/exam/papers" element={<GsatScreen />} />
          <Route path="/exam/written" element={<WrittenScreen />} />
          <Route path="/units" element={<UnitCatalogScreen />} />
          <Route path="/units/:level/:unitNumber" element={<UnitStudyScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <SpeechNotice key={location.pathname} />
      {!immersive && (
        <nav className="app-bottom-nav">
          <div className="app-bottom-nav-inner">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `app-nav-item ${isActive || (item.to === "/modes/words" && /^\/(vocabulary|groups|review|browse|word|units|practice|placement)(\/|$)/.test(location.pathname)) || (item.to === "/games" && location.pathname.startsWith("/arena")) ? "active" : ""}`}
              >
                <NavIcon name={item.icon} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startupAttempt, setStartupAttempt] = useState(0);
  const fontScale = useLiveQuery(
    () => getSetting<number>("fontScale"),
    [],
    DEFAULT_SETTINGS.fontScale,
  );

  useEffect(() => {
    applyFontScale(fontScale);
  }, [fontScale]);

  useEffect(() => {
    let active = true;
    let refreshTimer: number | undefined;
    withStartupTimeout(ensureContentAvailable(), 30_000)
      .then(() => {
        if (!active) return;
        setReady(true);
        // 先讓今日圖片取得頻寬，再依目前安裝範圍背景檢查資料更新。
        refreshTimer = window.setTimeout(() => { void refreshInstalledContent(); }, 15_000);
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      active = false;
      if (refreshTimer !== undefined) window.clearTimeout(refreshTimer);
    };
  }, [startupAttempt]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center">
        <div>
          <p className="mb-2 text-lg font-bold">資料載入失敗</p>
          <p className="text-sm text-slate-500">{error}</p>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setReady(false);
              setStartupAttempt((attempt) => attempt + 1);
            }}
            className="mt-4 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-bold text-white"
          >
            重新嘗試
          </button>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="animate-pulse text-slate-500">載入單字資料中…</p>
      </div>
    );
  }

  return (
    <HashRouter>
      <AppLayout />
    </HashRouter>
  );
}
