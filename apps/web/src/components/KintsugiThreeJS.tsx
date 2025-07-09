'use client'

import React, { useRef, useState, useEffect, useMemo } from 'react'
import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { Box as ChakraBox, Text, VStack, HStack, Heading, Button } from '@chakra-ui/react'
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
  seed = 0,
}: {
  crackCount: number
  branchChance: number
  curviness: number
  seed?: number
}) {
  // Seeded random function
  const seededRandom = (s: number) => {
    const x = Math.sin(s + seed) * 10000
    return x - Math.floor(x)
  }
  const cracks: Array<{
    points: THREE.Vector3[]
    widths: number[]
    isBranch: boolean
    parentIdx?: number
    branchPoint?: number
  }> = []

  // Helper to get edge point - ensure points are exactly on the edge
  const getEdgePoint = (t: number): THREE.Vector3 => {
    const edge = Math.floor(t * 4)
    const edgeT = (t * 4) % 1

    switch (edge) {
      case 0: // top edge
        return new THREE.Vector3(-2.0 + edgeT * 4.0, 2.0, 0)
      case 1: // right edge
        return new THREE.Vector3(2.0, 2.0 - edgeT * 4.0, 0)
      case 2: // bottom edge
        return new THREE.Vector3(2.0 - edgeT * 4.0, -2.0, 0)
      default: // left edge
        return new THREE.Vector3(-2.0, -2.0 + edgeT * 4.0, 0)
    }
  }

  // Generate main cracks
  for (let i = 0; i < crackCount; i++) {
    // Start from a random edge
    const startEdge = seededRandom(i * 100)
    const start = getEdgePoint(startEdge)

    // End at a different edge
    let endEdge = seededRandom(i * 100 + 1)
    while (Math.abs(endEdge - startEdge) < 0.15) {
      endEdge = seededRandom(i * 100 + Math.random() * 1000)
    }
    const end = getEdgePoint(endEdge)

    // Generate path from start to end
    const points: THREE.Vector3[] = [start]
    const widths: number[] = [0.0] // Start at zero width for sharp point

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
    widths.push(0.0) // End at zero width for sharp point

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

        // Branch end point - try to reach an edge
        const branchLength = 0.5 + Math.random() * 1.5
        let branchEnd = branchStart.clone().add(branchDirection.multiplyScalar(branchLength))

        // Extend branch to reach nearest edge
        const distToEdges = [
          Math.abs(2.0 - branchEnd.x), // right edge
          Math.abs(-2.0 - branchEnd.x), // left edge
          Math.abs(2.0 - branchEnd.y), // top edge
          Math.abs(-2.0 - branchEnd.y), // bottom edge
        ]
        const minDist = Math.min(...distToEdges)
        
        // If close to an edge, extend to reach it
        if (minDist < 0.8) {
          if (distToEdges[0] === minDist) branchEnd.x = 2.0 // right
          else if (distToEdges[1] === minDist) branchEnd.x = -2.0 // left
          else if (distToEdges[2] === minDist) branchEnd.y = 2.0 // top
          else if (distToEdges[3] === minDist) branchEnd.y = -2.0 // bottom
        } else {
          // Otherwise keep within bounds
          branchEnd.x = Math.max(-2.0, Math.min(2.0, branchEnd.x))
          branchEnd.y = Math.max(-2.0, Math.min(2.0, branchEnd.y))
        }

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
        branchWidths.push(0.0) // Zero width at end for sharp point

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
 * Create custom ribbon geometry that properly tapers to points
 */
function createCrackRibbonGeometry(
  points: THREE.Vector3[],
  widths: number[],
  thickness: number,
): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5)
  
  // Sample more points along the curve for smooth geometry
  const divisions = Math.max(100, points.length * 8)
  const curvePoints = curve.getPoints(divisions)
  
  // Vertices, normals, and uvs arrays
  const vertices: number[] = []
  const normals: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  
  // Create ribbon vertices
  for (let i = 0; i < curvePoints.length; i++) {
    const point = curvePoints[i]
    const t = i / (curvePoints.length - 1)
    
    // Interpolate width based on original width array
    const widthIndex = t * (widths.length - 1)
    const widthIndexLow = Math.floor(widthIndex)
    const widthIndexHigh = Math.min(widthIndexLow + 1, widths.length - 1)
    const widthLerp = widthIndex - widthIndexLow
    const width = widths[widthIndexLow] * (1 - widthLerp) + widths[widthIndexHigh] * widthLerp
    
    // Get tangent for perpendicular calculation
    let tangent: THREE.Vector3
    if (i === 0) {
      tangent = curvePoints[1].clone().sub(curvePoints[0]).normalize()
    } else if (i === curvePoints.length - 1) {
      tangent = curvePoints[i].clone().sub(curvePoints[i - 1]).normalize()
    } else {
      tangent = curvePoints[i + 1].clone().sub(curvePoints[i - 1]).normalize()
    }
    
    // Calculate perpendicular in XY plane
    const perp = new THREE.Vector3(-tangent.y, tangent.x, 0).normalize()
    
    // Scale width by thickness
    const halfWidth = width * thickness * 0.045
    
    // Create two vertices (left and right of the curve)
    const left = point.clone().add(perp.clone().multiplyScalar(-halfWidth))
    const right = point.clone().add(perp.clone().multiplyScalar(halfWidth))
    
    // Add vertices
    vertices.push(left.x, left.y, left.z)
    vertices.push(right.x, right.y, right.z)
    
    // Add normals (pointing up from the plane)
    normals.push(0, 0, 1, 0, 0, 1)
    
    // Add UVs
    uvs.push(0, t) // left edge
    uvs.push(1, t) // right edge
    
    // Create faces (except for the last segment)
    if (i < curvePoints.length - 1) {
      const a = i * 2
      const b = i * 2 + 1
      const c = (i + 1) * 2
      const d = (i + 1) * 2 + 1
      
      // Two triangles per segment
      indices.push(a, c, b)
      indices.push(b, c, d)
    }
  }
  
  // Create geometry
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
function KintsugiMesh({ params, randomSeed }: { params: KintsugiParams; randomSeed: number }) {
  const groupRef = useRef<THREE.Group>(null)
  const sharedMaterialRef = useRef<THREE.ShaderMaterial>(null)

  // Load textures - add placeholder for normal map
  const [slateTexture, goldTexture, slateNormalMap] = useLoader(THREE.TextureLoader, [
    '/slate.png',
    '/gold.png',
    '/slate_normal.png',
  ])

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

    // If you add a normal map:
    slateNormalMap.wrapS = slateNormalMap.wrapT = THREE.ClampToEdgeWrapping
  }, [slateTexture, goldTexture, slateNormalMap])

  // Generate crack geometries
  const crackData = useMemo(() => {
    const curves = generateCrackCurves({
      crackCount: params.crackCount,
      branchChance: params.branchProbability,
      curviness: params.crackCurviness,
      seed: randomSeed,
    })

    return curves.map((crack) => ({
      geometry: createCrackRibbonGeometry(crack.points, crack.widths, params.crackThickness),
      isBranch: crack.isBranch,
    }))
  }, [
    params.crackCount,
    params.crackThickness,
    params.branchProbability,
    params.crackCurviness,
    randomSeed,
  ])

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
        varying vec3 vWorldPosition;
        varying float vCenter;
        
        void main() {
          vUv = uv;
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPos.xyz;
          
          // "vCenter" is distance from ribbon center (0=center, 1=edge)
          vCenter = abs(uv.x - 0.5) * 2.0;
          
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        precision highp float;
        uniform float time;
        uniform float flowSpeed;
        uniform float shimmerIntensity;
        uniform float goldIntensity;
        uniform float lavaGlow;
        uniform float flowAnimation;
        uniform sampler2D goldTexture;
        varying vec2 vUv;
        varying vec3 vWorldPosition;
        varying float vCenter;
        
        // 2D value noise for "thick" flow
        float valueNoise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          // Four corners in 2D of a tile
          float a = fract(sin(dot(i, vec2(127.1,311.7))) * 43758.5453);
          float b = fract(sin(dot(i+vec2(1.0,0.0), vec2(127.1,311.7))) * 43758.5453);
          float c = fract(sin(dot(i+vec2(0.0,1.0), vec2(127.1,311.7))) * 43758.5453);
          float d = fract(sin(dot(i+vec2(1.0,1.0), vec2(127.1,311.7))) * 43758.5453);
          vec2 u = f*f*(3.0-2.0*f);
          return mix(mix(a,b,u.x),mix(c,d,u.x),u.y);
        }
        
        void main() {
          // Discard fragments outside slate bounds
          if (abs(vWorldPosition.x) > 2.0 || abs(vWorldPosition.y) > 2.0) discard;
          
          // Animate "gold" flow with noise for ooze
          float noiseVal = valueNoise(vUv * 9.0 + vec2(time * flowSpeed * 0.7, time * 0.13));
          float thickness = mix(0.85, 1.15, noiseVal); // Some "body" variation
          
          // Flow texture with subtle wave and noise for liquid look
          vec2 texUv = vUv;
          texUv.x += sin(vUv.y * 8.0 + time * 1.2) * 0.08 * thickness;
          texUv.y += time * flowSpeed * (0.05 + 0.07 * noiseVal);
          
          // Gold base (texture gives micro surface detail)
          vec3 goldTex = texture2D(goldTexture, texUv).rgb;
          vec3 gold = goldTex * goldIntensity * thickness;
          
          // Edge shimmer based on distance from center
          float edgeShimmer = smoothstep(0.5, 0.9, vCenter) * (0.18 + 0.2 * shimmerIntensity);
          vec3 sheenColor = mix(vec3(0.85,0.80,0.35), vec3(0.48,0.36,0.8), edgeShimmer);
          gold += sheenColor * edgeShimmer * 0.5;
          
          // Add a fake SSS "thickness" highlight in the center
          float sss = smoothstep(0.27, 0.0, vCenter) * 0.6; // center is thicker
          gold += vec3(1.0, 0.89, 0.66) * sss * 0.12;
          
          // Lava pulse: only a thin band moves, not everything glowing
          float pulseCenter = mod(time * flowSpeed * 0.22, 1.0);
          float bandWidth = 0.16 + 0.07 * sin(time * 0.9);
          float pulse = exp(-pow((vUv.y - pulseCenter) / bandWidth, 2.0));
          float trail = smoothstep(0.11, 0.0, vUv.y - pulseCenter);
          
          // Animate pulse to "blob" around
          float moltenPulse = pulse * (0.7 + 0.2 * noiseVal);
          gold += vec3(1.4, 1.15, 0.13) * moltenPulse * lavaGlow * 0.33;
          gold += vec3(1.0, 0.75, 0.10) * trail * lavaGlow * 0.09;
          
          // Radial highlight for tube volume (makes it look round/thick)
          float radial = 1.0 - smoothstep(0.21, 0.43, abs(vUv.x - 0.5));
          gold *= (0.90 + 0.18 * radial);
          
          // Subtle bumpiness (multiplied by noise again)
          float bump = valueNoise(vUv * 19.0 + time * 0.18) * 0.14;
          gold *= (1.0 + bump);
          
          // Soft edge alpha, slightly feathered
          float edgeAlpha = smoothstep(0.09, 0.41, radial) * (0.96 - 0.18 * vCenter);
          
          gl_FragColor = vec4(gold, edgeAlpha);
        }
      `,
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: true,
      blending: THREE.NormalBlending,
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
      <mesh position={[0, 0, 0]} renderOrder={1}>
        <planeGeometry args={[4, 4]} />
        <meshStandardMaterial
          map={slateTexture}
          normalMap={slateNormalMap}
          normalScale={new THREE.Vector2(1, 1)}
          roughness={0.9}
          metalness={0.1}
        />
      </mesh>

      {/* Black frame around slate to hide bloom outside */}
      <group>
        {/* Top */}
        <mesh position={[0, 4, -0.01]} renderOrder={0}>
          <planeGeometry args={[20, 8]} />
          <meshBasicMaterial color="#000000" />
        </mesh>
        {/* Bottom */}
        <mesh position={[0, -4, -0.01]} renderOrder={0}>
          <planeGeometry args={[20, 8]} />
          <meshBasicMaterial color="#000000" />
        </mesh>
        {/* Left */}
        <mesh position={[-4, 0, -0.01]} renderOrder={0}>
          <planeGeometry args={[8, 20]} />
          <meshBasicMaterial color="#000000" />
        </mesh>
        {/* Right */}
        <mesh position={[4, 0, -0.01]} renderOrder={0}>
          <planeGeometry args={[8, 20]} />
          <meshBasicMaterial color="#000000" />
        </mesh>
      </group>

      {/* Gold cracks - positioned flush with slate */}
      {crackData.map((crack, index) => (
        <mesh key={index} geometry={crack.geometry} position={[0, 0, 0.001]} renderOrder={3}>
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
  const [randomSeed, setRandomSeed] = useState(0)
  const [params, setParams] = useState<KintsugiParams>({
    crackCount: 5,
    crackThickness: 0.8,
    goldIntensity: 1.0,
    goldShimmer: 0.4,
    goldFlowSpeed: 0.3,
    goldFlowAnimation: 1.0,
    crackCurviness: 0.7,
    branchProbability: 0.4,
    ambientIntensity: 0.5,
    cameraDistance: 5,
    bloomIntensity: 2.0,
    bloomThreshold: 0.1,
    lavaGlow: 1.5,
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
            <KintsugiMesh params={params} randomSeed={randomSeed} />
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
        <HStack justify="space-between" align="center">
          <Heading size="md">Kintsugi Parameters</Heading>
          <Button size="sm" variant="outline" onClick={() => setRandomSeed(Date.now())}>
            New Cracks
          </Button>
        </HStack>

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
