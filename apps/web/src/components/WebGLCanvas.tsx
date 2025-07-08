'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Box } from '@chakra-ui/react'

/**
 * Modern WebGL Canvas Component for React 19
 * 
 * Features:
 * - Automatic canvas resizing with ResizeObserver
 * - Proper WebGL context management and cleanup
 * - High DPI display support
 * - Animation loop with requestAnimationFrame
 */
export default function WebGLCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const glRef = useRef<WebGLRenderingContext | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  // Initialize WebGL context
  const initWebGL = useCallback((canvas: HTMLCanvasElement): WebGLRenderingContext | null => {
    console.log('Initializing WebGL context')
    
    // Try WebGL 1 first for better compatibility
    const gl = canvas.getContext('webgl', {
      alpha: true,
      depth: true,
      stencil: false,
      antialias: true,
      premultipliedAlpha: true,
      preserveDrawingBuffer: false,
      powerPreference: 'default',
      failIfMajorPerformanceCaveat: false
    }) as WebGLRenderingContext | null
    
    if (!gl) {
      console.error('WebGL not supported')
      return null
    }

    console.log('WebGL context created successfully')
    console.log('GL_VERSION:', gl.getParameter(gl.VERSION))
    console.log('GL_SHADING_LANGUAGE_VERSION:', gl.getParameter(gl.SHADING_LANGUAGE_VERSION))
    console.log('GL_VENDOR:', gl.getParameter(gl.VENDOR))
    console.log('GL_RENDERER:', gl.getParameter(gl.RENDERER))

    // Set viewport to match canvas size
    gl.viewport(0, 0, canvas.width, canvas.height)
    
    // Set clear color (dark blue)
    gl.clearColor(0.1, 0.1, 0.2, 1.0)
    
    // Enable depth testing
    gl.enable(gl.DEPTH_TEST)
    
    return gl
  }, [])

  // Create shader helper
  const createShader = useCallback((gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null => {
    console.log('Creating shader:', type === gl.VERTEX_SHADER ? 'vertex' : 'fragment')
    console.log('Shader source:', source)
    
    const shader = gl.createShader(type)
    if (!shader) {
      console.error('Failed to create shader object')
      return null
    }

    gl.shaderSource(shader, source)
    gl.compileShader(shader)

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader)
      const shaderType = type === gl.VERTEX_SHADER ? 'vertex' : 'fragment'
      console.error(`${shaderType} shader compilation error:`, info || 'No error info available')
      console.error('WebGL context lost?', gl.isContextLost())
      gl.deleteShader(shader)
      return null
    }

    return shader
  }, [])

  // Create shader program
  const createShaderProgram = useCallback((gl: WebGLRenderingContext): WebGLProgram | null => {
    // Vertex shader - WebGL 1.0 compatible
    const vertexShaderSource = `
      attribute vec2 a_position;
      attribute vec4 a_color;
      
      varying vec4 v_color;
      
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_color = a_color;
      }
    `

    // Fragment shader - WebGL 1.0 compatible
    const fragmentShaderSource = `
      precision mediump float;
      
      varying vec4 v_color;
      
      void main() {
        gl_FragColor = v_color;
      }
    `

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource)
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource)

    if (!vertexShader || !fragmentShader) return null

    const program = gl.createProgram()
    if (!program) return null

    gl.attachShader(program, vertexShader)
    gl.attachShader(program, fragmentShader)
    gl.linkProgram(program)

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program linking error:', gl.getProgramInfoLog(program))
      gl.deleteProgram(program)
      return null
    }

    return program
  }, [createShader])

  // Handle canvas resize
  const handleResize = useCallback((entries: ResizeObserverEntry[]) => {
    for (const entry of entries) {
      const canvas = entry.target as HTMLCanvasElement
      const { width, height } = entry.contentRect
      
      // Handle high DPI displays
      const dpr = window.devicePixelRatio || 1
      
      canvas.width = width * dpr
      canvas.height = height * dpr
      
      // Scale canvas back down using CSS
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      
      // Update WebGL viewport
      if (glRef.current) {
        glRef.current.viewport(0, 0, canvas.width, canvas.height)
      }
    }
  }, [])

  // Create buffers (moved outside animation loop for efficiency)
  const createBuffers = useCallback((gl: WebGLRenderingContext) => {
    // Triangle positions
    const positions = new Float32Array([
      -0.5, -0.5,
       0.5, -0.5,
       0.0,  0.5,
    ])

    // Triangle colors
    const colors = new Float32Array([
      1.0, 0.0, 0.0, 1.0,  // Red
      0.0, 1.0, 0.0, 1.0,  // Green
      0.0, 0.0, 1.0, 1.0,  // Blue
    ])

    const positionBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW)

    const colorBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW)

    return { positionBuffer, colorBuffer }
  }, [])

  // Animation loop
  const animate = useCallback((
    gl: WebGLRenderingContext, 
    program: WebGLProgram, 
    buffers: { positionBuffer: WebGLBuffer | null, colorBuffer: WebGLBuffer | null },
    startTime: number
  ) => {
    const render = (currentTime: number) => {
      const time = (currentTime - startTime) * 0.001 // Convert to seconds

      // Clear the canvas
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

      // Use shader program
      gl.useProgram(program)

      // Bind position buffer and set attribute
      if (buffers.positionBuffer) {
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.positionBuffer)
        const positionLocation = gl.getAttribLocation(program, 'a_position')
        gl.enableVertexAttribArray(positionLocation)
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)
      }

      // Bind color buffer and set attribute
      if (buffers.colorBuffer) {
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.colorBuffer)
        const colorLocation = gl.getAttribLocation(program, 'a_color')
        gl.enableVertexAttribArray(colorLocation)
        gl.vertexAttribPointer(colorLocation, 4, gl.FLOAT, false, 0, 0)
      }

      // Draw the triangle
      gl.drawArrays(gl.TRIANGLES, 0, 3)

      // Continue animation
      animationFrameRef.current = requestAnimationFrame(render)
    }

    animationFrameRef.current = requestAnimationFrame(render)
  }, [])

  // Initialize WebGL on mount
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = initWebGL(canvas)
    if (!gl) return

    glRef.current = gl
    
    const program = createShaderProgram(gl)
    if (!program) return

    setIsInitialized(true)

    // Set up resize observer
    const resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(canvas)

    // Trigger initial resize
    const rect = canvas.getBoundingClientRect()
    handleResize([{
      target: canvas,
      contentRect: rect,
      borderBoxSize: [{ blockSize: rect.height, inlineSize: rect.width }],
      contentBoxSize: [{ blockSize: rect.height, inlineSize: rect.width }],
      devicePixelContentBoxSize: [{ blockSize: rect.height, inlineSize: rect.width }]
    } as ResizeObserverEntry])

    // Create buffers
    const buffers = createBuffers(gl)
    
    // Start animation
    const startTime = performance.now()
    animate(gl, program, buffers, startTime)

    // Cleanup
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      resizeObserver.disconnect()
      
      // Clean up WebGL resources
      gl.deleteProgram(program)
      
      // Lose context to free GPU resources
      const loseContext = gl.getExtension('WEBGL_lose_context')
      if (loseContext) {
        loseContext.loseContext()
      }
    }
  }, [initWebGL, createShaderProgram, handleResize, createBuffers, animate])

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
      {!isInitialized && (
        <Box
          position="absolute"
          top="50%"
          left="50%"
          transform="translate(-50%, -50%)"
          color="white"
          fontSize="lg"
        >
          Initializing WebGL...
        </Box>
      )}
    </Box>
  )
}