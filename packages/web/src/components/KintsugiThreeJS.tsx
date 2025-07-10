'use client'

import React, { useRef, useState, useEffect, useMemo } from 'react'
import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { Box as ChakraBox, Text, VStack, HStack, Heading, Button } from '@chakra-ui/react'
import * as THREE from 'three'

import type { KintsugiParams } from '@vibe/core'


/**
 * Geological constraints for realistic vein patterns
 */
interface GeologicalConstraints {
  minAngleBetweenCracks: number // Minimum angle between intersecting cracks
  maxBranchAngle: number // Maximum branching angle from parent
  stressDirection: THREE.Vector2 // Primary stress direction
  avoidanceRadius: number // Cracks avoid getting too close
  densityMap?: (point: THREE.Vector2) => number // Optional density function
}

/**
 * Apply geological constraints to a vein
 */
function applyGeologicalConstraints(
  vein: THREE.Vector3[],
  existingVeins: THREE.Vector3[][],
  constraints: GeologicalConstraints
): THREE.Vector3[] {
  return vein.map((point, i) => {
    if (i === 0 || i === vein.length - 1) return point // Don't modify endpoints
    
    const adjustedPoint = point.clone()
    
    // Check proximity to existing veins
    existingVeins.forEach(existing => {
      existing.forEach(existingPoint => {
        const distance = point.distanceTo(existingPoint)
        if (distance < constraints.avoidanceRadius && distance > 0) {
          // Push away from existing point
          const pushDir = point.clone().sub(existingPoint).normalize()
          const pushForce = (constraints.avoidanceRadius - distance) / constraints.avoidanceRadius
          adjustedPoint.add(pushDir.multiplyScalar(pushForce * 0.1))
        }
      })
    })
    
    // Apply stress direction influence
    if (i > 0 && i < vein.length - 1) {
      const currentDir = vein[i + 1].clone().sub(vein[i - 1]).normalize()
      const stressDir3D = new THREE.Vector3(constraints.stressDirection.x, constraints.stressDirection.y, 0)
      const alignment = currentDir.dot(stressDir3D)
      
      // Gently align with stress direction
      if (Math.abs(alignment) < 0.8) {
        const correction = stressDir3D.clone().multiplyScalar(0.05)
        adjustedPoint.add(correction)
      }
    }
    
    return adjustedPoint
  })
}

/**
 * Generate hierarchical vein structure for marble-like patterns
 */
function generateHierarchicalVeins(
  seed: number, 
  bounds: {min: number, max: number},
  veinCount: number = 3,
  branchProbability: number = 0.5,
  curviness: number = 0.5
) {
  const seededRandom = (s: number) => {
    const x = Math.sin(s + seed) * 10000
    return x - Math.floor(x)
  }
  
  // Define geological constraints
  const constraints: GeologicalConstraints = {
    minAngleBetweenCracks: Math.PI / 6, // 30 degrees
    maxBranchAngle: Math.PI / 3, // 60 degrees
    stressDirection: new THREE.Vector2(
      0.7 + seededRandom(9999) * 0.6 - 0.3,
      0.3 + seededRandom(9998) * 0.4 - 0.2
    ).normalize(),
    avoidanceRadius: 0.2
  }
  
  const veins = {
    primary: [] as Array<{points: THREE.Vector3[], strength: number, id: number}>,
    secondary: [] as Array<{points: THREE.Vector3[], strength: number, parentId: number}>,
    tertiary: [] as Array<{points: THREE.Vector3[], strength: number, parentId: number}>
  }
  
  // Generate primary veins based on veinCount
  const primaryCount = Math.max(1, Math.min(veinCount, 5))
  
  for (let i = 0; i < primaryCount; i++) {
    const start = new THREE.Vector3(
      bounds.min + seededRandom(i * 100) * (bounds.max - bounds.min),
      seededRandom(i * 101) < 0.5 ? bounds.min : bounds.max,
      0
    )
    
    const end = new THREE.Vector3(
      bounds.min + seededRandom(i * 102) * (bounds.max - bounds.min),
      start.y === bounds.min ? bounds.max : bounds.min,
      0
    )
    
    // Create curved path
    const points: THREE.Vector3[] = []
    const segments = 8
    
    for (let j = 0; j <= segments; j++) {
      const t = j / segments
      const point = start.clone().lerp(end, t)
      
      // Add curvature based on curviness parameter
      if (j > 0 && j < segments) {
        const offset = (seededRandom(i * 200 + j) - 0.5) * curviness * 0.8
        const perp = new THREE.Vector3(-(end.y - start.y), end.x - start.x, 0).normalize()
        point.add(perp.multiplyScalar(offset))
      }
      
      points.push(point)
    }
    
    // Apply constraints to primary vein
    const existingVeins = veins.primary.map(v => v.points)
    const constrainedPoints = applyGeologicalConstraints(points, existingVeins, constraints)
    
    veins.primary.push({
      points: constrainedPoints,
      strength: 0.8 + seededRandom(i * 103) * 0.2,
      id: i
    })
  }
  
  // Generate secondary veins branching from primary
  veins.primary.forEach((primary, primaryIdx) => {
    // Use branch probability to determine branch count
    const baseBranchCount = Math.floor(3 * branchProbability)
    const branchCount = baseBranchCount + (seededRandom(primaryIdx * 300) < branchProbability ? 1 : 0)
    
    for (let i = 0; i < branchCount; i++) {
      const branchT = 0.2 + seededRandom(primaryIdx * 400 + i * 10) * 0.6
      const branchIdx = Math.floor(branchT * (primary.points.length - 1))
      const branchPoint = primary.points[branchIdx]
      
      // Branch direction
      const primaryDir = branchIdx < primary.points.length - 1 
        ? primary.points[branchIdx + 1].clone().sub(primary.points[branchIdx]).normalize()
        : primary.points[branchIdx].clone().sub(primary.points[branchIdx - 1]).normalize()
      
      // Apply branch angle constraint
      const baseAngle = (seededRandom(primaryIdx * 500 + i * 20) - 0.5) * 2
      const angle = Math.sign(baseAngle) * Math.min(Math.abs(baseAngle) * Math.PI * 0.8, constraints.maxBranchAngle)
      const branchDir = new THREE.Vector3(
        primaryDir.x * Math.cos(angle) - primaryDir.y * Math.sin(angle),
        primaryDir.x * Math.sin(angle) + primaryDir.y * Math.cos(angle),
        0
      )
      
      // Create branch
      const branchLength = 0.5 + seededRandom(primaryIdx * 600 + i * 30) * 0.8
      const branchPoints: THREE.Vector3[] = []
      // More segments for finer base path
      const branchSegments = 8 + Math.floor(curviness * 4)
      
      for (let j = 0; j <= branchSegments; j++) {
        const t = j / branchSegments
        const point = branchPoint.clone().add(branchDir.clone().multiplyScalar(branchLength * t))
        
        // Add slight curve with reduced offset for branches
        if (j > 0) {
          // Scale curve by curviness but keep it controlled
          const curveScale = 0.02 + Math.min(curviness, 1.0) * 0.03  // 0.02 to 0.05 range
          const curve = (seededRandom(primaryIdx * 700 + i * 40 + j) - 0.5) * curveScale
          const perp = new THREE.Vector3(-branchDir.y, branchDir.x, 0)
          point.add(perp.multiplyScalar(curve))
        }
        
        // Keep within bounds
        point.x = Math.max(bounds.min, Math.min(bounds.max, point.x))
        point.y = Math.max(bounds.min, Math.min(bounds.max, point.y))
        
        branchPoints.push(point)
      }
      
      veins.secondary.push({
        points: branchPoints,
        strength: primary.strength * 0.6,
        parentId: primary.id
      })
    }
  })
  
  // Generate tertiary micro-veins
  const tertiaryCount = 10 + Math.floor(seededRandom(2000) * 15)
  
  for (let i = 0; i < tertiaryCount; i++) {
    const start = new THREE.Vector3(
      bounds.min + seededRandom(i * 800) * (bounds.max - bounds.min),
      bounds.min + seededRandom(i * 801) * (bounds.max - bounds.min),
      0
    )
    
    const length = 0.2 + seededRandom(i * 802) * 0.3
    const angle = seededRandom(i * 803) * Math.PI * 2
    const end = start.clone().add(new THREE.Vector3(
      Math.cos(angle) * length,
      Math.sin(angle) * length,
      0
    ))
    
    veins.tertiary.push({
      points: [start, end],
      strength: 0.3 + seededRandom(i * 804) * 0.2,
      parentId: -1
    })
  }
  
  return veins
}


