'use client'

import React, { useRef, useState, useEffect, useMemo } from 'react'
import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { 
  Box as ChakraBox, 
  Text, 
  VStack, 
  HStack,
  Heading
} from '@chakra-ui/react'
import * as THREE from 'three'

// Parameter interface
interface KintsugiParams {
  crackCount: number
  separation: number
  goldThickness: number
  goldShimmer: number
  goldFlowSpeed: number
  crackJaggedness: number
  lightIntensity: number
  ambientIntensity: number
  rotationSpeed: number
  cameraDistance: number
}

/**
 * Kintsugi Mesh Component with customizable parameters
 */
function KintsugiMesh({ params }: { params: KintsugiParams }) {
  const groupRef = useRef<THREE.Group>(null)
  const crackMaterialRef = useRef<THREE.ShaderMaterial>(null)
  
  // Load textures
  const [slateTexture, goldTexture] = useLoader(THREE.TextureLoader, [
    '/slate.png',
    '/gold.png'
  ])
  
  // Set texture wrapping and scaling
  useEffect(() => {
    slateTexture.wrapS = slateTexture.wrapT = THREE.ClampToEdgeWrapping
    goldTexture.wrapS = goldTexture.wrapT = THREE.RepeatWrapping
    slateTexture.magFilter = THREE.LinearFilter
    slateTexture.minFilter = THREE.LinearMipmapLinearFilter
  }, [slateTexture, goldTexture])

  // Create geometry pieces based on crack pattern
  const pieces = useMemo(() => {
    const centerPoint = new THREE.Vector2(0.5, 0.5)
    const pieceData: Array<{
      geometry: THREE.BufferGeometry,
      position: THREE.Vector3,
      direction: THREE.Vector2,
      vertices: THREE.Vector2[]
    }> = []

    // Random function for natural variations
    const random = (seed: number) => {
      const x = Math.sin(seed) * 10000
      return x - Math.floor(x)
    }

    // Create cracks radiating from center
    const angleStep = (Math.PI * 2) / params.crackCount
    const centerJitter = 0.05 * params.crackJaggedness
    
    for (let i = 0; i < params.crackCount; i++) {
      const angle1 = i * angleStep + (random(i * 2) - 0.5) * 0.2 * params.crackJaggedness
      const angle2 = (i + 1) * angleStep + (random((i + 1) * 2) - 0.5) * 0.2 * params.crackJaggedness
      
      // Add variation to center point for each piece
      const pieceCenter = new THREE.Vector2(
        0.5 + (random(i * 3) - 0.5) * centerJitter,
        0.5 + (random(i * 3 + 1) - 0.5) * centerJitter
      )
      
      // Create vertices for this piece with irregular edges
      const vertices: THREE.Vector2[] = [pieceCenter]
      
      // Create edge points with natural variation
      const edgePoints = Math.floor(6 + params.crackJaggedness * 4)
      for (let j = 0; j <= edgePoints; j++) {
        const t = j / edgePoints
        const angle = angle1 + (angle2 - angle1) * t
        
        // Add jaggedness to the radius
        const radiusVariation = 0.4 + random(i * 100 + j) * 0.2
        const jitter = (random(i * 50 + j * 2) - 0.5) * 0.03 * params.crackJaggedness
        
        vertices.push(new THREE.Vector2(
          0.5 + Math.cos(angle) * radiusVariation + jitter,
          0.5 + Math.sin(angle) * radiusVariation + jitter
        ))
      }
      
      // Create geometry using triangulation
      const geometry = new THREE.BufferGeometry()
      const positions: number[] = []
      const uvs: number[] = []
      
      // Fan triangulation from center
      for (let j = 1; j < vertices.length - 1; j++) {
        positions.push(
          (vertices[0].x - 0.5) * 4, (vertices[0].y - 0.5) * 4, 0,
          (vertices[j].x - 0.5) * 4, (vertices[j].y - 0.5) * 4, 0,
          (vertices[j + 1].x - 0.5) * 4, (vertices[j + 1].y - 0.5) * 4, 0
        )
        
        uvs.push(
          vertices[0].x, vertices[0].y,
          vertices[j].x, vertices[j].y,
          vertices[j + 1].x, vertices[j + 1].y
        )
      }
      
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3))
      geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2))
      geometry.computeVertexNormals()
      
      // Calculate piece center and movement direction
      const avgX = vertices.reduce((sum, v) => sum + v.x, 0) / vertices.length
      const avgY = vertices.reduce((sum, v) => sum + v.y, 0) / vertices.length
      const avgCenter = new THREE.Vector2(avgX, avgY)
      
      const direction = avgCenter.clone().sub(centerPoint).normalize()
      
      pieceData.push({
        geometry,
        position: new THREE.Vector3(0, 0, 0),
        direction,
        vertices
      })
    }
    
    return pieceData
  }, [params.crackCount, params.crackJaggedness])

  // Create shader material for cracks/gold
  const crackMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        u_goldTexture: { value: goldTexture },
        u_time: { value: 0 },
        u_goldThickness: { value: params.goldThickness },
        u_shimmerIntensity: { value: params.goldShimmer },
        u_flowSpeed: { value: params.goldFlowSpeed }
      },
      side: THREE.DoubleSide,
      transparent: true,
      vertexShader: `
        varying vec2 vUv;
        
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        
        uniform sampler2D u_goldTexture;
        uniform float u_time;
        uniform float u_goldThickness;
        uniform float u_shimmerIntensity;
        uniform float u_flowSpeed;
        
        varying vec2 vUv;
        
        void main() {
          // Animate gold texture for flow effect
          vec2 flowUV = vUv;
          flowUV.x += sin(u_time * u_flowSpeed * 2.0 + vUv.y * 10.0) * 0.02;
          flowUV.y += cos(u_time * u_flowSpeed * 2.0 + vUv.x * 10.0) * 0.02;
          
          // Add more complex flow patterns
          flowUV.x += sin(u_time * u_flowSpeed * 1.5 + vUv.x * 15.0) * 0.01;
          flowUV.y += cos(u_time * u_flowSpeed * 1.3 + vUv.y * 12.0) * 0.01;
          
          vec4 gold = texture2D(u_goldTexture, flowUV);
          
          // Enhance gold with metallic shine
          float shimmer = sin(u_time * 3.0 + vUv.x * 20.0 + vUv.y * 15.0) * u_shimmerIntensity + (1.0 - u_shimmerIntensity * 0.5);
          shimmer += sin(u_time * 2.0 + vUv.y * 25.0) * u_shimmerIntensity * 0.3;
          gold.rgb *= shimmer;
          
          // Adjust alpha based on thickness parameter
          gl_FragColor = vec4(gold.rgb, u_goldThickness);
        }
      `
    })
  }, [goldTexture, params.goldThickness, params.goldShimmer, params.goldFlowSpeed])

  // Update shader uniforms when params change
  useEffect(() => {
    if (crackMaterialRef.current) {
      crackMaterialRef.current.uniforms.u_goldThickness.value = params.goldThickness
      crackMaterialRef.current.uniforms.u_shimmerIntensity.value = params.goldShimmer
      crackMaterialRef.current.uniforms.u_flowSpeed.value = params.goldFlowSpeed
    }
  }, [params.goldThickness, params.goldShimmer, params.goldFlowSpeed])

  // Animation loop
  useFrame((state) => {
    if (!groupRef.current) return
    
    const currentTime = state.clock.elapsedTime
    
    // Update time uniform
    if (crackMaterialRef.current) {
      crackMaterialRef.current.uniforms.u_time.value = currentTime
    }
    
    // Move pieces apart based on separation parameter
    groupRef.current.children.forEach((child, index) => {
      if (child instanceof THREE.Mesh && pieces[index]) {
        const piece = pieces[index]
        child.position.x = piece.direction.x * params.separation * 0.3
        child.position.y = piece.direction.y * params.separation * 0.3
        child.position.z = Math.sin(index) * params.separation * 0.05
      }
    })
    
    // Rotation based on speed parameter
    groupRef.current.rotation.y += params.rotationSpeed * 0.01
    groupRef.current.rotation.x = Math.sin(currentTime * 0.1) * 0.05
  })

  return (
    <group ref={groupRef}>
      {/* Render each piece */}
      {pieces.map((piece, index) => (
        <mesh key={index} geometry={piece.geometry}>
          <meshBasicMaterial map={slateTexture} />
        </mesh>
      ))}
      
      {/* Gold/crack plane behind pieces */}
      {params.separation > 0 && (
        <mesh position={[0, 0, -0.1]}>
          <planeGeometry args={[4, 4]} />
          <primitive object={crackMaterial} ref={crackMaterialRef} attach="material" />
        </mesh>
      )}
    </group>
  )
}

