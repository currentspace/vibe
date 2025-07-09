'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Box, Text } from '@chakra-ui/react'

/**
 * Kintsugi WebGL Component
 * Animates a slate texture that cracks and fills with flowing gold
 */
export default function KintsugiWebGL() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)
  const [fps, setFps] = useState(0)
  const [stage, setStage] = useState<'slate' | 'cracking' | 'filling' | 'flowing'>('slate')

  // Vertex shader - handles geometry transformation
  const vertexShaderSource = `
    precision mediump float;
    
    attribute vec2 a_position;
    attribute vec2 a_texCoord;
    
    uniform float u_time;
    uniform float u_crackAmount;
    
    varying vec2 v_texCoord;
    varying float v_displacement;
    
    void main() {
      vec2 position = a_position;
      
      // Add slight displacement during cracking
      if (u_crackAmount > 0.0) {
        float crack = sin(a_position.x * 10.0 + u_time) * sin(a_position.y * 10.0);
        position += crack * u_crackAmount * 0.02;
        v_displacement = crack;
      } else {
        v_displacement = 0.0;
      }
      
      gl_Position = vec4(position, 0.0, 1.0);
      v_texCoord = a_texCoord;
    }
  `

  // Fragment shader - handles texture blending and effects
  const fragmentShaderSource = `
    precision mediump float;
    
    uniform sampler2D u_slateTexture;
    uniform sampler2D u_goldTexture;
    uniform float u_time;
    uniform float u_crackAmount;
    uniform float u_goldFill;
    uniform float u_flowSpeed;
    
    varying vec2 v_texCoord;
    varying float v_displacement;
    
    // Procedural crack pattern
    float random(vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
    }
    
    float noise(vec2 st) {
      vec2 i = floor(st);
      vec2 f = fract(st);
      
      float a = random(i);
      float b = random(i + vec2(1.0, 0.0));
      float c = random(i + vec2(0.0, 1.0));
      float d = random(i + vec2(1.0, 1.0));
      
      vec2 u = f * f * (3.0 - 2.0 * f);
      
      return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
    }
    
    float crackPattern(vec2 uv) {
      // Create branching crack pattern
      float n1 = noise(uv * 5.0);
      float n2 = noise(uv * 10.0 + vec2(100.0));
      float n3 = noise(uv * 20.0 + vec2(200.0));
      
      float cracks = n1 * 0.5 + n2 * 0.3 + n3 * 0.2;
      cracks = smoothstep(0.4, 0.6, cracks);
      
      // Add some sharp edges
      float edges = abs(sin(uv.x * 30.0)) * abs(cos(uv.y * 30.0));
      cracks *= smoothstep(0.7, 0.9, edges);
      
      return cracks * u_crackAmount;
    }
    
    void main() {
      vec2 uv = v_texCoord;
      
      // Sample textures
      vec4 slate = texture2D(u_slateTexture, uv);
      
      // Animate gold texture for flow effect
      vec2 flowUV = uv;
      flowUV.x += sin(u_time * u_flowSpeed + uv.y * 5.0) * 0.01;
      flowUV.y += cos(u_time * u_flowSpeed + uv.x * 5.0) * 0.01;
      vec4 gold = texture2D(u_goldTexture, flowUV);
      
      // Generate crack mask
      float crackMask = crackPattern(uv);
      
      // Enhance gold with metallic shine
      float shimmer = sin(u_time * 3.0 + uv.x * 10.0) * 0.2 + 0.8;
      gold.rgb *= shimmer;
      
      // Mix slate and gold based on crack pattern and fill amount
      float fillMask = crackMask * u_goldFill;
      vec4 finalColor = mix(slate, gold, fillMask);
      
      // Add slight darkening at crack edges
      if (crackMask > 0.1 && crackMask < 0.9) {
        finalColor.rgb *= 0.8;
      }
      
      gl_FragColor = finalColor;
    }
  `

  const initWebGL = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return null

    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    if (!gl) {
      console.error('WebGL not supported')
      return null
    }
    
    // Type guard to ensure we have WebGLRenderingContext
    if (!('createShader' in gl)) {
      console.error('Invalid WebGL context')
      return null
    }

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

    // Create program
    const program = gl.createProgram()!
    gl.attachShader(program, vertexShader)
    gl.attachShader(program, fragmentShader)
    gl.linkProgram(program)
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program))
      return null
    }

    // Create a rectangle that covers the viewport
    const positions = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
       1,  1,
    ])
    
    const texCoords = new Float32Array([
      0, 1,
      1, 1,
      0, 0,
      1, 0,
    ])

    // Create buffers
    const positionBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW)

    const texCoordBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW)

    // Get attribute and uniform locations
    const positionLoc = gl.getAttribLocation(program, 'a_position')
    const texCoordLoc = gl.getAttribLocation(program, 'a_texCoord')
    const timeLoc = gl.getUniformLocation(program, 'u_time')
    const crackAmountLoc = gl.getUniformLocation(program, 'u_crackAmount')
    const goldFillLoc = gl.getUniformLocation(program, 'u_goldFill')
    const flowSpeedLoc = gl.getUniformLocation(program, 'u_flowSpeed')
    const slateTextureLoc = gl.getUniformLocation(program, 'u_slateTexture')
    const goldTextureLoc = gl.getUniformLocation(program, 'u_goldTexture')

    // Load textures
    const loadTexture = (gl: WebGLRenderingContext, url: string): WebGLTexture | null => {
      const texture = gl.createTexture()
      gl.bindTexture(gl.TEXTURE_2D, texture)
      
      // Put a single pixel as placeholder while loading
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
                    new Uint8Array([64, 64, 64, 255]))
      
      const image = new Image()
      image.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, texture)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image)
        
        // Set texture parameters
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
        gl.generateMipmap(gl.TEXTURE_2D)
      }
      image.src = url
      
      return texture
    }

    const slateTexture = loadTexture(gl, '/slate.png')
    const goldTexture = loadTexture(gl, '/gold.png')

    // Animation state
    let crackAmount = 0
    let goldFill = 0
    let flowSpeed = 0
    let stageStartTime = performance.now()

    // Animation loop
    let frameCount = 0
    let lastTime = performance.now()
    const startTime = performance.now()

    const render = (currentTime: number) => {
      // FPS calculation
      frameCount++
      if (currentTime - lastTime > 1000) {
        setFps(Math.round((frameCount * 1000) / (currentTime - lastTime)))
        frameCount = 0
        lastTime = currentTime
      }

      // Stage-based animation
      const stageTime = (currentTime - stageStartTime) / 1000
      
      if (stage === 'slate' && stageTime > 2) {
        setStage('cracking')
        stageStartTime = currentTime
      } else if (stage === 'cracking') {
        crackAmount = Math.min(stageTime / 2, 1) // 2 seconds to fully crack
        if (stageTime > 2) {
          setStage('filling')
          stageStartTime = currentTime
        }
      } else if (stage === 'filling') {
        goldFill = Math.min(stageTime / 3, 1) // 3 seconds to fill
        if (stageTime > 3) {
          setStage('flowing')
          flowSpeed = 1
        }
      }

      // Resize canvas if needed
      const displayWidth = canvas.clientWidth
      const displayHeight = canvas.clientHeight
      if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth
        canvas.height = displayHeight
        gl.viewport(0, 0, canvas.width, canvas.height)
      }

      // Clear and render
      gl.clearColor(0.1, 0.1, 0.1, 1)
      gl.clear(gl.COLOR_BUFFER_BIT)

      gl.useProgram(program)

      // Set uniforms
      const time = (currentTime - startTime) * 0.001
      gl.uniform1f(timeLoc, time)
      gl.uniform1f(crackAmountLoc, crackAmount)
      gl.uniform1f(goldFillLoc, goldFill)
      gl.uniform1f(flowSpeedLoc, flowSpeed)

      // Bind textures
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, slateTexture)
      gl.uniform1i(slateTextureLoc, 0)

      gl.activeTexture(gl.TEXTURE1)
      gl.bindTexture(gl.TEXTURE_2D, goldTexture)
      gl.uniform1i(goldTextureLoc, 1)

      // Bind attributes
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
      gl.enableVertexAttribArray(positionLoc)
      gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0)

      gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer)
      gl.enableVertexAttribArray(texCoordLoc)
      gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 0, 0)

      // Draw
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

      animationRef.current = requestAnimationFrame(render)
    }

    animationRef.current = requestAnimationFrame(render)

    // Cleanup
    return () => {
      cancelAnimationFrame(animationRef.current)
      gl.deleteProgram(program)
      gl.deleteShader(vertexShader)
      gl.deleteShader(fragmentShader)
      gl.deleteBuffer(positionBuffer)
      gl.deleteBuffer(texCoordBuffer)
      gl.deleteTexture(slateTexture)
      gl.deleteTexture(goldTexture)
    }
  }, [stage, vertexShaderSource, fragmentShaderSource])

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
      <Box
        position="absolute"
        top={4}
        right={4}
        color="white"
        fontSize="sm"
        fontFamily="mono"
      >
        <Text>FPS: {fps}</Text>
        <Text>Stage: {stage}</Text>
      </Box>
    </Box>
  )
}