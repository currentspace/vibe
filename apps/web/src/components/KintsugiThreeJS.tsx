'use client'

import React, { useRef, useState, useEffect, useMemo } from 'react'
import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { Box as ChakraBox, Text, VStack, HStack, Heading } from '@chakra-ui/react'
import * as THREE from 'three'

// Parameter interface
interface KintsugiParams {
  crackCount: number
  crackThickness: number
  goldIntensity: number
  goldShimmer: number
  goldFlowSpeed: number
  goldFlowAnimation: number
  crackCurviness: number
  branchProbability: number
  ambientIntensity: number
  cameraDistance: number
  bloomIntensity: number
  bloomThreshold: number
  lavaGlow: number
}

/**
 * Smooth points using Chaikin's algorithm
 */
function smoothPoints(points: THREE.Vector3[], iterations: number = 2): THREE.Vector3[] {
  let smoothed = points

  for (let iter = 0; iter < iterations; iter++) {
    const newPoints: THREE.Vector3[] = [smoothed[0].clone()]

    for (let i = 0; i < smoothed.length - 1; i++) {
      const p0 = smoothed[i]
      const p1 = smoothed[i + 1]

      // 1/4 and 3/4 points
      const q = p0.clone().lerp(p1, 0.25)
      const r = p0.clone().lerp(p1, 0.75)

      newPoints.push(q, r)
    }

    newPoints.push(smoothed[smoothed.length - 1].clone())
    smoothed = newPoints
  }

  return smoothed
}

/**
 * Generate procedural crack curves that reach edges
 */