/**
 * FPS Counter Component
 */
function FPSCounter({ onFpsUpdate }: { onFpsUpdate: (fps: number) => void }) {
  const frameCount = useRef(0)
  const lastTime = useRef(performance.now())

  useFrame(() => {
    frameCount.current++
    const currentTime = performance.now()
    
    if (currentTime - lastTime.current > 1000) {
      onFpsUpdate(Math.round((frameCount.current * 1000) / (currentTime - lastTime.current)))
      frameCount.current = 0
      lastTime.current = currentTime
    }
  })

  return null
}

/**
 * Parameter Slider Component
 */
function ParamSlider({ 
  label, 
  value, 
  onChange, 
  min = 0, 
  max = 1, 
  step = 0.01
}: {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
}) {
  return (
    <VStack align="stretch" gap={1}>
      <HStack justify="space-between">
        <Text fontSize="sm" fontWeight="medium">{label}</Text>
        <Text fontSize="sm" color="gray.600">{value.toFixed(2)}</Text>
      </HStack>
      <input
        type="range"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        min={min}
        max={max}
        step={step}
        style={{
          width: '100%',
          height: '4px',
          background: '#e2e8f0',
          borderRadius: '2px',
          outline: 'none',
          cursor: 'pointer'
        }}
      />
    </VStack>
  )
}