/**
 * Simple value noise function for micro-jitter
 */
function valueNoise(x: number, y: number, seed: number = 0): number {
  // Create a pseudo-random value based on position
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed * 43.5453) * 43758.5453123
  return (n - Math.floor(n)) * 2 - 1 // Return value between -1 and 1
}

/**
 * Generate natural curve using Catmull-Rom spline
 */
function generateNaturalCurve(controlPoints: THREE.Vector3[], tension: number = 0.3, isBranch: boolean = false): THREE.Vector3[] {
  if (controlPoints.length < 2) return controlPoints
  
  // Filter out any invalid points
  const validPoints = controlPoints.filter(p => 
    p && !isNaN(p.x) && !isNaN(p.y) && !isNaN(p.z)
  )
  
  if (validPoints.length < 2) return validPoints
  
  // Create Catmull-Rom curve
  const curve = new THREE.CatmullRomCurve3(validPoints)
  // Higher tension for branches to reduce zigzag
  curve.tension = isBranch ? Math.min(tension + 0.4, 0.9) : tension
  curve.curveType = 'catmullrom'
  
  // Get more points for smooth curve
  const divisions = Math.max(50, validPoints.length * 10)
  const smoothPoints = curve.getPoints(divisions)
  
  // Reduced drift amplitudes for branches
  const driftAmp = isBranch ? 0.015 : 0.03
  const perpAmp = isBranch ? 0.01 : 0.02
  
  // Add geological drift
  return smoothPoints.map((point, i) => {
    // Add subtle wandering based on position
    const drift = valueNoise(point.x * 2.0, point.y * 2.0) * driftAmp
    const perpDrift = valueNoise(point.x * 3.0 + 100, point.y * 3.0 + 100) * perpAmp
    
    // Create perpendicular offset
    let perp: THREE.Vector3
    if (i < smoothPoints.length - 1) {
      const next = smoothPoints[i + 1]
      const dir = next.clone().sub(point).normalize()
      perp = new THREE.Vector3(-dir.y, dir.x, 0)
    } else if (i > 0) {
      const prev = smoothPoints[i - 1]
      const dir = point.clone().sub(prev).normalize()
      perp = new THREE.Vector3(-dir.y, dir.x, 0)
    } else {
      perp = new THREE.Vector3(0, 1, 0)
    }
    
    return point.clone()
      .add(new THREE.Vector3(drift, drift * 0.5, 0))
      .add(perp.multiplyScalar(perpDrift))
  })
}

/**
 * Smooth points using Chaikin-style iterative averaging
 */
function smoothPoints(points: THREE.Vector3[], iterations: number = 2): THREE.Vector3[] {
  if (points.length < 3) return points
  
  let current = [...points]
  for (let it = 0; it < iterations; it++) {
    const smoothed = [current[0]] // Keep first point
    
    for (let i = 1; i < current.length - 1; i++) {
      const prev = current[i - 1]
      const next = current[i + 1]
      // Weighted average: 25% prev, 50% current, 25% next
      const avg = prev.clone().add(next).multiplyScalar(0.25).add(current[i].clone().multiplyScalar(0.5))
      smoothed.push(avg)
    }
    
    smoothed.push(current[current.length - 1]) // Keep last point
    current = smoothed
  }
  
  return current
}

/**
 * Multi-octave noise for more organic jitter
 */
function microJitter(pos: THREE.Vector3, scale: number = 8.0, amplitude: number = 0.015, seed: number = 0): THREE.Vector2 {
  let jitterX = 0
  let jitterY = 0
  let amp = amplitude
  let freq = scale
  
  // 3 octaves of noise for organic feel
  for (let i = 0; i < 3; i++) {
    jitterX += valueNoise(pos.x * freq, pos.y * freq, seed + i * 100) * amp
    jitterY += valueNoise(pos.x * freq + 31.7, pos.y * freq + 47.3, seed + i * 100 + 50) * amp
    amp *= 0.5
    freq *= 2.0
  }
  
  return new THREE.Vector2(jitterX, jitterY)
}