function generateCrackCurves({
  crackCount = 5,
  branchChance = 0.3,
  curviness = 0.7,
}: {
  crackCount: number
  branchChance: number
  curviness: number
}) {
  const cracks: Array<{
    points: THREE.Vector3[]
    widths: number[]
    isBranch: boolean
    parentIdx?: number
    branchPoint?: number
  }> = []

  // Helper to get edge point
  const getEdgePoint = (t: number): THREE.Vector3 => {
    const edge = Math.floor(t * 4)
    const edgeT = (t * 4) % 1

    switch (edge) {
      case 0: // top edge
        return new THREE.Vector3(-1.99 + edgeT * 3.98, 1.99, 0.01)
      case 1: // right edge
        return new THREE.Vector3(1.99, 1.99 - edgeT * 3.98, 0.01)
      case 2: // bottom edge
        return new THREE.Vector3(1.99 - edgeT * 3.98, -1.99, 0.01)
      default: // left edge
        return new THREE.Vector3(-1.99, -1.99 + edgeT * 3.98, 0.01)
    }
  }

  // Generate main cracks
  for (let i = 0; i < crackCount; i++) {
    // Start from a random edge
    const startEdge = Math.random()
    const start = getEdgePoint(startEdge)

    // End at a different edge
    let endEdge = Math.random()
    while (Math.abs(endEdge - startEdge) < 0.15) {
      endEdge = Math.random()
    }
    const end = getEdgePoint(endEdge)

    // Generate path from start to end
    const points: THREE.Vector3[] = [start]
    const widths: number[] = [0.1] // Start thin

    const steps = 15 + Math.floor(Math.random() * 10)

    for (let j = 1; j < steps; j++) {
      const t = j / (steps - 1)

      // Base interpolation
      const basePoint = start.clone().lerp(end, t)

      // Add perpendicular displacement for curviness
      const tangent = end.clone().sub(start).normalize()
      const perpendicular = new THREE.Vector3(-tangent.y, tangent.x, 0)

      // Multiple sine waves for natural curves
      const wave1 = Math.sin(t * Math.PI * 2) * curviness * 0.5
      const wave2 = Math.sin(t * Math.PI * 4 + i) * curviness * 0.2
      const wave3 = Math.sin(t * Math.PI * 6 + i * 2) * curviness * 0.1
      const displacement = (wave1 + wave2 + wave3) * (1 - Math.pow(2 * t - 1, 4)) // Reduce at edges

      const point = basePoint.add(perpendicular.clone().multiplyScalar(displacement))
      points.push(point)

      // Vary width along the crack
      const widthBase = 1.0
      const widthVariation =
        Math.sin(t * Math.PI * 3 + i) * 0.3 + Math.sin(t * Math.PI * 7 + i * 2) * 0.2
      const edgeTaper = Math.min(t * 5, (1 - t) * 5, 1) // Taper at edges
      widths.push(widthBase * (1 + widthVariation) * edgeTaper)
    }

    points.push(end)
    widths.push(0.1) // End thin

    // Smooth the points
    const smoothedPoints = smoothPoints(points, 2)

    // Adjust widths array to match smoothed points
    const smoothedWidths: number[] = []
    const widthStep = widths.length / smoothedPoints.length
    for (let i = 0; i < smoothedPoints.length; i++) {
      const widthIdx = Math.min(Math.floor(i * widthStep), widths.length - 1)
      smoothedWidths.push(widths[widthIdx])
    }

    cracks.push({
      points: smoothedPoints,
      widths: smoothedWidths,
      isBranch: false,
    })

    // Add branches
    if (Math.random() < branchChance) {
      const branchCount = 1 + Math.floor(Math.random() * 2)

      for (let b = 0; b < branchCount; b++) {
        // Pick a point on the main crack to branch from
        const branchT = 0.2 + Math.random() * 0.6 // Avoid edges
        const branchIndex = Math.floor(branchT * (smoothedPoints.length - 1))
        const branchStart = smoothedPoints[branchIndex].clone()
        const parentWidth = smoothedWidths[branchIndex]

        // Determine branch direction
        const mainDirection = smoothedPoints[Math.min(branchIndex + 1, smoothedPoints.length - 1)]
          .clone()
          .sub(smoothedPoints[Math.max(branchIndex - 1, 0)])
          .normalize()
        const branchDirection = new THREE.Vector3(-mainDirection.y, mainDirection.x, 0)
        if (Math.random() > 0.5) branchDirection.multiplyScalar(-1)

        // Branch end point
        const branchLength = 0.5 + Math.random() * 1.5
        const branchEnd = branchStart.clone().add(branchDirection.multiplyScalar(branchLength))

        // Keep within bounds
        branchEnd.x = Math.max(-1.99, Math.min(1.99, branchEnd.x))
        branchEnd.y = Math.max(-1.99, Math.min(1.99, branchEnd.y))

        const branchPoints: THREE.Vector3[] = [branchStart]
        const branchWidths: number[] = [parentWidth * 0.7] // Start from parent width

        const branchSteps = 8 + Math.floor(Math.random() * 5)

        for (let j = 1; j < branchSteps; j++) {
          const t = j / (branchSteps - 1)

          // Base interpolation
          const basePoint = branchStart.clone().lerp(branchEnd, t)

          // Add curviness
          const perpendicular = new THREE.Vector3(-branchDirection.y, branchDirection.x, 0)
          const wave = Math.sin(t * Math.PI * 2) * curviness * 0.3
          const point = basePoint.add(perpendicular.clone().multiplyScalar(wave))

          branchPoints.push(point)

          // Taper width
          const taper = 1 - t * 0.8
          branchWidths.push(parentWidth * 0.7 * taper)
        }

        branchPoints.push(branchEnd)
        branchWidths.push(0.05) // Very thin at end

        if (branchPoints.length > 2) {
          const smoothedBranch = smoothPoints(branchPoints, 1)
          const smoothedBranchWidths: number[] = []
          const branchWidthStep = branchWidths.length / smoothedBranch.length
          for (let i = 0; i < smoothedBranch.length; i++) {
            const widthIdx = Math.min(Math.floor(i * branchWidthStep), branchWidths.length - 1)
            smoothedBranchWidths.push(branchWidths[widthIdx])
          }

          cracks.push({
            points: smoothedBranch,
            widths: smoothedBranchWidths,
            isBranch: true,
            parentIdx: i,
            branchPoint: branchIndex,
          })
        }
      }
    }
  }

  return cracks
}

/**
 * Create custom geometry for variable-width cracks with soft edges
 */
