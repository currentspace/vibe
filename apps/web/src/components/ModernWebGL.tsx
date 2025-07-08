'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { Box, Text } from '@chakra-ui/react'

/**
 * Modern WebGL Component with animation and proper resource management
 * Tested and working in Chrome with WebGL 2 support
 */
export default function ModernWebGL() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)
  const [fps, setFps] = useState(0)

  // Vertex shader with animation
  const vertexShaderSource = `
    precision mediump float;
    
    attribute vec2 a_position;
    attribute vec3 a_color;
    
    uniform float u_time;
    uniform vec2 u_resolution;
    
    varying vec3 v_color;
    
    void main() {
      // Animate vertices
      vec2 position = a_position;
      float wave = sin(u_time + a_position.x * 2.0) * 0.1;
      position.y += wave;
      
      // Apply rotation
      float angle = u_time * 0.5;
      float c = cos(angle);
      float s = sin(angle);
      vec2 rotated = vec2(
        position.x * c - position.y * s,
        position.x * s + position.y * c
      );
      
      gl_Position = vec4(rotated, 0.0, 1.0);
      v_color = a_color;
    }
  `

  // Fragment shader with color interpolation
  const fragmentShaderSource = `
    precision mediump float;
    
    varying vec3 v_color;
    uniform float u_time;
    
    void main() {
      // Animate color brightness
      vec3 color = v_color;
      float brightness = 0.8 + sin(u_time * 2.0) * 0.2;
      
      gl_FragColor = vec4(color * brightness, 1.0);
    }
  `

  const initWebGL = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return null

    // Try WebGL 2 first, then fall back to WebGL 1
    let gl = canvas.getContext('webgl2') as WebGL2RenderingContext | null
    let isWebGL2 = true
    
    if (!gl) {
      gl = canvas.getContext('webgl') as WebGLRenderingContext | null
      isWebGL2 = false
    }

    if (!gl) {
      console.error('WebGL not supported')
      return null
    }

    console.log(`Using ${isWebGL2 ? 'WebGL 2' : 'WebGL 1'}`)
    
    // Compile shaders
    const vertexShader = gl.createShader(gl.VERTEX_SHADER)!
    gl.shaderSource(vertexShader, vertexShaderSource)
    gl.compileShader(vertexShader)
    
    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
      console.error('Vertex shader error:', gl.getShaderInfoLog(vertexShader))
      return null
    }

    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)!
    gl.shaderSource(fragmentShader, fragmentShaderSource)
    gl.compileShader(fragmentShader)
    
    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
      console.error('Fragment shader error:', gl.getShaderInfoLog(fragmentShader))
      return null
    }

    // Create and link program
    const program = gl.createProgram()!
    gl.attachShader(program, vertexShader)
    gl.attachShader(program, fragmentShader)
    gl.linkProgram(program)
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program))
      return null
    }

    // Create geometry - a colorful hexagon
    const vertices = []
    const colors = []
    const numSides = 6
    
    // Center point
    vertices.push(0, 0)
    colors.push(1, 1, 1) // White center
    
    // Outer vertices
    for (let i = 0; i <= numSides; i++) {
      const angle = (i / numSides) * Math.PI * 2
      vertices.push(Math.cos(angle) * 0.5, Math.sin(angle) * 0.5)
      
      // Rainbow colors
      const hue = i / numSides
      const rgb = hslToRgb(hue, 1, 0.5)
      colors.push(...rgb)
    }

    // Create and bind buffers
    const positionBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW)

    const colorBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW)

    // Get attribute and uniform locations
    const positionLoc = gl.getAttribLocation(program, 'a_position')
    const colorLoc = gl.getAttribLocation(program, 'a_color')
    const timeLoc = gl.getUniformLocation(program, 'u_time')
    const resolutionLoc = gl.getUniformLocation(program, 'u_resolution')

    // Animation loop
    let lastTime = 0
    let frameCount = 0
    const startTime = performance.now()

    const render = (currentTime: number) => {
      // Calculate FPS
      frameCount++
      if (currentTime - lastTime > 1000) {
        setFps(Math.round((frameCount * 1000) / (currentTime - lastTime)))
        frameCount = 0
        lastTime = currentTime
      }

      // Resize canvas if needed
      const displayWidth = canvas.clientWidth
      const displayHeight = canvas.clientHeight
      if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth
        canvas.height = displayHeight
        gl.viewport(0, 0, canvas.width, canvas.height)
      }

      // Clear
      gl.clearColor(0.1, 0.1, 0.15, 1)
      gl.clear(gl.COLOR_BUFFER_BIT)

      // Use program
      gl.useProgram(program)

      // Set uniforms
      const time = (currentTime - startTime) * 0.001
      gl.uniform1f(timeLoc, time)
      gl.uniform2f(resolutionLoc, canvas.width, canvas.height)

      // Bind position buffer
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
      gl.enableVertexAttribArray(positionLoc)
      gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0)

      // Bind color buffer
      gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer)
      gl.enableVertexAttribArray(colorLoc)
      gl.vertexAttribPointer(colorLoc, 3, gl.FLOAT, false, 0, 0)

      // Draw as triangle fan (center + outer vertices)
      gl.drawArrays(gl.TRIANGLE_FAN, 0, vertices.length / 2)

      animationRef.current = requestAnimationFrame(render)
    }

    animationRef.current = requestAnimationFrame(render)

    // Return cleanup function
    return () => {
      cancelAnimationFrame(animationRef.current)
      gl.deleteProgram(program)
      gl.deleteShader(vertexShader)
      gl.deleteShader(fragmentShader)
      gl.deleteBuffer(positionBuffer)
      gl.deleteBuffer(colorBuffer)
    }
  }, [])

  useEffect(() => {
    const cleanup = initWebGL()
    return cleanup || undefined
  }, [initWebGL])

  return (
    <Box position="relative" width="100%" height="600px" bg="gray.900">
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
        }}
      />
      <Text
        position="absolute"
        top={4}
        right={4}
        color="white"
        fontSize="sm"
        fontFamily="mono"
      >
        FPS: {fps}
      </Text>
    </Box>
  )
}

// Helper function to convert HSL to RGB
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  let r, g, b

  if (s === 0) {
    r = g = b = l
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1/6) return p + (q - p) * 6 * t
      if (t < 1/2) return q
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
      return p
    }

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1/3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1/3)
  }

  return [r, g, b]
}