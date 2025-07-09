'use client'

import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Box, Sphere, Torus } from '@react-three/drei'
import * as THREE from 'three'

/**
 * Animated 3D Box Component
 * Demonstrates the declarative React Three Fiber approach
 */
function AnimatedBox({ position }: { position: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null)
  
  // Runs every frame (60fps)
  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta
      meshRef.current.rotation.y += delta * 0.5
    }
  })
  
  return (
    <Box ref={meshRef} position={position} args={[1, 1, 1]}>
      <meshStandardMaterial color="hotpink" />
    </Box>
  )
}

/**
 * Animated Sphere with color transitions
 */
function AnimatedSphere({ position }: { position: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null)
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime) * 0.5
      
      // Animate color
      const material = meshRef.current.material as THREE.MeshStandardMaterial
      material.color.setHSL((state.clock.elapsedTime * 0.1) % 1, 0.5, 0.5)
    }
  })
  
  return (
    <Sphere ref={meshRef} position={position} args={[0.7, 32, 32]}>
      <meshStandardMaterial />
    </Sphere>
  )
}

/**
 * Animated Torus
 */
function AnimatedTorus({ position }: { position: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null)
  
  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.5
      meshRef.current.rotation.z += delta
    }
  })
  
  return (
    <Torus ref={meshRef} position={position} args={[0.7, 0.3, 16, 100]}>
      <meshStandardMaterial color="orange" metalness={0.8} roughness={0.2} />
    </Torus>
  )
}

/**
 * Modern Three.js Scene with React Three Fiber
 * 
 * Benefits over raw WebGL:
 * - Declarative component-based API
 * - Automatic render loop management
 * - Built-in helpers (lights, controls, loaders)
 * - React DevTools integration
 * - Hot module replacement
 * - Smaller, cleaner code
 */
export default function ThreeJSExample() {
  return (
    <Canvas
      camera={{ position: [0, 0, 5], fov: 75 }}
      style={{ background: '#111' }}
    >
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <pointLight position={[-10, -10, -5]} color="blue" intensity={0.5} />
      
      {/* 3D Objects */}
      <AnimatedBox position={[-2, 0, 0]} />
      <AnimatedSphere position={[0, 0, 0]} />
      <AnimatedTorus position={[2, 0, 0]} />
      
      {/* Interactive Controls */}
      <OrbitControls enableZoom={true} enablePan={true} enableRotate={true} />
      
      {/* Grid Helper */}
      <gridHelper args={[10, 10]} />
    </Canvas>
  )
}