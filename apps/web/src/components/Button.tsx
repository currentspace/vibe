'use client'

import { Button as ChakraButton, ButtonProps } from '@chakra-ui/react'

interface CustomButtonProps extends ButtonProps {
  variant?: 'primary' | 'secondary'
}

export function Button({ variant = 'primary', children, ...props }: CustomButtonProps) {
  const colorScheme = variant === 'primary' ? 'blue' : 'gray'
  
  return (
    <ChakraButton colorScheme={colorScheme} {...props}>
      {children}
    </ChakraButton>
  )
}