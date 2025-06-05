'use client'

import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { CacheProvider } from '@emotion/react'
import { emotionCache } from '@/lib/emotion-cache'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CacheProvider value={emotionCache}>
      <ChakraProvider value={defaultSystem}>
        {children}
      </ChakraProvider>
    </CacheProvider>
  )
}