/**
 * Generate Voronoi cells for natural crack patterns
 */
function generateVoronoiCells(seed: number, cellCount: number = 8) {
  const seededRandom = (s: number) => {
    const x = Math.sin(s + seed) * 10000
    return x - Math.floor(x)
  }
  
  // Generate random cell centers with minimum distance constraint
  const cells: Array<{x: number, y: number, strength: number}> = []
  const minDistance = 0.8
  
  for (let i = 0; i < cellCount; i++) {
    let attempts = 0
    let validPosition = false
    let x = 0, y = 0
    
    while (!validPosition && attempts < 50) {
      x = seededRandom(seed + i * 100 + attempts) * 3.6 - 1.8
      y = seededRandom(seed + i * 101 + attempts) * 3.6 - 1.8
      
      // Check distance to other cells
      validPosition = cells.every(cell => {
        const dist = Math.sqrt((cell.x - x) ** 2 + (cell.y - y) ** 2)
        return dist >= minDistance
      })
      
      attempts++
    }
    
    if (validPosition) {
      cells.push({
        x,
        y,
        strength: 0.5 + seededRandom(seed + i * 102) * 0.5
      })
    }
  }
  
  return cells
}

/**
 * Extract edges from Voronoi diagram
 */
function extractVoronoiEdges(cells: Array<{x: number, y: number, strength: number}>, bounds: {min: number, max: number}) {
  const edges: Array<{start: THREE.Vector3, end: THREE.Vector3, strength: number}> = []
  
  // For each pair of cells, find the perpendicular bisector
  for (let i = 0; i < cells.length; i++) {
    for (let j = i + 1; j < cells.length; j++) {
      const c1 = cells[i]
      const c2 = cells[j]
      
      // Midpoint
      const midX = (c1.x + c2.x) / 2
      const midY = (c1.y + c2.y) / 2
      
      // Direction perpendicular to line between cells
      const dx = c2.y - c1.y
      const dy = c1.x - c2.x
      const len = Math.sqrt(dx * dx + dy * dy)
      
      if (len > 0.001) {
        const nx = dx / len
        const ny = dy / len
        
        // Extend perpendicular line to bounds
        const t = 3 // Extension factor
        const start = new THREE.Vector3(
          Math.max(bounds.min, Math.min(bounds.max, midX - nx * t)),
          Math.max(bounds.min, Math.min(bounds.max, midY - ny * t)),
          0
        )
        const end = new THREE.Vector3(
          Math.max(bounds.min, Math.min(bounds.max, midX + nx * t)),
          Math.max(bounds.min, Math.min(bounds.max, midY + ny * t)),
          0
        )
        
        edges.push({
          start,
          end,
          strength: (c1.strength + c2.strength) / 2
        })
      }
    }
  }
  
  return edges
}

/**
 * Generate procedural crack curves that reach edges
 */
