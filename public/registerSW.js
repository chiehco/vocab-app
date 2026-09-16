/* Keep this entry stable: already-open installations also load this URL. */
(() => {
  if (!('serviceWorker' in navigator)) return;
  let hadController = Boolean(navigator.serviceWorker.controller);
  let registration;
  let lastCheck = 0;
  let checking = false;
  let updateReady = false;
  let notice;
  function show(message, ready = false) {
    if (!document.body) return;
    if (!notice) {
      notice = document.createElement('aside');
      notice.setAttribute('role', 'status');
      notice.style.cssText = 'position:fixed;bottom:90px;left:16px;right:16px;max-width:520px;margin:auto;padding:16px;background:white;color:#222;border:1px solid #777;border-radius:12px;z-index:9999;box-shadow:0 4px 20px #0003;font:16px/1.5 sans-serif';
      document.body.append(notice);
    }
    notice.replaceChildren(document.createTextNode(message + ' '));
    const button = document.createElement('button');
    button.textContent = ready ? '更新版本' : '關閉';
    button.style.cssText = 'padding:8px 12px;margin-left:8px;cursor:pointer';
    button.onclick = () => {
      if (ready) location.reload();
      else { notice.remove(); notice = undefined; }
    };
    notice.append(button);
  }
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) { hadController = true; return; }
    updateReady = true;
    show('新版已備妥。請完成目前作答後更新，學習紀錄會保留。', true);
  });
  async function check(manual = false) {
    if (updateReady) { show('新版已備妥，學習紀錄會保留。', true); return; }
    if (!registration) { if (manual) show('更新服務尚未連線，請確認網路後重新開啟網頁。'); return; }
    if (checking || (!manual && Date.now() - lastCheck < 60000)) return;
    checking = true;
    lastCheck = Date.now();
    if (manual) show('正在檢查更新…');
    try {
      await registration.update();
      if (manual && !updateReady) show(registration.installing ? '新版下載中，完成後會提示更新。' : '已完成版本檢查，目前沒有待更新版本。');
    } catch {
      if (manual) show('暫時無法取得更新，請確認網路後再試。');
    } finally { checking = false; }
  }
  window.addEventListener('vocab-check-update', () => { void check(true); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void check();
  });
  navigator.serviceWorker.register('./sw.js', { scope: './', updateViaCache: 'none' })
    .then(value => { registration = value; void check(); })
    .catch(() => { /* Offline startup must remain usable. */ });
})();
