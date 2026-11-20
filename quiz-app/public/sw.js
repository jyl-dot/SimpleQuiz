// SimpleQuiz Service Worker：离线可用，联网时优先获取最新页面
const CACHE = 'simplequiz-v1'
const CORE = ['./manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png']

async function put(req, res) {
  if (!res || !res.ok) return
  const cache = await caches.open(CACHE)
  await cache.put(req, res.clone())
}

// 预缓存页面与构建产物：解析 index.html 中的脚本/样式地址一并写入
async function precache() {
  const cache = await caches.open(CACHE)
  const res = await fetch('./', { cache: 'no-cache' })
  if (!res.ok) throw new Error(`预缓存失败：${res.status}`)
  await cache.put('./', res.clone())
  const html = await res.text()
  const urls = new Set(CORE)
  for (const m of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    const u = m[1]
    if (u.startsWith('/') && !u.startsWith('//')) urls.add(u)
  }
  await Promise.all([...urls].map(u => cache.add(u).catch(() => {})))
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    precache()
      .catch(err => console.warn('预缓存失败，稍后由运行时缓存补足', err))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

async function networkFirst(req) {
  try {
    const res = await fetch(req)
    await put(req, res)
    return res
  } catch {
    const cache = await caches.open(CACHE)
    const cached =
      (await cache.match(req)) ||
      (await cache.match('./index.html')) ||
      (await cache.match('./'))
    return cached || Response.error()
  }
}

async function cacheFirst(req) {
  const cached = await caches.match(req)
  if (cached) return cached
  const res = await fetch(req)
  await put(req, res)
  return res
}

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return
  event.respondWith(req.mode === 'navigate' ? networkFirst(req) : cacheFirst(req))
})
