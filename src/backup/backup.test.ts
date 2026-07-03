import { describe, expect, it } from "vitest";
import { validateBackup } from "./backup";

const valid = {
  app: "vocab-app-progress",
  schemaVersion: 1,
  exportedAt: "2026-07-03T00:00:00Z",
  data: { cardStates: [], reviewLogs: [], checkIns: [], quizStats: [], settings: [] },
};

describe("validateBackup", () => {
  it("正確的備份檔通過驗證", () => {
    expect(validateBackup(valid)).toBeNull();
  });

  it("拒絕非本 App 的檔案", () => {
    expect(validateBackup({ ...valid, app: "other" })).toContain("不是本 App");
    expect(validateBackup("text")).not.toBeNull();
    expect(validateBackup(null)).not.toBeNull();
  });

  it("拒絕比 App 支援版本新的備份", () => {
    expect(validateBackup({ ...valid, schemaVersion: 99 })).toContain("比 App 支援的版本新");
  });

  it("拒絕缺少資料表的備份", () => {
    expect(validateBackup({ ...valid, data: { cardStates: [] } })).toContain("格式不正確");
  });
});
