export function withStartupTimeout<T>(task: Promise<T>, timeoutMs = 10_000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error("資料儲存沒有回應。請改用 Chrome 或 Safari 開啟，並避免使用無痕模式。"));
    }, timeoutMs);
  });

  return Promise.race([task, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}
