import {readFileSync,writeFileSync} from 'node:fs';
const root='docs/unit-audit-20261105/';
for(const file of ['LV1-U01-ledger.json','LV1-U02-ledger.json','LV1-U03-ledger.json','LV1-U04-ledger.json']){
 let text=readFileSync(root+file,'utf8');
 text=text.replaceAll('parent delegation 2026-11-05; GitHub connector decode; not UI verification','independent original-asset pixel review, 2026-11-05; separate from actual App UI verification');
 text=text.replaceAll('parent confirmed these22 core pairs; textual details delivered in delegated messages','independent pixel review confirmed these 22 core pairs; separate from App reopen verification');
 writeFileSync(root+file,text);
}
const draftPath=root+'image-repair-drafts.json',draft=JSON.parse(readFileSync(draftPath,'utf8'));
const elephant=draft.repairs.find(r=>r.id==='LV1-U02-08');
elephant.attempt={result:'local_image_edit_unavailable',status:'The reference image could not be opened by the local image editor. No replacement was generated or installed; the repair draft remains actionable.',paidFallbackUsed:false};
writeFileSync(draftPath,JSON.stringify(draft,null,2)+'\n');
const path=root+'PROGRESS.md';let report=readFileSync(path,'utf8');
report=report.replace(/\n## 目前狀態[\s\S]*?(?=\n## )/,'');
report=report.replace(/U02 elephant原尺寸確認[\s\S]*?舊sunbathing圖保留供sun himself語境，不把另一例句自動標成配圖完成。/,
 '歷史紀錄（2026-11-05）：U02 elephant原尺寸確認有兩個多鼻狀灰部件，本機圖片編輯未成功，替換圖尚未完成。sun當時的取檔限制已於2026-11-05解除，日出新圖已接入並在兩個入口重開驗證；詳見LV1-U02-sunrise-review.json。舊sunbathing圖保留，另一例句未自動標配圖完成。');
report=report.replace('sun與elephant舊限制保持未完成。','歷史狀態：當時sun與elephant未完成；sun已於2026-11-05接入並重開通過，elephant替換圖仍未完成。');
report=report.replace(/## 圖片工具限制與修正草稿/,'## 圖片修復紀錄（含已解決事項）');
const current=`\n## 目前狀態\n\n更新：${new Date().toISOString()}。最近已推送checkpoint為af165704178eb5b3b5bd453af3c3f42da07a6445（U01–U05及U02 sunrise修復），遠端獨立分支已核實同SHA。未合併或部署。各單元仍有明列的來源／結構欄位待確認，不等同整詞全部義項通過。\n\n現在處理U06：完整原稿51組、已發布圖句23組、47個現有正式詞條／237筆例句。修改前47張一般卡已開啟，原始圖像素目前實看40／51張；其餘正在核查，尚未標通過。U05為32組原稿，30個正式詞條、171筆例句已核對並重開，3缺圖與1圖句不符已修；相關21測試、lint及build通過。\n\nsun日出圖已於2026-11-05解決並重開單元卡／一般卡驗證；原日光浴圖保留。elephant仍待完成替換圖片。詳細最新結果以單元ledger及此置頂狀態為準；下列較早checkpoint敘述是歷史紀錄。\n`;
report=report.replace(/^(# [^\n]+)\n/,'$1\n'+current+'\n');writeFileSync(path,report);
console.log(JSON.stringify({currentUnit:'LV1-U06',priorPublicCheckpoint:'af165704178eb5b3b5bd453af3c3f42da07a6445',sun:'resolved_2026-11-05',elephant:'replacement_not_completed'}));
