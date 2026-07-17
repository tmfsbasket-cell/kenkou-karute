/* けんこうカルテ Service Worker
   更新のたびに CACHE の番号を必ず変えること(アプリのバージョンと同じ番号にすると取り違えがない)
   方針: ネットワーク優先。
   - オンライン時: 常に最新を取得(index.htmlの更新が今まで通り反映される)
   - オフライン時: 最後に取得したキャッシュから起動する */

const CACHE = "kenkou-karute-v0.19.0";
const ASSETS = ["./", "./index.html", "./manifest.json", "./icon.png", "./icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      // アイコン等が無くても失敗しないよう1件ずつ追加
      .then((c) => Promise.allSettled(ASSETS.map((a) => c.add(a))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        // 取得できたらキャッシュを更新しておく(次のオフラインに備える)
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() =>
        caches.match(e.request, { ignoreSearch: true }).then((r) => {
          if (r) return r;
          // ページ表示のリクエストだけindex.htmlで代替する
          // (画像などにHTMLを返す誤動作を防ぐ)
          if (e.request.mode === "navigate") return caches.match("./index.html");
          return Response.error();
        })
      )
  );
});