function generateCrackCurves({
  crackCount = 5,
  patternType = 'marble',
  branchChance = 0.3,
  curviness = 0.7,
  branchSmoothness = 0.6,
  seed = 0,
}: {
  crackCount: number
  patternType: 'marble' | 'voronoi'
  branchChance: number
  curviness: number
  branchSmoothness?: number
  seed?: number
}) {
  // Seeded random function
  const seededRandom = (s: number) => {
    const x = Math.sin(s + seed) * 10000
    return x - Math.floor(x)
  }
  
  if (patternType === 'marble') {
    // Generate hierarchical marble veins
    const hierarchicalVeins = generateHierarchicalVeins(
      seed, 
      { min: -2, max: 2 },
      crackCount,
      branchChance,
      curviness
    )
    
    const cracks: Array<{
      points: THREE.Vector3[]
      widths: number[]
      isBranch: boolean
      parentIdx?: number
      branchPoint?: number
    }> = []
    
    // Convert primary veins with natural curves
    hierarchicalVeins.primary.forEach((vein, idx) => {
      if (!vein.points || vein.points.length < 2) return
      
      // Apply natural curve smoothing
      const smoothedPoints = generateNaturalCurve(vein.points, 0.3)
      
      if (smoothedPoints.length < 2) return
      
      // Pre-calculate intersections for width enhancement
      const allPoints = [
        ...hierarchicalVeins.primary.flatMap(v => v.points),
        ...hierarchicalVeins.secondary.flatMap(v => v.points)
      ]
      const intersections = findCrackIntersections([{ points: allPoints }])
      
      const jitteredPoints = smoothedPoints.map(p => {
        // Add micro-jitter scaled by curviness
        const jitterAmp = 0.008 + Math.min(curviness, 1.0) * 0.004  // 0.008 to 0.012
        const jitter = microJitter(p, 8.0, jitterAmp, seed + idx * 100)
        return new THREE.Vector3(p.x + jitter.x, p.y + jitter.y, p.z)
      })
      
      const widths = jitteredPoints.map((point, i, arr) => {
        if (arr.length <= 1) return vein.strength * 0.8
        const t = i / (arr.length - 1)
        return calculateGeologicalWidth(t, 0, vein.strength, intersections, point) * 1.2
      })
      
      cracks.push({
        points: jitteredPoints,
        widths,
        isBranch: false
      })
    })
    
    // Convert secondary veins with smoother curves
    hierarchicalVeins.secondary.forEach((vein, idx) => {
      if (!vein.points || vein.points.length < 2) return
      
      // Apply branch-specific smoothing with higher tension
      const smoothedPoints = generateNaturalCurve(vein.points, 0.5, true)
      
      if (smoothedPoints.length < 2) return
      
      const widths = smoothedPoints.map((_, i, arr) => {
        if (arr.length <= 1) return vein.strength * 0.5
        const t = i / (arr.length - 1)
        return vein.strength * Math.sin(t * Math.PI) * 0.8
      })
      
      // Apply jitter with reduced amplitude for branches
      const jitteredPoints = smoothedPoints.map(p => {
        const jitter = microJitter(p, 12.0, 0.005, seed + 1000 + idx * 100) // Reduced from 0.01
        return new THREE.Vector3(p.x + jitter.x, p.y + jitter.y, p.z)
      })
      
      // Apply smoothing to reduce zigzag using branchSmoothness parameter
      // branchSmoothness controls iterations: 0 = no smoothing, 1 = max smoothing (3 iterations)
      const smoothIterations = Math.floor(branchSmoothness * 3)
      const finalPoints = smoothIterations > 0 ? smoothPoints(jitteredPoints, smoothIterations) : jitteredPoints
      
      cracks.push({
        points: finalPoints,
        widths,
        isBranch: true,
        parentIdx: vein.parentId
      })
    })
    
    // Add only the larger tertiary veins
    hierarchicalVeins.tertiary
      .filter(vein => vein.strength > 0.4)
      .forEach((vein) => {
        const widths = [vein.strength * 0.3, 0]
        
        cracks.push({
          points: vein.points,
          widths,
          isBranch: false
        })
      })
    
    return cracks
  }
  
  if (patternType === 'voronoi') {
    // Generate Voronoi-based cracks
    // Use crackCount to determine cell count (more cracks = more cells)
    const cellCount = Math.max(3, Math.floor(crackCount * 0.8))
    const voronoiCells = generateVoronoiCells(seed, cellCount)
    const voronoiEdges = extractVoronoiEdges(voronoiCells, { min: -2, max: 2 })
    
    const cracks: Array<{
      points: THREE.Vector3[]
      widths: number[]
      isBranch: boolean
      parentIdx?: number
      branchPoint?: number
    }> = []
    
    // Convert Voronoi edges to crack curves with organic variation
    voronoiEdges.forEach((edge, i) => {
      if (i >= crackCount) return
      
      // More segments for higher curviness
      const segmentCount = 5 + Math.floor(seededRandom(i * 1000) * 5) + Math.floor(curviness * 3)
      const points: THREE.Vector3[] = []
      const widths: number[] = []
      
      for (let j = 0; j <= segmentCount; j++) {
        const t = j / segmentCount
        const basePoint = edge.start.clone().lerp(edge.end, t)
        
        // Add perpendicular offset for curviness
        if (j > 0 && j < segmentCount) {
          const dir = edge.end.clone().sub(edge.start).normalize()
          const perp = new THREE.Vector3(-dir.y, dir.x, 0)
          // Scale offset by curviness parameter with better control
          const offsetMagnitude = Math.min(curviness, 1.0) * 0.2 + 0.05  // 0.05 to 0.25 range
          const offset = (seededRandom(i * 1001 + j * 10) - 0.5) * offsetMagnitude
          basePoint.add(perp.multiplyScalar(offset))
          
          // Add micro-jitter, also scaled by curviness
          const jitterScale = 0.01 + curviness * 0.01
          const jitter = microJitter(basePoint, 10.0, jitterScale, seed + i * 100 + j)
          basePoint.x += jitter.x
          basePoint.y += jitter.y
        }
        
        points.push(basePoint)
        
        // Width based on distance from center and edge strength
        const centerDist = Math.sin(t * Math.PI)
        widths.push(edge.strength * centerDist * 0.8)
      }
      
      // Apply natural curve if curviness is high
      const finalPoints = curviness > 0.5 ? generateNaturalCurve(points, 0.5 - curviness * 0.2) : points
      
      cracks.push({
        points: finalPoints,
        widths,
        isBranch: false
      })
    })
    
    // Add some branching for higher branch probability
    if (branchChance > 0.3) {
      const branchCount = Math.floor(branchChance * crackCount * 0.5)
      for (let b = 0; b < branchCount && cracks.length > 0; b++) {
        const parentIdx = Math.floor(seededRandom(1000 + b) * cracks.length)
        const parent = cracks[parentIdx]
        if (parent && parent.points.length > 3) {
          const branchT = 0.3 + seededRandom(1001 + b) * 0.4
          const branchIdx = Math.floor(branchT * (parent.points.length - 1))
          const branchPoint = parent.points[branchIdx]
          
          const branchLength = 0.3 + seededRandom(1002 + b) * 0.3
          const branchAngle = (seededRandom(1003 + b) - 0.5) * Math.PI * 0.6
          const parentDir = branchIdx < parent.points.length - 1
            ? parent.points[branchIdx + 1].clone().sub(parent.points[branchIdx]).normalize()
            : parent.points[branchIdx].clone().sub(parent.points[branchIdx - 1]).normalize()
          
          const branchDir = new THREE.Vector3(
            parentDir.x * Math.cos(branchAngle) - parentDir.y * Math.sin(branchAngle),
            parentDir.x * Math.sin(branchAngle) + parentDir.y * Math.cos(branchAngle),
            0
          )
          
          const branchPoints = []
          const branchWidths = []
          const branchSegments = 3 + Math.floor(curviness * 2)
          
          for (let s = 0; s <= branchSegments; s++) {
            const t = s / branchSegments
            const pt = branchPoint.clone().add(branchDir.clone().multiplyScalar(branchLength * t))
            
            // Add slight curve to branch
            if (s > 0) {
              const curve = (seededRandom(1004 + b * 10 + s) - 0.5) * curviness * 0.1
              const perp = new THREE.Vector3(-branchDir.y, branchDir.x, 0)
              pt.add(perp.multiplyScalar(curve))
            }
            
            branchPoints.push(pt)
            branchWidths.push(parent.widths[branchIdx] * 0.6 * (1 - t))
          }
          
          // Apply smoothing to branches
          const smoothIterations = Math.floor(branchSmoothness * 3)
          const finalBranchPoints = smoothIterations > 0 ? smoothPoints(branchPoints, smoothIterations) : branchPoints
          
          cracks.push({
            points: finalBranchPoints,
            widths: branchWidths,
            isBranch: true,
            parentIdx
          })
        }
      }
    }
    
    return cracks
  }
  
  // If neither pattern matches, return empty array
  return []
}

/**
 * Calculate width based on geological factors
 */