/**
 * Kintsugi Three.js Scene with Parameter Controls
 */
export default function KintsugiThreeJS() {
  const [fps, setFps] = useState(0)
  const [params, setParams] = useState<KintsugiParams>({
    crackCount: 6,
    separation: 1,
    goldThickness: 0.8,
    goldShimmer: 0.5,
    goldFlowSpeed: 0.5,
    crackJaggedness: 0.5,
    lightIntensity: 0.8,
    ambientIntensity: 0.7,
    rotationSpeed: 0.2,
    cameraDistance: 5
  })

  const updateParam = (key: keyof KintsugiParams) => (value: number) => {
    setParams(prev => ({ ...prev, [key]: value }))
  }

  return (
    <HStack width="100%" height="100%" gap={0}>
      {/* 3D Scene */}
      <ChakraBox position="relative" flex={1} height="100%">
        <Canvas
          camera={{ position: [0, 0, params.cameraDistance], fov: 50 }}
          style={{ background: '#1a1a1a' }}
          gl={{ antialias: true }}
        >
          {/* FPS Counter */}
          <FPSCounter onFpsUpdate={setFps} />
          
          {/* Lighting */}
          <ambientLight intensity={params.ambientIntensity} />
          <directionalLight 
            position={[10, 10, 5]} 
            intensity={params.lightIntensity} 
            castShadow 
          />
          <directionalLight 
            position={[-5, 5, 5]} 
            intensity={params.lightIntensity * 0.6} 
            color="#ffeecc" 
          />
          <pointLight position={[0, 0, 10]} intensity={params.lightIntensity * 0.4} />
          
          {/* Kintsugi Mesh */}
          <React.Suspense fallback={null}>
            <KintsugiMesh params={params} />
          </React.Suspense>
          
          {/* Interactive Controls */}
          <OrbitControls 
            enableZoom={true} 
            enablePan={false}
            enableRotate={true}
            minDistance={3}
            maxDistance={10}
          />
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
      </ChakraBox>
      
      {/* Parameter Controls */}
      <VStack
        width="300px"
        height="100%"
        bg="gray.50"
        p={4}
        overflowY="auto"
        align="stretch"
        gap={6}
      >
        <Heading size="md">Kintsugi Parameters</Heading>
        
        <VStack align="stretch" gap={4}>
          <Heading size="sm">Crack Properties</Heading>
          <ParamSlider 
            label="Crack Count" 
            value={params.crackCount} 
            onChange={updateParam('crackCount')}
            min={3}
            max={12}
            step={1}
          />
          <ParamSlider 
            label="Separation" 
            value={params.separation} 
            onChange={updateParam('separation')}
            min={0}
            max={2}
          />
          <ParamSlider 
            label="Crack Jaggedness" 
            value={params.crackJaggedness} 
            onChange={updateParam('crackJaggedness')}
            min={0}
            max={1}
          />
        </VStack>
        
        <VStack align="stretch" gap={4}>
          <Heading size="sm">Gold Properties</Heading>
          <ParamSlider 
            label="Gold Thickness" 
            value={params.goldThickness} 
            onChange={updateParam('goldThickness')}
            min={0}
            max={1}
          />
          <ParamSlider 
            label="Gold Shimmer" 
            value={params.goldShimmer} 
            onChange={updateParam('goldShimmer')}
            min={0}
            max={1}
          />
          <ParamSlider 
            label="Flow Speed" 
            value={params.goldFlowSpeed} 
            onChange={updateParam('goldFlowSpeed')}
            min={0}
            max={2}
          />
        </VStack>
        
        <VStack align="stretch" gap={4}>
          <Heading size="sm">Lighting</Heading>
          <ParamSlider 
            label="Light Intensity" 
            value={params.lightIntensity} 
            onChange={updateParam('lightIntensity')}
            min={0}
            max={2}
          />
          <ParamSlider 
            label="Ambient Light" 
            value={params.ambientIntensity} 
            onChange={updateParam('ambientIntensity')}
            min={0}
            max={1}
          />
        </VStack>
        
        <VStack align="stretch" gap={4}>
          <Heading size="sm">Camera & Animation</Heading>
          <ParamSlider 
            label="Rotation Speed" 
            value={params.rotationSpeed} 
            onChange={updateParam('rotationSpeed')}
            min={0}
            max={1}
          />
          <ParamSlider 
            label="Camera Distance" 
            value={params.cameraDistance} 
            onChange={updateParam('cameraDistance')}
            min={3}
            max={10}
          />
        </VStack>
      </VStack>
    </HStack>
  )
}