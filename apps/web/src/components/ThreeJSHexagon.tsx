'use client'

import React, { useRef, useState, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Stats } from '@react-three/drei'
import { Box, Text } from '@chakra-ui/react'
import * as THREE from 'three'

/**
 * Animated Hexagon Mesh Component
 */
function AnimatedHexagon() {
  const meshRef = useRef<THREE.Mesh>(null)
  const geometryRef = useRef<THREE.BufferGeometry>(null)
  
  // Create hexagon geometry once
  const geometry = React.useMemo(() => {
    const shape = new THREE.Shape()
    const numSides = 6
    const radius = 1
    
    // Create hexagon shape
    for (let i = 0; i <= numSides; i++) {
      const angle = (i / numSides) * Math.PI * 2
      const x = Math.cos(angle) * radius
      const y = Math.sin(angle) * radius
      
      if (i === 0) {
        shape.moveTo(x, y)
      } else {
        shape.lineTo(x, y)
      }
    }
    
    // Create geometry from shape
    const geometry = new THREE.ShapeGeometry(shape)
    
    // Add vertex colors
    const colors = []
    const positions = geometry.attributes.position
    
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i)
      const y = positions.getY(i)
      
      // Calculate angle for color
      const angle = Math.atan2(y, x)
      const normalizedAngle = (angle + Math.PI) / (Math.PI * 2)
      const rgb = hslToRgb(normalizedAngle, 1, 0.5)
      colors.push(...rgb)
    }
    
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    
    return geometry
  }, [])
  
  // Animate every frame
  useFrame((state, delta) => {
    if (meshRef.current) {
      // Rotation
      meshRef.current.rotation.z += delta * 0.5
      
      // Update time uniform for shader
      const material = meshRef.current.material as THREE.ShaderMaterial
      if (material.uniforms?.time) {
        material.uniforms.time.value = state.clock.elapsedTime
      }
    }
  })
  
  return (
    <mesh ref={meshRef} geometry={geometry}>
      <shaderMaterial
        vertexColors
        uniforms={{
          time: { value: 0 }
        }}
        vertexShader={`
          precision mediump float;
          
          varying vec3 vColor;
          uniform float time;
          
          void main() {
            // Use the built-in color attribute
            vColor = color;
            vec3 pos = position;
            
            // Add wave effect
            if (length(pos.xy) > 0.1) {
              pos.y += sin(time + pos.x * 2.0) * 0.1;
            }
            
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
          }
        `}
        fragmentShader={`
          precision mediump float;
          
          varying vec3 vColor;
          uniform float time;
          
          void main() {
            vec3 col = vColor;
            float brightness = 0.8 + sin(time * 2.0) * 0.2;
            gl_FragColor = vec4(col * brightness, 1.0);
          }
        `}
      />
    </mesh>
  )
}

/**
 * FPS Counter Component
 */
function FPSCounter() {
  const [fps, setFps] = useState(0)
  const frameCount = useRef(0)
  const lastTime = useRef(performance.now())

  useFrame(() => {
    frameCount.current++
    const currentTime = performance.now()
    
    if (currentTime - lastTime.current > 1000) {
      setFps(Math.round((frameCount.current * 1000) / (currentTime - lastTime.current)))
      frameCount.current = 0
      lastTime.current = currentTime
    }
  })

  return null // FPS is handled in parent component
}

/**
 * Three.js Scene using React Three Fiber
 * Matches the functionality of the pure WebGL version
 */
export default function ThreeJSHexagon() {
  const [fps, setFps] = useState(0)

  return (
    <Box position="relative" width="100%" height="100%">
      <Canvas
        camera={{ position: [0, 0, 3], fov: 50 }}
        style={{ background: '#1a1a26' }}
        gl={{ antialias: true }}
        frameloop="always"
        onCreated={({ gl }) => {
          // Match the clear color of the WebGL version
          gl.setClearColor('#1a1a26')
        }}
      >
        {/* FPS Counter */}
        <FPSCounter />
        
        {/* Lighting (not needed for shader material but good to have) */}
        <ambientLight intensity={0.5} />
        
        {/* Animated Hexagon */}
        <AnimatedHexagon />
        
        {/* Interactive Controls */}
        <OrbitControls 
          enableZoom={true} 
          enablePan={false}
          enableRotate={true}
          autoRotate={false}
        />
        
        {/* Update FPS from within Canvas context */}
        {React.createElement(() => {
          const frameCount = useRef(0)
          const lastTime = useRef(performance.now())
          
          useFrame(() => {
            frameCount.current++
            const currentTime = performance.now()
            
            if (currentTime - lastTime.current > 1000) {
              setFps(Math.round((frameCount.current * 1000) / (currentTime - lastTime.current)))
              frameCount.current = 0
              lastTime.current = currentTime
            }
          })
          
          return null
        })}
      </Canvas>
      
      {/* FPS Display */}
      <Text
        position="absolute"
        top={4}
        right={4}
        color="white"
        fontSize="sm"
        fontFamily="mono"
        pointerEvents="none"
        zIndex={10}
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