function calculateGeologicalWidth(
  t: number, // position along crack (0-1)
  depth: number, // branch depth (0=main, 1=secondary, etc)
  pressure: number, // local "geological pressure"
  intersections: Array<{point: THREE.Vector3, strength: number}> = [], // nearby intersections
  currentPoint: THREE.Vector3
): number {
  // Base width decreases exponentially with depth
  const baseWidth = Math.pow(0.6, depth)
  
  // Natural bulging at center
  const centerBulge = Math.sin(t * Math.PI) * 0.3 + 0.7
  
  // Random variations for organic look
  const variation = valueNoise(t * 10, depth * 5) * 0.2 + 0.9
  
  // Increase width near intersections
  let intersectionInfluence = 1.0
  intersections.forEach(intersection => {
    const distance = currentPoint.distanceTo(intersection.point)
    if (distance < 0.3) {
      intersectionInfluence += (0.3 - distance) / 0.3 * intersection.strength * 0.5
    }
  })
  
  // Taper at ends more dramatically
  const endTaper = t < 0.1 ? t * 10 : (t > 0.9 ? (1 - t) * 10 : 1)
  
  return baseWidth * centerBulge * variation * pressure * intersectionInfluence * endTaper
}

/**
 * Find crack intersections for width enhancement
 */
