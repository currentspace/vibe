'use client'

import { useServerInsertedHTML } from 'next/navigation'
import { useState } from 'react'
import createCache from '@emotion/cache'
import { CacheProvider } from '@emotion/react'

export default function EmotionRegistry({ children }: { children: React.ReactNode }) {
  const [cache] = useState(() => {
    const emotionCache = createCache({
      key: 'chakra',
      prepend: true,
    })
    emotionCache.compat = true
    return emotionCache
  })

  useServerInsertedHTML(() => {
    const names = new Set()
    cache.sheet.tags.forEach((tag) => {
      ;(tag.getAttribute('data-emotion') ?? '').split(' ').forEach(name => names.add(name))
    })
    const styles = Array.from(cache.sheet.tags).map(tag => tag.outerHTML).join('')
    return <style data-emotion={`${cache.key} ${Array.from(names).join(' ')}`} dangerouslySetInnerHTML={{ __html: styles }} />
  })

  return <CacheProvider value={cache}>{children}</CacheProvider>
}