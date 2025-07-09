'use client'

import { useEffect, useRef } from 'react'
import { Box } from '@chakra-ui/react'

/**
 * Simplified WebGL Component - Just draws a red triangle
 * This is the absolute minimum WebGL code
 */
export default function SimpleWebGL() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Get WebGL context
    const gl = canvas.getContext('webgl')
    if (!gl) {
      console.error('WebGL not supported')
      return
    }

    // Simple vertex shader
    const vsSource = [
      'attribute vec2 position;',
      'void main() {',
      '  gl_Position = vec4(position, 0.0, 1.0);',
      '}'
    ].join('\n')

    // Simple fragment shader
    const fsSource = [
      'void main() {',
      '  gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);', // Red color
      '}'
    ].join('\n')

    // Create shaders
    const vertexShader = gl.createShader(gl.VERTEX_SHADER)!
    gl.shaderSource(vertexShader, vsSource)
    gl.compileShader(vertexShader)

    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)!
    gl.shaderSource(fragmentShader, fsSource)
    gl.compileShader(fragmentShader)

    // Create program
    const program = gl.createProgram()!
    gl.attachShader(program, vertexShader)
    gl.attachShader(program, fragmentShader)
    gl.linkProgram(program)
    gl.useProgram(program)

    // Create triangle vertices
    const vertices = new Float32Array([
      -0.5, -0.5,
       0.5, -0.5,
       0.0,  0.5
    ])

    // Create buffer
    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW)

    // Get attribute location and enable it
    const positionLocation = gl.getAttribLocation(program, 'position')
    gl.enableVertexAttribArray(positionLocation)
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)

    // Clear and draw
    gl.clearColor(0, 0, 0, 1)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.drawArrays(gl.TRIANGLES, 0, 3)

  }, [])

  return (
    <Box width="100%" height="600px" bg="black">
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        style={{ width: '100%', height: '100%' }}
      />
    </Box>
  )
}