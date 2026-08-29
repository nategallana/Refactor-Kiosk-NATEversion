export const isVideoUrl = (url: string | null | undefined): boolean => {
  if (!url) return false
  return url.startsWith('data:video/') || /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url)
}
