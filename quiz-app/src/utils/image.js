export function resolveImage(src) {
  if (!src) return ''
  if (/^(https?:\/\/|data:)/i.test(src)) return src
  // 子路径部署时 BASE_URL 非 /，去掉开头的 / 再拼接避免出现 // 协议相对路径
  return import.meta.env.BASE_URL + src.replace(/^\//, '')
}