function findCrackIntersections(cracks: Array<{points: THREE.Vector3[]}>) {
  const intersections: Array<{point: THREE.Vector3, strength: number}> = []
  const threshold = 0.15 // Distance threshold for intersection
  
  // Helper function to find line-line intersection
  function lineIntersection(p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3, p4: THREE.Vector3) {
    const x1 = p1.x, y1 = p1.y
    const x2 = p2.x, y2 = p2.y
    const x3 = p3.x, y3 = p3.y
    const x4 = p4.x, y4 = p4.y
    
    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)
    if (Math.abs(denom) < 0.001) return null // Lines are parallel
    
    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom
    
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
      // Lines intersect within segments
      return new THREE.Vector3(
        x1 + t * (x2 - x1),
        y1 + t * (y2 - y1),
        0
      )
    }
    
    return null
  }
  
  for (let i = 0; i < cracks.length; i++) {
    for (let j = i + 1; j < cracks.length; j++) {
      const crack1 = cracks[i].points
      const crack2 = cracks[j].points
      
      // Check each segment pair
      for (let a = 0; a < crack1.length - 1; a++) {
        for (let b = 0; b < crack2.length - 1; b++) {
          const p1 = crack1[a]
          const p2 = crack1[a + 1]
          const p3 = crack2[b]
          const p4 = crack2[b + 1]
          
          // Check for actual line intersection
          const intersection = lineIntersection(p1, p2, p3, p4)
          if (intersection) {
            // Calculate intersection strength based on angle
            const dir1 = p2.clone().sub(p1).normalize()
            const dir2 = p4.clone().sub(p3).normalize()
            const angle = Math.acos(Math.abs(dir1.dot(dir2)))
            const strength = Math.sin(angle) // Higher strength for perpendicular intersections
            
            intersections.push({ point: intersection, strength })
          } else {
            // Fallback to distance check for near-misses
            const midpoint1 = p1.clone().lerp(p2, 0.5)
            const midpoint2 = p3.clone().lerp(p4, 0.5)
            
            if (midpoint1.distanceTo(midpoint2) < threshold) {
              intersections.push({
                point: midpoint1.clone().lerp(midpoint2, 0.5),
                strength: 0.5
              })
            }
          }
        }
      }
    }
  }
  
  return intersections
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
  // Validate inputs
  if (!points || points.length < 2) {
    console.warn('createCrackRibbonGeometry: Not enough points to create geometry')
    // Return empty geometry
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([], 3))
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute([], 3))
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute([], 2))
    geometry.setAttribute('phaseOffset', new THREE.Float32BufferAttribute([], 1))
    return geometry
  }
  
  if (!widths || widths.length === 0) {
    console.warn('createCrackRibbonGeometry: No widths provided')
    // Create default widths
    widths = new Array(points.length).fill(1.0)
  }
  
  // Validate widths don't contain NaN
  const validWidths = widths.map(w => isNaN(w) || w < 0 ? 0.1 : w)
  
  // Use the raw points directly for sharp angles - no smoothing!
  const curvePoints = [...points]

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

    // Interpolate width based on validated width array
    const widthIndex = t * (validWidths.length - 1)
    const widthIndexLow = Math.floor(widthIndex)
    const widthIndexHigh = Math.min(widthIndexLow + 1, validWidths.length - 1)
    const widthLerp = widthIndex - widthIndexLow
    const width = validWidths[widthIndexLow] * (1 - widthLerp) + validWidths[widthIndexHigh] * widthLerp

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

    // For very sharp corners, taper width to zero to prevent folding
    let adjustedWidth = width
    if (i > 0 && i < curvePoints.length - 1) {
      const prev = curvePoints[i - 1]
      const next = curvePoints[i + 1]
      const v1 = point.clone().sub(prev).normalize()
      const v2 = next.clone().sub(point).normalize()
      const angle = Math.acos(Math.max(-1, Math.min(1, v1.dot(v2))))
      
      if (angle > Math.PI * 0.95) {
        adjustedWidth = 0 // Near-180° - complete taper
      } else if (angle > Math.PI * 0.85) {
        adjustedWidth *= 0.2 // Sharp angle - significant taper
      } else if (angle > Math.PI * 0.75) {
        adjustedWidth *= 0.5 // Moderate angle - some taper
      }
    }

    // Scale width by thickness
    const halfWidth = adjustedWidth * thickness * 0.045

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
    slateDisplacementMap,
    slateSpecularMap,
    slateAOMap,
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
    '/slate_displacement.png',
    '/slate_specular.png',
    '/slate_ambient.png',
    '/hammered-gold-bl/hammered-gold_albedo.png',
    '/hammered-gold-bl/hammered-gold_normal-ogl.png',
    '/hammered-gold-bl/hammered-gold_roughness.png',
    '/hammered-gold-bl/hammered-gold_metallic.png',
    '/hammered-gold-bl/hammered-gold_ao.png',
    '/hammered-gold-bl/hammered-gold_height.png',
  ])

  // Set texture properties and renderer clipping
  useEffect(() => {
    // Configure slate textures
    slateTexture.wrapS = slateTexture.wrapT = THREE.ClampToEdgeWrapping
    slateNormalMap.wrapS = slateNormalMap.wrapT = THREE.ClampToEdgeWrapping
    slateDisplacementMap.wrapS = slateDisplacementMap.wrapT = THREE.ClampToEdgeWrapping
    slateSpecularMap.wrapS = slateSpecularMap.wrapT = THREE.ClampToEdgeWrapping
    slateAOMap.wrapS = slateAOMap.wrapT = THREE.ClampToEdgeWrapping
    
    // Set appropriate color spaces
    slateTexture.colorSpace = THREE.SRGBColorSpace
    slateSpecularMap.colorSpace = THREE.SRGBColorSpace
    
    // Configure gold textures
    goldTexture.wrapS = goldTexture.wrapT = THREE.RepeatWrapping
    // Smaller repeat for more visible flow pattern
    goldTexture.repeat.set(0.2, 0.5)
    
    // Filtering for all textures
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
      tex.repeat.set(4, 4) // Increased for more detail
      tex.magFilter = THREE.LinearFilter
      tex.minFilter = THREE.LinearMipmapLinearFilter
      tex.generateMipmaps = true
      tex.anisotropy = 8 // Increased for sharper textures at angles
    })
  }, [slateTexture, goldTexture, slateNormalMap, slateDisplacementMap, slateSpecularMap, slateAOMap, goldAlbedo, goldNormal, goldRoughness, goldMetallic, goldAO, goldHeight])

  // Generate base crack data only when seed changes
  // const baseCrackData = useMemo(() => {
  //   return generateBaseCrackData(randomSeed)
  // }, [randomSeed])

  // Generate crack paths with current parameters applied to base data
  const crackPaths = useMemo(() => {
    return generateCrackCurves({
      crackCount: params.crackCount,
      patternType: params.patternType,
      branchChance: params.branchProbability,
      curviness: params.crackCurviness,
      branchSmoothness: params.branchSmoothness,
      seed: randomSeed,
    })
  }, [params.crackCount, params.patternType, params.branchProbability, params.crackCurviness, params.branchSmoothness, randomSeed])

  // Generate crack geometries - only re-generate when paths or thickness change
  const crackData = useMemo(() => {
    return crackPaths
      .filter(crack => crack.points && crack.points.length >= 2)
      .map((crack, index) => ({
        geometry: createCrackRibbonGeometry(crack.points, crack.widths, params.crackThickness, index * 1.7),
        isBranch: crack.isBranch,
      }))
      .filter(data => {
        // Filter out geometries with no vertices
        const positionAttr = data.geometry.getAttribute('position')
        return positionAttr && positionAttr.count > 0
      })
  }, [crackPaths, params.crackThickness])

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
        maxLuminance: { value: 2.0 },
        fresnelPower: { value: 3.0 },
        anisotropyStrength: { value: 0.5 },
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
        uniform float maxLuminance;
        uniform float fresnelPower;
        uniform float anisotropyStrength;
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
        
        // Perlin noise implementation for organic textures
        float perlinNoise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0); // Improved fade curve
          
          float n00 = dot(vec2(fract(sin(dot(i, vec2(127.1, 311.7))) * 43758.5453) - 0.5,
                               fract(sin(dot(i, vec2(269.5, 183.3))) * 43758.5453) - 0.5), f);
          float n10 = dot(vec2(fract(sin(dot(i + vec2(1.0, 0.0), vec2(127.1, 311.7))) * 43758.5453) - 0.5,
                               fract(sin(dot(i + vec2(1.0, 0.0), vec2(269.5, 183.3))) * 43758.5453) - 0.5), f - vec2(1.0, 0.0));
          float n01 = dot(vec2(fract(sin(dot(i + vec2(0.0, 1.0), vec2(127.1, 311.7))) * 43758.5453) - 0.5,
                               fract(sin(dot(i + vec2(0.0, 1.0), vec2(269.5, 183.3))) * 43758.5453) - 0.5), f - vec2(0.0, 1.0));
          float n11 = dot(vec2(fract(sin(dot(i + vec2(1.0, 1.0), vec2(127.1, 311.7))) * 43758.5453) - 0.5,
                               fract(sin(dot(i + vec2(1.0, 1.0), vec2(269.5, 183.3))) * 43758.5453) - 0.5), f - vec2(1.0, 1.0));
          
          return mix(mix(n00, n10, u.x), mix(n01, n11, u.x), u.y) * 0.5 + 0.5;
        }
        
        // Gradient-based flow field for organic patterns
        vec2 flowField(vec2 p, float time) {
          // Create directional flow based on multiple octaves
          vec2 gradient = vec2(
            perlinNoise(p * 2.0 + vec2(time * 0.05, 0.0)),
            perlinNoise(p * 2.0 + vec2(0.0, time * 0.05))
          );
          
          // Add circular flow component
          float angle = atan(p.y, p.x);
          vec2 circular = vec2(cos(angle + time * 0.1), sin(angle + time * 0.1));
          
          // Combine linear and circular flow
          return normalize(gradient + circular * 0.3);
        }
        
        // Curl noise for marble-like veining
        float curlNoise(vec2 p, float time) {
          vec2 flow = flowField(p, time);
          float curl = perlinNoise(p * 3.0 + flow * 0.5);
          
          // Add second layer for complexity
          vec2 flow2 = flowField(p * 0.5, time * 0.7);
          curl += perlinNoise(p * 6.0 + flow2 * 0.3) * 0.5;
          
          return curl;
        }
        
        // GGX microfacet distribution
        float distributionGGX(vec3 N, vec3 H, float roughness) {
          float a = roughness * roughness;
          float a2 = a * a;
          float NdotH = max(dot(N, H), 0.0);
          float NdotH2 = NdotH * NdotH;
          
          float denom = NdotH2 * (a2 - 1.0) + 1.0;
          denom = 3.14159265359 * denom * denom;
          
          return a2 / denom;
        }
        
        // Smith's G function for masking/shadowing
        float geometrySmith(vec3 N, vec3 V, vec3 L, float roughness) {
          float NdotV = max(dot(N, V), 0.0);
          float NdotL = max(dot(N, L), 0.0);
          float ggx1 = NdotL / (NdotL * (1.0 - roughness) + roughness);
          float ggx2 = NdotV / (NdotV * (1.0 - roughness) + roughness);
          
          return ggx1 * ggx2;
        }
        
        // Fresnel Schlick approximation with roughness
        vec3 fresnelSchlickRoughness(float cosTheta, vec3 F0, float roughness) {
          return F0 + (max(vec3(1.0 - roughness), F0) - F0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), fresnelPower);
        }
        
        // Marble vein pattern generator
        float marbleVein(vec2 uv, float thickness, float time) {
          // Multi-frequency veining
          float vein = 0.0;
          
          // Primary vein structure with flow field influence
          vec2 flow = flowField(uv * 0.5, time * 0.1);
          float primary = sin(uv.y * 5.0 + perlinNoise((uv * 2.0 + flow * 0.5)) * 3.0);
          vein += smoothstep(thickness, 0.0, abs(primary));
          
          // Secondary web-like veins
          float secondary = curlNoise(uv * 0.8, time * 0.05) - 0.3;
          vein += smoothstep(thickness * 0.5, 0.0, secondary) * 0.5;
          
          // Micro veins for detail
          float micro = perlinNoise((uv * 20.0 + flow * 2.0)) - 0.7;
          vein += smoothstep(thickness * 0.2, 0.0, micro) * 0.3;
          
          // Directional flow emphasis
          float flowEmphasis = dot(normalize(flow), vec2(0.7, 0.7));
          vein *= 0.8 + flowEmphasis * 0.4;
          
          return clamp(vein, 0.0, 1.0);
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
          vec2 pbrUv = vUv * 4.0; // Scale to match texture repeat
          
          // Sample PBR textures with static UVs
          vec3 albedo = texture2D(goldAlbedo, pbrUv).rgb;
          vec3 normalMap = texture2D(goldNormal, pbrUv).rgb * 2.0 - 1.0;
          // Sample normal at multiple scales for more detail
          vec3 normalDetail = texture2D(goldNormal, pbrUv * 4.0).rgb * 2.0 - 1.0;
          normalMap = normalize(normalMap + normalDetail * 0.3);
          normalMap.xy *= 2.0; // Boost normal intensity
          
          float roughness = texture2D(goldRoughness, pbrUv).r;
          float metallic = texture2D(goldMetallic, pbrUv).r;
          float ao = texture2D(goldAO, pbrUv).r;
          
          // Add procedural hammered texture using Perlin noise
          float hammered = perlinNoise(pbrUv * 40.0 + vec2(time * 0.1));
          float hammered2 = perlinNoise(pbrUv * 90.0 - vec2(time * 0.05));
          float hammered3 = perlinNoise(pbrUv * 200.0 + vec2(time * 0.03, 0.0));
          normalMap.xy += (hammered - 0.5) * 0.2;
          normalMap.xy += (hammered2 - 0.5) * 0.12;
          normalMap.xy += (hammered3 - 0.5) * 0.06;
          
          // Transform normal from tangent space to world space
          mat3 TBN = mat3(vTangent, vBitangent, vNormal);
          vec3 N = normalize(TBN * normalMap);
          
          // View and light calculations for PBR
          vec3 V = normalize(cameraPosition - vWorldPosition);
          vec3 L = normalize(vec3(0.4, 0.6, 1.0)); // Main directional light
          vec3 L2 = normalize(vec3(-0.3, 0.2, 0.8)); // Secondary light
          vec3 H = normalize(L + V); // Half vector
          
          // Cook-Torrance BRDF
          float NdotL = max(dot(N, L), 0.0);
          float NdotV = max(dot(N, V), 0.0);
          float NdotH = max(dot(N, H), 0.0);
          float VdotH = max(dot(V, H), 0.0);
          
          // Calculate F0 (reflectance at normal incidence)
          vec3 F0 = vec3(0.04);
          F0 = mix(F0, albedo, metallic);
          
          // Calculate DFG terms
          float D = distributionGGX(N, H, roughness);
          vec3 F = fresnelSchlickRoughness(VdotH, F0, roughness);
          float G = geometrySmith(N, V, L, roughness);
          
          // Cook-Torrance specular
          vec3 numerator = D * G * F;
          float denominator = 4.0 * NdotV * NdotL + 0.001;
          vec3 specular = numerator / denominator;
          
          // Energy conservation
          vec3 kS = F;
          vec3 kD = vec3(1.0) - kS;
          kD *= 1.0 - metallic;
          
          // Final BRDF
          vec3 gold = (kD * albedo / 3.14159265359 + specular) * NdotL * goldIntensity * body * ao;
          
          // Add secondary light contribution
          vec3 H2 = normalize(L2 + V);
          float NdotL2 = max(dot(N, L2), 0.0);
          float D2 = distributionGGX(N, H2, roughness * 1.2);
          vec3 secondary = albedo * 0.3 * NdotL2 + vec3(1.0, 0.9, 0.7) * D2 * 0.2;
          gold += secondary * (1.0 - roughness) * ao;
          
          // === ANIMATED EFFECTS ON TOP OF PBR ===
          // Add original gold texture for additional detail
          gold *= mix(vec3(1.0), goldTex, 0.3);
          
          // Enhanced anisotropic highlight (brushed metal effect)
          vec3 T = normalize(vTangent - dot(vTangent, N) * N);
          vec3 B = cross(N, T);
          float TdotH = dot(T, H);
          float BdotH = dot(B, H);
          float aniso = exp(-2.0 * (TdotH * TdotH * 0.5 + BdotH * BdotH * 8.0) / (1.0 + NdotH));
          vec3 anisoColor = vec3(1.3, 1.15, 0.85) * aniso * anisotropyStrength * (1.0 - roughness);
          gold += anisoColor * NdotL;
          
          // Fine banding/flow perpendicular to crack with flow field influence
          vec2 flowDir = flowField(vWorldPosition.xy * 0.5, time * 0.3);
          float flowInfluence = curlNoise(vWorldPosition.xy * 0.8, time * 0.2);
          
          float band1 = sin(vUv.x * 40.0 + vUv.y * 8.0 + flowInfluence * 2.0) * 0.5 + 0.5;
          float band2 = sin(vUv.x * 85.0 - vUv.y * 12.0 + time * 0.5 + flowDir.x * 3.0) * 0.5 + 0.5;
          gold *= 0.92 + (band1 * 0.04 + band2 * 0.04) * hammered;
          
          // Layer multiple detail frequencies
          albedo *= 0.95 + hammered * 0.08;
          albedo *= 0.97 + hammered2 * 0.06;
          gold *= mix(vec3(1.0), albedo, 0.2);
          
          // Add marble vein pattern for additional detail
          float marblePattern = marbleVein(vUv * 2.0, 0.15, time * 0.2);
          vec3 veinColor = mix(vec3(0.9, 0.8, 0.6), vec3(1.1, 1.0, 0.85), marblePattern);
          gold *= mix(vec3(1.0), veinColor, 0.15 * (1.0 - roughness));
          
          // Enhanced micro glints using Perlin noise
          float glint = smoothstep(0.94, 1.0, perlinNoise(vUv * 100.0 + vec2(time * 3.0 + vPhaseOffset)));
          float glint2 = smoothstep(0.97, 1.0, perlinNoise(vUv * 180.0 - vec2(time * 2.5)));
          float glint3 = smoothstep(0.99, 1.0, perlinNoise(vWorldPosition.xy * 50.0 + vec2(time)));
          vec3 glintColor = mix(vec3(1.0, 0.95, 0.75), vec3(1.2, 1.1, 0.9), metallic);
          gold += glintColor * glint * 0.2 * (1.0 - roughness);
          gold += glintColor * glint2 * 0.15;
          gold += vec3(1.5, 1.4, 1.2) * glint3 * 0.25 * pow(1.0 - roughness, 2.0);
          
          // Lava pulse animation
          float pulse = smoothstep(0.08, 0.01, abs(fract(vUv.y + time * flowSpeed * 0.3) - 0.5));
          gold += vec3(1.4, 1.22, 0.23) * pulse * lavaGlow * 0.22;
          
          // Tone mapping and gamma correction
          gold = gold / (gold + vec3(1.0)); // Reinhard tone mapping
          gold = pow(gold, vec3(1.0 / 2.2)); // Gamma correction
          
          // Ensure brightness is clamped for display
          gold = min(gold, vec3(maxLuminance));
          
          gl_FragColor = vec4(gold, 1.0);
          
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
      goldMaterial.uniforms.maxLuminance.value = params.maxLuminance || 2.0
      goldMaterial.uniforms.fresnelPower.value = params.fresnelPower || 3.0
      goldMaterial.uniforms.anisotropyStrength.value = params.anisotropyStrength || 0.5
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
    params.maxLuminance,
    params.fresnelPower,
    params.anisotropyStrength,
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
      <mesh 
        position={[0, 0, 0]} 
        renderOrder={1}
        onUpdate={(mesh) => {
          // Ensure UV2 coordinates for AO map
          const geometry = mesh.geometry as THREE.BufferGeometry
          if (!geometry.attributes.uv2) {
            geometry.setAttribute('uv2', geometry.attributes.uv)
          }
        }}
      >
        <planeGeometry args={[4, 4, 32, 32]} />
        <meshStandardMaterial
          map={slateTexture}
          normalMap={slateNormalMap}
          normalScale={new THREE.Vector2(1.5, 1.5)}
          displacementMap={slateDisplacementMap}
          displacementScale={0.05}
          displacementBias={-0.025}
          metalnessMap={slateSpecularMap}
          roughness={0.85}
          metalness={0.05}
          aoMap={slateAOMap}
          aoMapIntensity={1.2}
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
  const [randomSeed, setRandomSeed] = useState(() => Math.floor(Math.random() * 1000000))
  const [params, setParams] = useState<KintsugiParams>({
    crackCount: 5,
    crackThickness: 0.20,
    patternType: 'marble',
    goldIntensity: 1.0,
    goldShimmer: 0.4,
    goldFlowSpeed: 0.3,
    goldFlowAnimation: 1.0,
    crackCurviness: 0.7,
    branchProbability: 0.4,
    branchSmoothness: 0.6,
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
    maxLuminance: 2.0,
    fresnelPower: 3.0,
    anisotropyStrength: 0.5,
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
          <Button size="sm" variant="outline" onClick={() => setRandomSeed(prev => prev + 1)}>
            New Cracks
          </Button>
        </HStack>

        <VStack align="stretch" gap={4}>
          <Heading size="sm">Crack Properties</Heading>
          <VStack align="stretch" gap={1}>
            <Text fontSize="sm" fontWeight="medium">
              Pattern Type
            </Text>
            <select
              value={params.patternType}
              onChange={(e) => {
                const value = e.target.value as 'marble' | 'voronoi'
                setParams(prev => ({ ...prev, patternType: value }))
              }}
              style={{
                width: '100%',
                height: '32px',
                fontSize: '14px',
                borderRadius: '4px',
                border: '1px solid #e2e8f0',
                backgroundColor: 'white',
                padding: '0 8px',
                cursor: 'pointer',
              }}
            >
              <option value="marble">Hierarchical Marble</option>
              <option value="voronoi">Voronoi Cell</option>
            </select>
          </VStack>
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
          <ParamSlider
            label="Branch Smoothness"
            value={params.branchSmoothness}
            onChange={updateParam('branchSmoothness')}
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
          <ParamSlider
            label="Fresnel Power"
            value={params.fresnelPower || 3.0}
            onChange={updateParam('fresnelPower')}
            min={1}
            max={5}
            step={0.1}
          />
          <ParamSlider
            label="Anisotropy"
            value={params.anisotropyStrength || 0.5}
            onChange={updateParam('anisotropyStrength')}
            min={0}
            max={1}
            step={0.05}
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
          <ParamSlider
            label="Max Luminance"
            value={params.maxLuminance || 2.0}
            onChange={updateParam('maxLuminance')}
            min={1}
            max={4}
            step={0.1}
          />
        </VStack>
      </VStack>
    </HStack>
  )
}
