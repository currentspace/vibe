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
  bloomIntensity: number
  bloomThreshold: number
  lavaGlow: number
  flowContrast: number
  flowSpeedMultiplier: number
  blobFrequency1: number
  blobFrequency2: number
  textureFlowSpeed: number
  specularPower: number
  lateralMotion: number
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
        const branchEnd = branchStart.clone().add(branchDirection.multiplyScalar(branchLength))

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
          if (distToEdges[0] === minDist)
            branchEnd.x = 2.0 // right
          else if (distToEdges[1] === minDist)
            branchEnd.x = -2.0 // left
          else if (distToEdges[2] === minDist)
            branchEnd.y = 2.0 // top
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
  phaseOffset: number = 0,
): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5)

  // Sample more points along the curve for smooth geometry
  const divisions = Math.max(30, points.length * 2) // Further reduced for performance
  const curvePoints = curve.getPoints(divisions)

  // Vertices, normals, uvs, and phase offset arrays
  const vertices: number[] = []
  const normals: number[] = []
  const uvs: number[] = []
  const phaseOffsets: number[] = []
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
      tangent = curvePoints[i]
        .clone()
        .sub(curvePoints[i - 1])
        .normalize()
    } else {
      tangent = curvePoints[i + 1]
        .clone()
        .sub(curvePoints[i - 1])
        .normalize()
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

    // Add phase offset as attribute (same for both vertices at this point)
    phaseOffsets.push(phaseOffset, phaseOffset)

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
  geometry.setAttribute('phaseOffset', new THREE.Float32BufferAttribute(phaseOffsets, 1))
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
  const [
    slateTexture, 
    goldTexture, 
    slateNormalMap,
    goldAlbedo,
    goldNormal,
    goldRoughness,
    goldMetallic,
    goldAO,
    goldHeight
  ] = useLoader(THREE.TextureLoader, [
    '/slate.png',
    '/gold.png',
    '/slate_normal.png',
    '/hammered-gold-bl/hammered-gold_albedo.png',
    '/hammered-gold-bl/hammered-gold_normal-ogl.png',
    '/hammered-gold-bl/hammered-gold_roughness.png',
    '/hammered-gold-bl/hammered-gold_metallic.png',
    '/hammered-gold-bl/hammered-gold_ao.png',
    '/hammered-gold-bl/hammered-gold_height.png',
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
    
    // Set properties for all gold PBR textures
    const goldTextures = [goldAlbedo, goldNormal, goldRoughness, goldMetallic, goldAO, goldHeight]
    goldTextures.forEach(tex => {
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping
      tex.repeat.set(2, 2) // Adjust scale as needed
      tex.magFilter = THREE.LinearFilter
      tex.minFilter = THREE.LinearMipmapLinearFilter
      tex.generateMipmaps = true
      tex.anisotropy = 4 // Reduced from default 16 for performance
    })
  }, [slateTexture, goldTexture, slateNormalMap, goldAlbedo, goldNormal, goldRoughness, goldMetallic, goldAO, goldHeight])

  // Generate crack geometries
  const crackData = useMemo(() => {
    const curves = generateCrackCurves({
      crackCount: params.crackCount,
      branchChance: params.branchProbability,
      curviness: params.crackCurviness,
      seed: randomSeed,
    })

    return curves.map((crack, index) => ({
      geometry: createCrackRibbonGeometry(crack.points, crack.widths, params.crackThickness, index * 1.7),
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
        goldAlbedo: { value: goldAlbedo },
        goldNormal: { value: goldNormal },
        goldRoughness: { value: goldRoughness },
        goldMetallic: { value: goldMetallic },
        goldAO: { value: goldAO },
        time: { value: 0 },
        flowSpeed: { value: 0.5 },
        shimmerIntensity: { value: 0.8 },
        goldIntensity: { value: 1.5 },
        lavaGlow: { value: 1.0 },
        flowAnimation: { value: 1.0 },
        flowContrast: { value: 0.3 },
        flowSpeedMultiplier: { value: 1.0 },
        blobFrequency1: { value: 7.0 },
        blobFrequency2: { value: 3.0 },
        textureFlowSpeed: { value: 0.17 },
        specularPower: { value: 90.0 },
        lateralMotion: { value: 0.0 },
      },
      vertexShader: `
        attribute float phaseOffset;
        varying vec2 vUv;
        varying vec3 vWorldPosition;
        varying vec3 vNormal;
        varying vec3 vTangent;
        varying vec3 vBitangent;
        varying float vCenter;
        varying float vPhaseOffset;
        
        void main() {
          vUv = uv;
          vPhaseOffset = phaseOffset;
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPos.xyz;
          
          // Transform normal to world space
          vNormal = normalize(normalMatrix * normal);
          
          // Calculate tangent and bitangent for normal mapping
          vec3 tangent = vec3(1.0, 0.0, 0.0); // Simplified for ribbon geometry
          vTangent = normalize(normalMatrix * tangent);
          vBitangent = cross(vNormal, vTangent);
          
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
        uniform float flowContrast;
        uniform float flowSpeedMultiplier;
        uniform float blobFrequency1;
        uniform float blobFrequency2;
        uniform float textureFlowSpeed;
        uniform float specularPower;
        uniform float lateralMotion;
        uniform sampler2D goldTexture;
        uniform sampler2D goldAlbedo;
        uniform sampler2D goldNormal;
        uniform sampler2D goldRoughness;
        uniform sampler2D goldMetallic;
        uniform sampler2D goldAO;
        varying vec2 vUv;
        varying vec3 vWorldPosition;
        varying vec3 vNormal;
        varying vec3 vTangent;
        varying vec3 vBitangent;
        varying float vCenter;
        varying float vPhaseOffset;
        
        // Big oozing bands (longitudinal noise)
        float bigBands(float t, float time, float freq, float speed, float phase) {
          float band = sin(t * freq + time * speed + phase);
          // Soft, thick band
          return smoothstep(0.3, 1.0, band);
        }
        
        // Micro surface detail noise
        float valueNoise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          float a = fract(sin(dot(i, vec2(127.1,311.7))) * 43758.5453);
          float b = fract(sin(dot(i+vec2(1.0,0.0), vec2(127.1,311.7))) * 43758.5453);
          float c = fract(sin(dot(i+vec2(0.0,1.0), vec2(127.1,311.7))) * 43758.5453);
          float d = fract(sin(dot(i+vec2(1.0,1.0), vec2(127.1,311.7))) * 43758.5453);
          vec2 u = f*f*(3.0-2.0*f);
          return mix(mix(a,b,u.x),mix(c,d,u.x),u.y);
        }
        
        void main() {
          if (abs(vWorldPosition.x) > 2.0 || abs(vWorldPosition.y) > 2.0) discard;
          
          // Animate large bands of gold sliding down the crack with adjustable parameters
          float blob = bigBands(vUv.y, time, blobFrequency1, flowSpeed * flowSpeedMultiplier, vPhaseOffset);
          float blob2 = bigBands(vUv.y, time, blobFrequency2, flowSpeed * flowSpeedMultiplier * 0.5, 1.3 + vPhaseOffset * 0.7);
          
          // Adjustable contrast
          float darkLevel = 1.0 - flowContrast;
          float brightLevel = 1.0 + flowContrast;
          float body = mix(darkLevel, brightLevel, 0.7 * blob + 0.3 * blob2);
          
          // Bump noise, moves at different speed for "surface"
          float microBump = valueNoise(vUv * 11.0 + vec2(0.0, time * flowSpeed * flowSpeedMultiplier * 0.2));
          body *= (0.92 + 0.13 * microBump);
          
          // Animated texture UV - slides down the ribbon
          vec2 texUv = vUv;
          texUv.y += time * textureFlowSpeed;
          
          // Combine all UV distortions into one calculation
          float waveDistortion = sin(vUv.y * 12.0 + time * flowSpeedMultiplier) * 0.04 * body
                               + sin(time * 0.8 + vUv.y * 8.0) * lateralMotion * 0.1;
          texUv.x += waveDistortion;
          
          // Sample original gold texture
          vec3 goldTex = texture2D(goldTexture, texUv).rgb;
          
          // === PHYSICALLY BASED GOLD ===
          // Use static UV for PBR textures to improve performance
          vec2 pbrUv = vUv * 2.0; // Scale for texture repeat
          
          // Sample PBR textures with static UVs
          vec3 albedo = texture2D(goldAlbedo, pbrUv).rgb;
          vec3 normalMap = texture2D(goldNormal, pbrUv).rgb * 2.0 - 1.0;
          float roughness = texture2D(goldRoughness, pbrUv).r;
          float metallic = texture2D(goldMetallic, pbrUv).r;
          float ao = texture2D(goldAO, pbrUv).r;
          
          // Transform normal from tangent space to world space
          mat3 TBN = mat3(vTangent, vBitangent, vNormal);
          vec3 N = normalize(TBN * normalMap);
          
          // View and light calculations for PBR
          vec3 V = normalize(cameraPosition - vWorldPosition);
          vec3 L = normalize(vec3(0.4, 0.6, 1.0)); // Directional light
          vec3 H = normalize(L + V); // Half vector for Blinn-Phong
          
          // Adjust specular based on roughness
          float adjustedSpecPower = mix(200.0, 10.0, roughness) * (specularPower / 90.0);
          float spec = pow(max(dot(N, H), 0.0), adjustedSpecPower);
          
          // Fresnel effect with metallic influence
          float fresnel = pow(1.0 - max(dot(V, N), 0.0), 3.0) * (0.5 + metallic * 0.7);
          
          // Combine albedo with metallic workflow
          vec3 goldColor = mix(albedo, albedo * 1.5, metallic);
          
          // Base PBR gold with specular and fresnel
          vec3 gold = goldColor * (0.7 + 0.3 * goldIntensity) * body * ao
                    + vec3(1.0, 0.95, 0.5) * (spec * (1.0 - roughness) + fresnel * metallic);
          
          // === ANIMATED EFFECTS ON TOP OF PBR ===
          // Add original gold texture for additional detail
          gold *= mix(vec3(1.0), goldTex, 0.3);
          
          // Micro glints (sparkle effect) - reduced frequency for performance
          float glint = smoothstep(0.98, 1.0, valueNoise(vUv * 90.0 + time * 4.0 + vPhaseOffset));
          gold += vec3(1.0, 0.95, 0.75) * glint * 0.1;
          
          // Lava pulse animation
          float pulse = smoothstep(0.08, 0.01, abs(fract(vUv.y + time * flowSpeed * 0.3) - 0.5));
          gold += vec3(1.4, 1.22, 0.23) * pulse * lavaGlow * 0.22;
          
          // Output with gamma correction for realistic lighting
          gl_FragColor = vec4(pow(gold, vec3(1.0/2.2)), 1.0);
          
          /*
          
          // Animate large bands of gold sliding down the crack
          float blob = bigBands(vUv.y, time, 7.0, flowSpeed * 1.2, phaseOffset);
          float blob2 = bigBands(vUv.y, time, 3.0, flowSpeed * 0.4, 1.3 + phaseOffset * 0.7);
          
          float body = mix(0.8, 1.35, 0.7 * blob + 0.3 * blob2);
          
          // Bump noise, moves at different speed for "surface"
          float microBump = valueNoise(vUv * 11.0 + vec2(0.0, time * flowSpeed * 0.23));
          body *= (0.92 + 0.13 * microBump);
          
          // Animated texture UV - slides down the ribbon
          vec2 texUv = vUv;
          texUv.y += time * flowSpeed * 0.17;
          texUv.x += sin(vUv.y * 12.0 + time) * 0.04 * body;
          vec3 goldTex = texture2D(goldTexture, texUv).rgb;
          
          // Core gold color modulated by body
          vec3 gold = goldTex * (goldIntensity * body);
          
          // Add rim lighting at edge
          float rim = pow(1.0 - abs(vCenter), 3.5);
          gold += vec3(1.2, 1.12, 0.44) * rim * 0.09;
          
          // Optional: bright pulsing center (lava pulse)
          float pulse = smoothstep(0.08, 0.01, abs(fract(vUv.y + time * flowSpeed * 0.07) - 0.5));
          gold += vec3(1.4, 1.22, 0.23) * pulse * lavaGlow * 0.22;
          
          // Edge alpha feather
          float edgeAlpha = smoothstep(0.18, 0.41, 1.0 - abs(vCenter));
          gl_FragColor = vec4(gold, edgeAlpha);
          */
        }
      `,
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: true,
      blending: THREE.NormalBlending,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    })

    sharedMaterialRef.current = material
    return material
  }, [
    goldTexture,
    goldAlbedo,
    goldNormal,
    goldRoughness,
    goldMetallic,
    goldAO,
  ])

  // Update uniforms initially and when params change
  useEffect(() => {
    if (goldMaterial) {
      goldMaterial.uniforms.flowSpeed.value = params.goldFlowSpeed
      goldMaterial.uniforms.shimmerIntensity.value = params.goldShimmer
      goldMaterial.uniforms.goldIntensity.value = params.goldIntensity
      goldMaterial.uniforms.lavaGlow.value = params.lavaGlow
      goldMaterial.uniforms.flowAnimation.value = params.goldFlowAnimation
      goldMaterial.uniforms.flowContrast.value = params.flowContrast
      goldMaterial.uniforms.flowSpeedMultiplier.value = params.flowSpeedMultiplier
      goldMaterial.uniforms.blobFrequency1.value = params.blobFrequency1
      goldMaterial.uniforms.blobFrequency2.value = params.blobFrequency2
      goldMaterial.uniforms.textureFlowSpeed.value = params.textureFlowSpeed
      goldMaterial.uniforms.specularPower.value = params.specularPower
      goldMaterial.uniforms.lateralMotion.value = params.lateralMotion
    }
  }, [
    goldMaterial,
    params.goldFlowSpeed,
    params.goldShimmer,
    params.goldIntensity,
    params.lavaGlow,
    params.goldFlowAnimation,
    params.flowContrast,
    params.flowSpeedMultiplier,
    params.blobFrequency1,
    params.blobFrequency2,
    params.textureFlowSpeed,
    params.specularPower,
    params.lateralMotion,
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

    // Update time uniform for the shared material
    if (goldMaterial) {
      goldMaterial.uniforms.time.value = time
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
      {crackData.map((crack, index) => {
        // Give each crack a slightly different z-position to prevent z-fighting
        const zOffset = 0.001 + index * 0.0001

        return (
          <mesh key={index} geometry={crack.geometry} material={goldMaterial} position={[0, 0, zOffset]} renderOrder={3} />
        )
      })}

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
    bloomIntensity: 2.0,
    bloomThreshold: 0.1,
    lavaGlow: 1.5,
    flowContrast: 0.5,
    flowSpeedMultiplier: 3.0,
    blobFrequency1: 7.0,
    blobFrequency2: 3.0,
    textureFlowSpeed: 0.5,
    specularPower: 90.0,
    lateralMotion: 0.2,
  })

  const updateParam = (key: keyof KintsugiParams) => (value: number) => {
    setParams((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <HStack width="100%" height="100%" gap={0} flexDirection={{ base: 'column', lg: 'row' }}>
      {/* 3D Scene */}
      <ChakraBox position="relative" flex={1} height={{ base: '60vh', lg: '100%' }} width="100%">
        <Canvas
          camera={{ position: [0, 0, 5], fov: 50 }}
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
            label="Shimmer"
            value={params.goldShimmer}
            onChange={updateParam('goldShimmer')}
            min={0}
            max={0.5}
          />
          <ParamSlider
            label="Metallic Shine"
            value={params.specularPower}
            onChange={updateParam('specularPower')}
            min={10}
            max={200}
            step={5}
          />
        </VStack>

        <VStack align="stretch" gap={4}>
          <Heading size="sm">Flow Animation</Heading>
          <ParamSlider
            label="Flow Contrast"
            value={params.flowContrast}
            onChange={updateParam('flowContrast')}
            min={0}
            max={1}
            step={0.05}
          />
          <ParamSlider
            label="Flow Speed Multiplier"
            value={params.flowSpeedMultiplier}
            onChange={updateParam('flowSpeedMultiplier')}
            min={0.5}
            max={5}
            step={0.1}
          />
          <ParamSlider
            label="Blob Frequency 1"
            value={params.blobFrequency1}
            onChange={updateParam('blobFrequency1')}
            min={1}
            max={15}
            step={0.5}
          />
          <ParamSlider
            label="Blob Frequency 2"
            value={params.blobFrequency2}
            onChange={updateParam('blobFrequency2')}
            min={1}
            max={10}
            step={0.5}
          />
          <ParamSlider
            label="Texture Flow Speed"
            value={params.textureFlowSpeed}
            onChange={updateParam('textureFlowSpeed')}
            min={0}
            max={2}
            step={0.05}
          />
          <ParamSlider
            label="Lateral Wave Motion"
            value={params.lateralMotion}
            onChange={updateParam('lateralMotion')}
            min={0}
            max={1}
            step={0.05}
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
        </VStack>
      </VStack>
    </HStack>
  )
}
