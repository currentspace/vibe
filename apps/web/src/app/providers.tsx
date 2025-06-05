'use client'

import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { useEffect, useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <ChakraProvider value={defaultSystem}>
      {mounted ? children : <div style={{ visibility: 'hidden' }}>{children}</div>}
    </ChakraProvider>
  )
}