function createCrackGeometry(
  points: THREE.Vector3[],
  widths: number[],
  thickness: number,
): THREE.BufferGeometry {
  const vertices: number[] = []
  const normals: number[] = []
  const uvs: number[] = []
  const indices: number[] = []

  // Generate ribbon geometry
  let totalLength = 0
  const lengths: number[] = [0]

  for (let i = 1; i < points.length; i++) {
    const segmentLength = points[i].distanceTo(points[i - 1])
    totalLength += segmentLength
    lengths.push(totalLength)
  }

  // Create vertices along the crack
  for (let i = 0; i < points.length; i++) {
    const t = lengths[i] / totalLength
    const width = widths[i] * thickness * 0.03

    // Calculate perpendicular direction
    let direction: THREE.Vector3
    if (i === 0) {
      direction = points[1].clone().sub(points[0]).normalize()
    } else if (i === points.length - 1) {
      direction = points[i]
        .clone()
        .sub(points[i - 1])
        .normalize()
    } else {
      const prev = points[i]
        .clone()
        .sub(points[i - 1])
        .normalize()
      const next = points[i + 1].clone().sub(points[i]).normalize()
      direction = prev.add(next).normalize()
    }

    const perpendicular = new THREE.Vector3(-direction.y, direction.x, 0)

    // Left vertex
    vertices.push(
      points[i].x - perpendicular.x * width,
      points[i].y - perpendicular.y * width,
      points[i].z,
    )
    normals.push(0, 0, 1)
    uvs.push(0, t)

    // Right vertex
    vertices.push(
      points[i].x + perpendicular.x * width,
      points[i].y + perpendicular.y * width,
      points[i].z,
    )
    normals.push(0, 0, 1)
    uvs.push(1, t)
  }

  // Create triangles
  for (let i = 0; i < points.length - 1; i++) {
    const a = i * 2
    const b = i * 2 + 1
    const c = (i + 1) * 2
    const d = (i + 1) * 2 + 1

    indices.push(a, c, b)
    indices.push(b, c, d)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)

  return geometry
}

/**
 * Kintsugi Mesh Component with gold crack lines
 */
function KintsugiMesh({ params }: { params: KintsugiParams }) {
  const groupRef = useRef<THREE.Group>(null)
  const sharedMaterialRef = useRef<THREE.ShaderMaterial>(null)

  // Load textures
  const [slateTexture, goldTexture] = useLoader(THREE.TextureLoader, ['/slate.png', '/gold.png'])

  // Optional: Load normal map if it exists
  const slateNormalMap = useLoader(THREE.TextureLoader, '/slate_normal.png')

  // Set texture properties and renderer clipping
  useEffect(() => {
    slateTexture.wrapS = slateTexture.wrapT = THREE.ClampToEdgeWrapping
    goldTexture.wrapS = goldTexture.wrapT = THREE.RepeatWrapping
    // Smaller repeat for more visible flow pattern
    goldTexture.repeat.set(0.2, 0.5)
    slateTexture.magFilter = THREE.LinearFilter
    slateTexture.minFilter = THREE.LinearMipmapLinearFilter
    goldTexture.magFilter = THREE.LinearFilter
    goldTexture.minFilter = THREE.LinearMipmapLinearFilter

    slateNormalMap.wrapS = slateNormalMap.wrapT = THREE.ClampToEdgeWrapping
  }, [slateTexture, goldTexture, slateNormalMap])

  // Generate crack geometries
  const crackData = useMemo(() => {
    const curves = generateCrackCurves({
      crackCount: params.crackCount,
      branchChance: params.branchProbability,
      curviness: params.crackCurviness,
    })

    return curves.map((crack) => ({
      geometry: createCrackGeometry(crack.points, crack.widths, params.crackThickness),
      isBranch: crack.isBranch,
    }))
  }, [params.crackCount, params.crackThickness, params.branchProbability, params.crackCurviness])

  // Create shared shader material for all cracks
  const goldMaterial = useMemo(() => {
    const material = new THREE.ShaderMaterial({
      uniforms: {
        goldTexture: { value: goldTexture },
        time: { value: 0 },
        flowSpeed: { value: params.goldFlowSpeed },
        shimmerIntensity: { value: params.goldShimmer },
        goldIntensity: { value: params.goldIntensity },
        lavaGlow: { value: params.lavaGlow },
        flowAnimation: { value: params.goldFlowAnimation },
        crackIndices: { value: new Float32Array(crackData.length).map((_, i) => i) },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vPosition;
        attribute float crackIndex;
        varying float vCrackIndex;
        
        void main() {
          vUv = uv;
          vPosition = position;
          vCrackIndex = crackIndex;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D goldTexture;
        uniform float time;
        uniform float flowSpeed;
        uniform float shimmerIntensity;
        uniform float goldIntensity;
        uniform float lavaGlow;
        uniform float flowAnimation;
        
        varying vec2 vUv;
        varying vec3 vPosition;
        varying float vCrackIndex;
        
        void main() {
          // Soft edge alpha
          float edgeAlpha = smoothstep(0.02, 0.15, min(vUv.x, 1.0 - vUv.x));
          
          // Flow animation along crack length - make it flow along the crack
          vec2 flowUv = vUv;
          // Primary flow along the crack (y direction in UV space)
          flowUv.y += time * flowSpeed * 0.5;
          // Add some perpendicular waviness
          flowUv.x += sin(flowUv.y * 8.0 + time * 2.0) * 0.1;
          
          // Secondary flow layer for complexity
          vec2 flowUv2 = vUv;
          flowUv2.y += time * flowSpeed * 0.3;
          flowUv2.x += cos(flowUv2.y * 6.0 + time * 1.5) * 0.08;
          
          // Tertiary micro flow
          vec2 flowUv3 = vUv * 3.0;
          flowUv3.y += time * flowSpeed * 1.2;
          
          // Sample gold texture with multiple layers
          vec4 gold1 = texture2D(goldTexture, flowUv);
          vec4 gold2 = texture2D(goldTexture, flowUv2);
          vec4 gold3 = texture2D(goldTexture, flowUv3);
          vec4 gold = gold1 * 0.5 + gold2 * 0.3 + gold3 * 0.2;
          
          // Create flowing lava effect that moves along the crack
          float flowPosition = vUv.y - time * flowSpeed * 0.5;
          
          // Multiple wave frequencies for natural lava flow
          float wave1 = sin(flowPosition * 10.0) * 0.5 + 0.5;
          float wave2 = sin(flowPosition * 25.0 + 2.0) * 0.3 + 0.7;
          float wave3 = sin(flowPosition * 40.0 - 1.0) * 0.2 + 0.8;
          float flowing = wave1 * wave2 * wave3;
          
          // Pulsing glow that travels with the flow
          float pulse = sin(flowPosition * 15.0 + time * 2.0) * 0.5 + 0.5;
          float glow = pulse * lavaGlow * flowing;
          
          // Shimmer waves
          float shimmer1 = sin(time * 4.0 + vPosition.x * 20.0 + vPosition.y * 20.0) * shimmerIntensity;
          float shimmer2 = sin(time * 6.0 - vPosition.x * 15.0 + vPosition.y * 25.0) * shimmerIntensity * 0.5;
          float shimmer = 1.0 + shimmer1 + shimmer2;
          
          // Hot spots that flow along the crack
          float hotFlow = vUv.y - time * flowSpeed * 0.7;
          float hotspot1 = smoothstep(0.4, 0.6, sin(hotFlow * 30.0));
          float hotspot2 = smoothstep(0.3, 0.7, sin(hotFlow * 20.0 + 3.14));
          float hotspot = (hotspot1 + hotspot2 * 0.5) * lavaGlow * flowAnimation;
          
          // Combine effects
          vec3 finalColor = gold.rgb * goldIntensity;
          finalColor *= (glow * 0.7 + 0.3) * shimmer * (flowing * 0.5 + 0.5);
          
          // Add orange/red tints for lava effect
          finalColor.r += hotspot * 0.4 * lavaGlow;
          finalColor.g += hotspot * 0.15 * lavaGlow;
          
          // Emit light
          vec3 emission = vec3(1.0, 0.7, 0.3) * goldIntensity * 0.6 * (glow + hotspot * 0.5);
          
          gl_FragColor = vec4(finalColor + emission, edgeAlpha);
        }
      `,
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })

    sharedMaterialRef.current = material
    return material
  }, [
    goldTexture,
    params.goldFlowSpeed,
    params.goldShimmer,
    params.goldIntensity,
    params.goldFlowAnimation,
    params.lavaGlow,
    crackData.length,
  ])

  // Update uniforms when params change
  useEffect(() => {
    if (sharedMaterialRef.current) {
      sharedMaterialRef.current.uniforms.flowSpeed.value = params.goldFlowSpeed
      sharedMaterialRef.current.uniforms.shimmerIntensity.value = params.goldShimmer
      sharedMaterialRef.current.uniforms.goldIntensity.value = params.goldIntensity
      sharedMaterialRef.current.uniforms.lavaGlow.value = params.lavaGlow
      sharedMaterialRef.current.uniforms.flowAnimation.value = params.goldFlowAnimation
    }
  }, [
    params.goldFlowSpeed,
    params.goldShimmer,
    params.goldIntensity,
    params.lavaGlow,
    params.goldFlowAnimation,
  ])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Dispose geometries
      crackData.forEach((crack) => {
        crack.geometry.dispose()
      })
      // Dispose material
      if (sharedMaterialRef.current) {
        sharedMaterialRef.current.dispose()
      }
    }
  }, [crackData])

  // Animation loop
  useFrame((state) => {
    if (!groupRef.current) return

    const time = state.clock.elapsedTime

    // Update shader uniforms
    if (sharedMaterialRef.current) {
      sharedMaterialRef.current.uniforms.time.value = time
    }

    // No rotation - keep the slate flat
  })

  return (
    <group ref={groupRef}>
      {/* Slate background with clipping mask */}
      <mesh position={[0, 0, -0.001]} renderOrder={1}>
        <planeGeometry args={[4, 4]} />
        <meshStandardMaterial
          map={slateTexture}
          roughness={0.9}
          metalness={0.1}
          // Normal map would go here: normalMap={slateNormalMap}
        />
      </mesh>

      {/* Black frame around slate to hide bloom outside */}
      <group>
        {/* Top */}
        <mesh position={[0, 4, -0.002]} renderOrder={0}>
          <planeGeometry args={[20, 8]} />
          <meshBasicMaterial color="#000000" />
        </mesh>
        {/* Bottom */}
        <mesh position={[0, -4, -0.002]} renderOrder={0}>
          <planeGeometry args={[20, 8]} />
          <meshBasicMaterial color="#000000" />
        </mesh>
        {/* Left */}
        <mesh position={[-4, 0, -0.002]} renderOrder={0}>
          <planeGeometry args={[8, 20]} />
          <meshBasicMaterial color="#000000" />
        </mesh>
        {/* Right */}
        <mesh position={[4, 0, -0.002]} renderOrder={0}>
          <planeGeometry args={[8, 20]} />
          <meshBasicMaterial color="#000000" />
        </mesh>
      </group>

      {/* Gold cracks */}
      {crackData.map((crack, index) => (
        <mesh key={index} geometry={crack.geometry} renderOrder={3}>
          <primitive object={goldMaterial} attach="material" />
        </mesh>
      ))}

      {/* Bloom lighting for gold glow */}
      <pointLight position={[0, 0, 1]} intensity={params.goldIntensity * 0.5} color="#ffaa44" />
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
  step = 0.01,
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
        <Text fontSize="sm" fontWeight="medium">
          {label}
        </Text>
        <Text fontSize="sm" color="gray.600">
          {value.toFixed(2)}
        </Text>
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
          cursor: 'pointer',
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
    crackCount: 5,
    crackThickness: 0.5,
    goldIntensity: 1.2,
    goldShimmer: 0.3,
    goldFlowSpeed: 0.8,
    goldFlowAnimation: 1.2,
    crackCurviness: 0.7,
    branchProbability: 0.4,
    ambientIntensity: 0.6,
    cameraDistance: 5,
    bloomIntensity: 1.5,
    bloomThreshold: 0.2,
    lavaGlow: 1.2,
  })

  const updateParam = (key: keyof KintsugiParams) => (value: number) => {
    setParams((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <HStack width="100%" height="100%" gap={0} flexDirection={{ base: 'column', lg: 'row' }}>
      {/* 3D Scene */}
      <ChakraBox position="relative" flex={1} height={{ base: '60vh', lg: '100%' }} width="100%">
        <Canvas
          camera={{ position: [0, 0, params.cameraDistance], fov: 50 }}
          style={{ background: '#000000' }}
          gl={{
            antialias: true,
            alpha: false,
            stencil: false,
            powerPreference: 'high-performance',
          }}
        >
          {/* FPS Counter */}
          <FPSCounter onFpsUpdate={setFps} />

          {/* Lighting */}
          <ambientLight intensity={params.ambientIntensity} />
          <directionalLight position={[5, 5, 5]} intensity={1.0} castShadow />
          <directionalLight position={[-5, 5, 3]} intensity={0.5} color="#fff5ee" />

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

          {/* Post-processing effects */}
          <EffectComposer>
            <Bloom
              luminanceThreshold={params.bloomThreshold}
              luminanceSmoothing={0.9}
              intensity={params.bloomIntensity}
              radius={0.8}
            />
          </EffectComposer>
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
        width={{ base: '100%', lg: '300px' }}
        height={{ base: '40vh', lg: '100%' }}
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
            min={1}
            max={10}
            step={1}
          />
          <ParamSlider
            label="Crack Thickness"
            value={params.crackThickness}
            onChange={updateParam('crackThickness')}
            min={0}
            max={1}
          />
          <ParamSlider
            label="Crack Curviness"
            value={params.crackCurviness}
            onChange={updateParam('crackCurviness')}
            min={0}
            max={2}
          />
          <ParamSlider
            label="Branch Probability"
            value={params.branchProbability}
            onChange={updateParam('branchProbability')}
            min={0}
            max={1}
          />
        </VStack>

        <VStack align="stretch" gap={4}>
          <Heading size="sm">Gold Properties</Heading>
          <ParamSlider
            label="Gold Brightness"
            value={params.goldIntensity}
            onChange={updateParam('goldIntensity')}
            min={0.5}
            max={2}
          />
          <ParamSlider
            label="Lava Glow"
            value={params.lavaGlow}
            onChange={updateParam('lavaGlow')}
            min={0}
            max={2}
          />
          <ParamSlider
            label="Flow Speed"
            value={params.goldFlowSpeed}
            onChange={updateParam('goldFlowSpeed')}
            min={0}
            max={3}
          />
          <ParamSlider
            label="Flow Animation"
            value={params.goldFlowAnimation}
            onChange={updateParam('goldFlowAnimation')}
            min={0}
            max={2}
          />
          <ParamSlider
            label="Shimmer"
            value={params.goldShimmer}
            onChange={updateParam('goldShimmer')}
            min={0}
            max={0.5}
          />
        </VStack>

        <VStack align="stretch" gap={4}>
          <Heading size="sm">Post-Processing</Heading>
          <ParamSlider
            label="Bloom Intensity"
            value={params.bloomIntensity}
            onChange={updateParam('bloomIntensity')}
            min={0}
            max={3}
          />
          <ParamSlider
            label="Bloom Threshold"
            value={params.bloomThreshold}
            onChange={updateParam('bloomThreshold')}
            min={0}
            max={1}
          />
        </VStack>

        <VStack align="stretch" gap={4}>
          <Heading size="sm">Scene</Heading>
          <ParamSlider
            label="Brightness"
            value={params.ambientIntensity}
            onChange={updateParam('ambientIntensity')}
            min={0.3}
            max={1}
          />
          <ParamSlider
            label="Camera Distance"
            value={params.cameraDistance}
            onChange={updateParam('cameraDistance')}
            min={3}
            max={8}
          />
        </VStack>
      </VStack>
    </HStack>
  )
}
