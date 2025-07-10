'use client'

import React, { useRef, useState, useEffect, useMemo } from 'react'
import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { Box as ChakraBox, Text, VStack, HStack, Heading, Button } from '@chakra-ui/react'
import * as THREE from 'three'

import type { KintsugiParams } from '@vibe/core'

/**
 * Create a short arc to round a corner between three points
 */
function makeShortArc(
  prev: THREE.Vector3,
  corner: THREE.Vector3,
  next: THREE.Vector3,
  arcSegments: number = 4
): THREE.Vector3[] {
  // Get incoming and outgoing directions
  const inDir = corner.clone().sub(prev).normalize()
  const outDir = next.clone().sub(corner).normalize()
  
  // Calculate the angle between directions
  const angle = Math.acos(Math.max(-1, Math.min(1, -inDir.dot(outDir))))
  
  // Skip if angle is too small (already smooth) or too large (keep sharp)
  if (angle < Math.PI / 18 || angle > Math.PI * 0.9) {
    return [corner]
  }
  
  // Calculate arc radius with variation for natural look
  const inLen = prev.distanceTo(corner)
  const outLen = corner.distanceTo(next)
  const radius = Math.min(inLen, outLen) * (0.17 + Math.random() * 0.13) // Variable radius
  
  // Find the center of the arc
  const bisector = inDir.clone().add(outDir).normalize().multiplyScalar(-1)
  const centerDist = radius / Math.sin(angle / 2)
  const center = corner.clone().add(bisector.multiplyScalar(centerDist))
  
  // Generate arc points
  const arcPoints: THREE.Vector3[] = []
  const startVec = corner.clone().sub(center).normalize().multiplyScalar(radius)
  const axis = new THREE.Vector3(0, 0, 1) // Z-axis for 2D rotation
  
  for (let i = 1; i < arcSegments; i++) {
    const t = i / arcSegments
    const rotAngle = angle * t
    const rotMat = new THREE.Matrix4().makeRotationAxis(axis, rotAngle)
    const arcPoint = center.clone().add(startVec.clone().applyMatrix4(rotMat))
    arcPoints.push(arcPoint)
  }
  
  return arcPoints
}

/**
 * Generate base crack data (start/end points, branch points) deterministically from seed
 */
function generateBaseCrackData(seed: number, maxCracks: number = 20) {
  // Seeded random function
  const seededRandom = (s: number) => {
    const x = Math.sin(s + seed) * 10000
    return x - Math.floor(x)
  }

  // Track existing crack segments to avoid parallels and grid patterns
  const existingSegments: Array<{from: THREE.Vector3, to: THREE.Vector3, dir: THREE.Vector3}> = []

  const baseCracks: Array<{
    start: THREE.Vector3
    end: THREE.Vector3
    intermediateSeeds: number[]
    segmentLengthFactors: number[]
    hasCluster: boolean
    clusterIndex: number
    branches: Array<{
      branchT: number
      branchDirection: THREE.Vector3
      branchLength: number
      intermediateBranchSeeds: number[]
      isMicroBranch: boolean
    }>
  }> = []

  // Helper to get edge point with slight jitter
  const getEdgePoint = (t: number, jitterSeed: number = 0): THREE.Vector3 => {
    const edge = Math.floor(t * 4)
    const edgeT = (t * 4) % 1
    
    // Add slight jitter to avoid perfect alignments
    const jitter = (seededRandom(jitterSeed) - 0.5) * 0.1

    switch (edge) {
      case 0: // top edge
        return new THREE.Vector3(-2.0 + edgeT * 4.0 + jitter, 2.0, 0)
      case 1: // right edge
        return new THREE.Vector3(2.0, 2.0 - edgeT * 4.0 + jitter, 0)
      case 2: // bottom edge
        return new THREE.Vector3(2.0 - edgeT * 4.0, -2.0, 0)
      default: // left edge
        return new THREE.Vector3(-2.0, -2.0 + edgeT * 4.0, 0)
    }
  }

  // Check if a direction is too parallel or perpendicular to existing segments
  // const isProblematicDirection = (pos: THREE.Vector3, dir: THREE.Vector3): boolean => {
  //   for (const seg of existingSegments) {
  //     // Skip if too far away
  //     if (seg.from.distanceTo(pos) > 1.5 && seg.to.distanceTo(pos) > 1.5) continue
  //     
  //     const dot = Math.abs(dir.dot(seg.dir))
  //     // Avoid parallel (dot ≈ 1) or perpendicular (dot ≈ 0)
  //     if (dot > 0.85 || dot < 0.15) return true
  //   }
  //   return false
  // }

  // Decide on special crack types
  const hasFractureNest = seededRandom(1234) < 0.2 // 20% chance
  const fractureNestIndex = hasFractureNest ? Math.floor(seededRandom(1235) * 3) : -1 // One of first 3 cracks
  
  // Generate base data for all possible cracks
  for (let i = 0; i < maxCracks; i++) {
    // Determine crack type
    const isFractureNest = i === fractureNestIndex
    const isShortCrack = !isFractureNest && seededRandom(i * 99) < 0.15 // 15% short cracks
    
    const startEdge = seededRandom(i * 100)
    const start = getEdgePoint(startEdge, i * 1000)
    
    let end: THREE.Vector3
    
    if (isFractureNest || isShortCrack) {
      // Short crack or fracture nest - doesn't traverse whole tile
      const dir = new THREE.Vector3(
        seededRandom(i * 101) - 0.5,
        seededRandom(i * 102) - 0.5,
        0
      ).normalize()
      const length = isFractureNest ? 
        0.8 + seededRandom(i * 103) * 0.5 : // Fracture nest: medium length
        0.4 + seededRandom(i * 104) * 0.4  // Short crack: very short
      end = start.clone().add(dir.multiplyScalar(length))
      
      // Keep within bounds
      end.x = Math.max(-2.0, Math.min(2.0, end.x))
      end.y = Math.max(-2.0, Math.min(2.0, end.y))
    } else {
      // Regular edge-to-edge crack
      let endEdge = seededRandom(i * 100 + 1)
      let attempts = 0
      while (Math.abs(endEdge - startEdge) < 0.15 && attempts < 10) {
        endEdge = seededRandom(i * 100 + attempts * 100)
        attempts++
      }
      end = getEdgePoint(endEdge, i * 1000 + 1)
    }

    // Store this main segment
    const mainDir = end.clone().sub(start).normalize()
    existingSegments.push({from: start, to: end, dir: mainDir})

    // Variable segment count with more variation
    const baseSegmentCount = 4 + Math.floor(seededRandom(i * 137) * 3)
    const extraSegments = seededRandom(i * 138) < 0.2 ? Math.floor(seededRandom(i * 139) * 5) : 0
    const segmentCount = baseSegmentCount + extraSegments
    
    // Decide if this crack has a cluster
    const hasCluster = seededRandom(i * 140) < 0.25
    const clusterIndex = hasCluster ? Math.floor(seededRandom(i * 141) * (segmentCount - 2)) + 1 : -1
    
    const intermediateSeeds = []
    const segmentLengthFactors = []
    
    for (let j = 0; j < segmentCount; j++) {
      intermediateSeeds.push(i * 10000 + j * 100)
      
      // Generate segment length factors with high variation
      const lengthRand = seededRandom(i * 142 + j * 10)
      let lengthFactor: number
      
      if (lengthRand < 0.7) {
        // 70% short segments
        lengthFactor = 0.3 + seededRandom(i * 143 + j * 11) * 0.4
      } else if (lengthRand < 0.9) {
        // 20% medium segments
        lengthFactor = 0.7 + seededRandom(i * 144 + j * 12) * 0.5
      } else {
        // 10% long segments
        lengthFactor = 1.2 + seededRandom(i * 145 + j * 13) * 0.8
      }
      
      // Force variation every few segments
      if (j > 0 && j % 3 === 0) {
        lengthFactor = lengthFactor < 0.7 ? lengthFactor * 2 : lengthFactor * 0.5
      }
      
      segmentLengthFactors.push(lengthFactor)
    }

    // Generate potential branches with micro-branches
    const branches = []
    let potentialBranchCount: number
    
    if (isFractureNest) {
      // Fracture nest: 3-5 branches clustered near one point
      potentialBranchCount = 3 + Math.floor(seededRandom(i * 199) * 3)
    } else if (isShortCrack) {
      // Short cracks have fewer branches
      potentialBranchCount = seededRandom(i * 198) < 0.3 ? 1 : 0
    } else {
      // Regular cracks
      potentialBranchCount = 1 + Math.floor(seededRandom(i * 200) * 2)
    }
    
    for (let b = 0; b < potentialBranchCount; b++) {
      let branchT: number
      
      if (isFractureNest) {
        // Cluster branches near center for fracture nest
        const centerT = 0.4 + seededRandom(i * 301) * 0.2
        branchT = centerT + (seededRandom(i * 300 + b * 50) - 0.5) * 0.15
      } else {
        // Regular distribution
        branchT = 0.2 + seededRandom(i * 300 + b * 50) * 0.6
      }
      
      // More diverse branch angles
      const angleType = seededRandom(i * 399 + b * 59)
      let baseAngle: number
      
      if (angleType < 0.2) {
        // Very acute angle (10-30°)
        baseAngle = Math.PI / 18 + seededRandom(i * 400 + b * 60) * Math.PI / 9
      } else if (angleType < 0.3) {
        // Obtuse angle (140-170°)
        baseAngle = Math.PI * 0.78 + seededRandom(i * 401 + b * 61) * Math.PI * 0.17
      } else if (angleType < 0.4) {
        // Backwards-facing (160-200°)
        baseAngle = Math.PI * 0.89 + seededRandom(i * 402 + b * 62) * Math.PI * 0.22
      } else {
        // Normal range (45-135°)
        baseAngle = Math.PI / 4 + seededRandom(i * 403 + b * 63) * Math.PI / 2
      }
      
      // Apply to perpendicular direction
      const branchDirection = new THREE.Vector3(-mainDir.y, mainDir.x, 0)
      const rotMat = new THREE.Matrix4().makeRotationZ(baseAngle * (seededRandom(i * 404 + b * 64) < 0.5 ? 1 : -1))
      branchDirection.applyMatrix4(rotMat)
      
      const branchLength = isFractureNest ?
        0.3 + seededRandom(i * 500 + b * 70) * 0.7 : // Shorter for fracture nest
        0.5 + seededRandom(i * 501 + b * 71) * 1.5   // Regular length
      
      const branchSegmentCount = 3 + Math.floor(seededRandom(i * 600 + b * 80) * 3)
      const intermediateBranchSeeds = []
      for (let j = 0; j < branchSegmentCount; j++) {
        intermediateBranchSeeds.push(i * 20000 + b * 1000 + j * 100)
      }
      
      branches.push({
        branchT,
        branchDirection,
        branchLength,
        intermediateBranchSeeds,
        isMicroBranch: false,
      })
      
      // Add micro-branches near the start
      if (seededRandom(i * 700 + b * 90) < 0.3) {
        const microCount = 1 + Math.floor(seededRandom(i * 800 + b * 100) * 2)
        for (let m = 0; m < microCount; m++) {
          const microT = branchT + (seededRandom(i * 900 + b * 110 + m * 10) - 0.5) * 0.05
          const microDir = branchDirection.clone()
          const microAngle = (seededRandom(i * 1000 + b * 120 + m * 20) - 0.5) * Math.PI * 0.6
          microDir.applyMatrix4(new THREE.Matrix4().makeRotationZ(microAngle))
          
          branches.push({
            branchT: microT,
            branchDirection: microDir,
            branchLength: 0.2 + seededRandom(i * 1100 + b * 130 + m * 30) * 0.3,
            intermediateBranchSeeds: [i * 30000 + b * 1500 + m * 100],
            isMicroBranch: true,
          })
        }
      }
    }

    baseCracks.push({
      start,
      end,
      intermediateSeeds,
      segmentLengthFactors,
      hasCluster,
      clusterIndex,
      branches,
    })
  }

  return baseCracks
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
  // Get base crack data
  const baseCrackData = generateBaseCrackData(seed)
  
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

  // Generate main cracks using base data
  for (let i = 0; i < Math.min(crackCount, baseCrackData.length); i++) {
    const baseCrack = baseCrackData[i]
    const start = baseCrack.start
    const end = baseCrack.end

    // Generate path using base seeds and curviness
    const rawPoints: THREE.Vector3[] = [start]
    let curr = start.clone()
    const mainDirection = end.clone().sub(start).normalize()
    // let lastDir = mainDirection.clone()
    const totalLen = start.distanceTo(end)
    
    // Track cumulative deviation to prevent doubling back
    let cumulativeAngle = 0
    let previousAngle = 0
    
    for (let j = 0; j < baseCrack.intermediateSeeds.length - 1; j++) {
      const baseSeed = baseCrack.intermediateSeeds[j]
      const isInCluster = baseCrack.hasCluster && Math.abs(j - baseCrack.clusterIndex) < 3
      
      // Use variable segment lengths
      const segLenFactor = baseCrack.segmentLengthFactors[j]
      const baseSegLen = totalLen / baseCrack.intermediateSeeds.length
      const segLen = baseSegLen * segLenFactor
      
      // Generate angle based on context
      let baseAngle: number
      
      if (isInCluster) {
        // Cluster: rapid direction changes
        baseAngle = (seededRandom(baseSeed) - 0.5) * Math.PI * 0.8
      } else {
        const angleType = seededRandom(baseSeed)
        if (angleType < 0.6) {
          // Slight curve (add micro-curve even to "straight" segments)
          baseAngle = (seededRandom(baseSeed + 1) - 0.5) * 0.3
          // Add subtle wander
          baseAngle += Math.sin(j * 0.5) * 0.05
        } else if (angleType < 0.9) {
          baseAngle = (seededRandom(baseSeed + 2) - 0.5) * 1.2
        } else {
          baseAngle = (seededRandom(baseSeed + 3) - 0.5) * Math.PI * 0.45
        }
      }
      
      // Apply curviness
      let angle = baseAngle * curviness
      
      // Avoid boxy 90-degree turns
      const angleFromPrevious = angle - previousAngle
      if (Math.abs(angleFromPrevious) > Math.PI * 0.4 && Math.abs(angleFromPrevious) < Math.PI * 0.6) {
        // Too close to 90 degrees, adjust
        angle = previousAngle + Math.sign(angleFromPrevious) * Math.PI * 0.3
      }
      
      // Limit cumulative deviation
      const maxDeviation = Math.PI * 0.35
      if (Math.abs(cumulativeAngle + angle) > maxDeviation) {
        angle = Math.sign(angle) * (maxDeviation - Math.abs(cumulativeAngle))
      }
      cumulativeAngle += angle
      previousAngle = angle
      
      // Apply rotation from the main direction
      const rotMat = new THREE.Matrix4().makeRotationZ(cumulativeAngle)
      let newDir = mainDirection.clone().applyMatrix4(rotMat).normalize()
      
      // Check for problematic directions (parallel/perpendicular to existing)
      const toEnd = end.clone().sub(curr).normalize()
      const dotProduct = newDir.dot(toEnd)
      
      if (dotProduct < 0.3) {
        newDir = newDir.clone().multiplyScalar(0.5).add(toEnd.multiplyScalar(0.5)).normalize()
        cumulativeAngle *= 0.7
      }
      
      const next = curr.clone().add(newDir.multiplyScalar(segLen))
      
      // Check if this segment is too long (>30% of bounding box)
      const segmentLength = curr.distanceTo(next)
      const maxSegmentLength = 4.0 * 0.3 // 30% of 4x4 bounding box
      
      if (segmentLength > maxSegmentLength && j > 0 && j < baseCrack.intermediateSeeds.length - 2) {
        // Force a deviation by adding a midpoint
        const midPoint = curr.clone().lerp(next, 0.5)
        const perpDir = new THREE.Vector3(-newDir.y, newDir.x, 0)
        const deviation = (seededRandom(baseSeed + 100) - 0.5) * 0.2
        midPoint.add(perpDir.multiplyScalar(deviation))
        rawPoints.push(midPoint)
      }
      
      rawPoints.push(next)
      curr = next
    }
    
    rawPoints.push(end)

    // Apply selective corner rounding based on angle sharpness
    const points: THREE.Vector3[] = [rawPoints[0]]
    
    for (let j = 1; j < rawPoints.length - 1; j++) {
      // Calculate angle at this corner
      const prev = rawPoints[j - 1]
      const curr = rawPoints[j]
      const next = rawPoints[j + 1]
      
      const inDir = curr.clone().sub(prev).normalize()
      const outDir = next.clone().sub(curr).normalize()
      const angle = Math.acos(Math.max(-1, Math.min(1, -inDir.dot(outDir))))
      
      // Decide if we should round based on angle and randomness
      let shouldRound = false
      if (angle > Math.PI * 0.6) {
        // Sharp angles (>108°) have higher chance of rounding
        shouldRound = seededRandom(i * 5000 + j * 419) < 0.4
      } else if (angle > Math.PI * 0.3) {
        // Medium angles have medium chance
        shouldRound = seededRandom(i * 5000 + j * 419) < 0.15
      } else {
        // Gentle angles rarely round
        shouldRound = seededRandom(i * 5000 + j * 419) < 0.05
      }
      
      if (shouldRound) {
        // Vary the number of arc points based on sharpness
        const arcSegments = angle > Math.PI * 0.5 ? 3 : 2
        const arcPoints = makeShortArc(prev, curr, next, arcSegments)
        points.push(...arcPoints)
      } else {
        // Keep the corner sharp
        points.push(rawPoints[j])
      }
    }
    points.push(rawPoints[rawPoints.length - 1])
    
    // Apply micro-jitter to all internal vertices (not endpoints)
    for (let j = 1; j < points.length - 1; j++) {
      const jitter = microJitter(points[j], 8.0, 0.015, seed + i * 1000 + j)
      points[j].x += jitter.x
      points[j].y += jitter.y
    }
    
    // Detect and soften kinks (sharp angles < 20°)
    for (let j = 1; j < points.length - 1; j++) {
      const prev = points[j - 1]
      const curr = points[j]
      const next = points[j + 1]
      
      const v1 = curr.clone().sub(prev).normalize()
      const v2 = next.clone().sub(curr).normalize()
      const angle = Math.acos(Math.max(-1, Math.min(1, v1.dot(v2))))
      
      if (angle < Math.PI / 9) { // < 20°
        // Soften by moving point toward midpoint between neighbors
        const midpoint = prev.clone().add(next).multiplyScalar(0.5)
        points[j].lerp(midpoint, 0.5)
      }
    }

    // Generate widths for each point - NO SMOOTHING
    const widths: number[] = []
    for (let j = 0; j < points.length; j++) {
      const t = j / (points.length - 1)

      // Sharp taper at ends, varied width in middle
      const edgeTaper = Math.min(t * 4, (1 - t) * 4, 1)
      const widthBase = 1.0
      const widthVariation = seededRandom(i * 100 + j * 17) * 0.4 - 0.2
      widths.push(widthBase * (1 + widthVariation) * edgeTaper)
    }

    // Set first and last to zero for sharp points
    widths[0] = 0.0
    widths[widths.length - 1] = 0.0

    cracks.push({
      points: points,
      widths: widths,
      isBranch: false,
    })

    // Add branches based on base data and branch probability
    for (let b = 0; b < baseCrack.branches.length; b++) {
      const branch = baseCrack.branches[b]
      
      // Use deterministic random based on crack and branch index
      const branchRandom = seededRandom(i * 1000 + b * 100)
      
      // Different probability for micro-branches
      const effectiveBranchChance = branch.isMicroBranch ? branchChance * 0.5 : branchChance
      if (branchRandom >= effectiveBranchChance) continue // Skip this branch
      
      // Find the branch point on the main crack
      const branchIndex = Math.floor(branch.branchT * (points.length - 1))
      const branchStart = points[branchIndex].clone()
      const parentWidth = widths[branchIndex] * (branch.isMicroBranch ? 0.5 : 0.7)
      
      // Calculate branch end point
      const branchEnd = branchStart.clone().add(branch.branchDirection.clone().multiplyScalar(branch.branchLength))

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

        // Generate branch path
        const rawBranchPoints: THREE.Vector3[] = [branchStart]
        
        if (branch.isMicroBranch) {
          // Micro-branches are simpler - just one or two segments
          rawBranchPoints.push(branchEnd)
        } else {
          // Regular branches with multiple segments
          let branchCurr = branchStart.clone()
          const branchMainDir = branch.branchDirection.clone().normalize()
          const branchTotalLen = branchStart.distanceTo(branchEnd)
          const branchAvgSegLen = branchTotalLen / branch.intermediateBranchSeeds.length
          
          // Track cumulative angle for branches too
          let branchCumulativeAngle = 0
          
          for (let j = 0; j < branch.intermediateBranchSeeds.length - 1; j++) {
          const branchBaseSeed = branch.intermediateBranchSeeds[j]
          
          // Use base seed for consistent angles
          const branchAngleType = seededRandom(branchBaseSeed)
          let baseBranchAngle: number
          
          if (branchAngleType < 0.7) {
            baseBranchAngle = (seededRandom(branchBaseSeed + 1) - 0.5) * 0.4
          } else {
            baseBranchAngle = (seededRandom(branchBaseSeed + 2) - 0.5) * 1.2
          }
          
          // Apply curviness
          let branchAngle = baseBranchAngle * curviness
          
          // Limit cumulative deviation for branches (less than main cracks)
          const maxBranchDeviation = Math.PI * 0.3 // Max 54 degrees
          if (Math.abs(branchCumulativeAngle + branchAngle) > maxBranchDeviation) {
            branchAngle = Math.sign(branchAngle) * (maxBranchDeviation - Math.abs(branchCumulativeAngle))
          }
          branchCumulativeAngle += branchAngle
          
          // Apply rotation from the main branch direction
          const rotMat = new THREE.Matrix4().makeRotationZ(branchCumulativeAngle)
          let newBranchDir = branchMainDir.clone().applyMatrix4(rotMat).normalize()
          
          // Ensure branch heads toward end
          const toBranchEnd = branchEnd.clone().sub(branchCurr).normalize()
          if (newBranchDir.dot(toBranchEnd) < 0.3) {
            newBranchDir = newBranchDir.clone().multiplyScalar(0.4).add(toBranchEnd.multiplyScalar(0.6)).normalize()
            branchCumulativeAngle *= 0.5 // Reset when correcting
          }
          
          // Use consistent segment length
          const branchSegLen = branchAvgSegLen * (0.7 + seededRandom(branchBaseSeed + 3) * 0.6)
          
          const branchNext = branchCurr.clone().add(newBranchDir.multiplyScalar(branchSegLen))
          rawBranchPoints.push(branchNext)
          
          branchCurr = branchNext
          }
          
          rawBranchPoints.push(branchEnd)
        }
        
        // Apply selective corner rounding to branches based on angle
        const branchPoints: THREE.Vector3[] = [rawBranchPoints[0]]
        const branchWidths: number[] = [parentWidth]
        
        for (let j = 1; j < rawBranchPoints.length - 1; j++) {
          const t = j / (rawBranchPoints.length - 1)
          
          // Calculate angle for selective rounding
          const prevPt = rawBranchPoints[j - 1]
          const currPt = rawBranchPoints[j]
          const nextPt = rawBranchPoints[j + 1]
          
          const inVec = currPt.clone().sub(prevPt).normalize()
          const outVec = nextPt.clone().sub(currPt).normalize()
          const branchAngle = Math.acos(Math.max(-1, Math.min(1, -inVec.dot(outVec))))
          
          // Branches round less frequently
          let shouldRoundBranch = false
          if (branchAngle > Math.PI * 0.7) {
            shouldRoundBranch = seededRandom(i * 7000 + b * 4000 + j * 523) < 0.3
          } else if (branchAngle > Math.PI * 0.4) {
            shouldRoundBranch = seededRandom(i * 7000 + b * 4000 + j * 523) < 0.1
          }
          
          if (shouldRoundBranch) {
            // Minimal rounding for branches
            const arcPoints = makeShortArc(prevPt, currPt, nextPt, 2)
            branchPoints.push(...arcPoints)
            // Add widths for arc points
            for (let k = 0; k < arcPoints.length; k++) {
              const taper = 1 - t * 0.8
              branchWidths.push(parentWidth * 0.7 * taper)
            }
          } else {
            // Keep sharp
            branchPoints.push(currPt)
            const taper = 1 - t * 0.8
            branchWidths.push(parentWidth * 0.7 * taper)
          }
        }
        
        branchPoints.push(rawBranchPoints[rawBranchPoints.length - 1])
        branchWidths.push(0.0) // Zero width at end for sharp point
        
        // Apply micro-jitter to branch internal vertices (not endpoints)
        for (let j = 1; j < branchPoints.length - 1; j++) {
          const branchJitter = microJitter(branchPoints[j], 10.0, 0.012, seed + i * 2000 + b * 100 + j)
          branchPoints[j].x += branchJitter.x
          branchPoints[j].y += branchJitter.y
        }
        
        // Detect and soften kinks in branches
        for (let j = 1; j < branchPoints.length - 1; j++) {
          const prev = branchPoints[j - 1]
          const curr = branchPoints[j]
          const next = branchPoints[j + 1]
          
          const v1 = curr.clone().sub(prev).normalize()
          const v2 = next.clone().sub(curr).normalize()
          const angle = Math.acos(Math.max(-1, Math.min(1, v1.dot(v2))))
          
          if (angle < Math.PI / 9) { // < 20°
            // Soften by moving point toward midpoint between neighbors
            const midpoint = prev.clone().add(next).multiplyScalar(0.5)
            branchPoints[j].lerp(midpoint, 0.5)
          }
        }

        if (branchPoints.length > 2) {
          cracks.push({
            points: branchPoints,
            widths: branchWidths,
            isBranch: true,
            parentIdx: i,
            branchPoint: branchIndex,
          })
        }
    } // End of branch loop
  } // End of main crack loop

  // Add orphan micro-cracks (2-3 point cracks that don't connect to edges)
  const orphanCount = 2 + Math.floor(seededRandom(9999) * 2) // 2-3 orphan cracks
  for (let o = 0; o < orphanCount; o++) {
    // Random position within the tile, avoiding edges
    const orphanStart = new THREE.Vector3(
      -1.5 + seededRandom(10000 + o * 100) * 3.0,
      -1.5 + seededRandom(10001 + o * 100) * 3.0,
      0
    )
    
    // Random direction and length
    const orphanDir = new THREE.Vector3(
      seededRandom(10002 + o * 100) - 0.5,
      seededRandom(10003 + o * 100) - 0.5,
      0
    ).normalize()
    
    const orphanLength = 0.15 + seededRandom(10004 + o * 100) * 0.2
    const orphanEnd = orphanStart.clone().add(orphanDir.multiplyScalar(orphanLength))
    
    // Create 2-3 point crack
    const orphanPoints: THREE.Vector3[] = [orphanStart]
    
    if (seededRandom(10005 + o * 100) > 0.5) {
      // Add a middle point with slight curve
      const orphanMid = orphanStart.clone().lerp(orphanEnd, 0.5)
      const perpDir = new THREE.Vector3(-orphanDir.y, orphanDir.x, 0)
      const curve = (seededRandom(10006 + o * 100) - 0.5) * 0.1
      orphanMid.add(perpDir.multiplyScalar(curve))
      orphanPoints.push(orphanMid)
    }
    
    orphanPoints.push(orphanEnd)
    
    // Apply micro-jitter to orphan cracks too
    for (let j = 0; j < orphanPoints.length; j++) {
      const jitter = microJitter(orphanPoints[j], 12.0, 0.01, seed + 20000 + o * 100 + j)
      orphanPoints[j].x += jitter.x
      orphanPoints[j].y += jitter.y
    }
    
    // Generate widths for orphan crack
    const orphanWidths: number[] = []
    for (let j = 0; j < orphanPoints.length; j++) {
      const t = j / (orphanPoints.length - 1)
      const taper = Math.sin(t * Math.PI) // Bell curve taper
      orphanWidths.push(0.6 * taper)
    }
    
    cracks.push({
      points: orphanPoints,
      widths: orphanWidths,
      isBranch: false,
    })
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
      branchChance: params.branchProbability,
      curviness: params.crackCurviness,
      seed: randomSeed,
    })
  }, [params.crackCount, params.branchProbability, params.crackCurviness, randomSeed])

  // Generate crack geometries - only re-generate when paths or thickness change
  const crackData = useMemo(() => {
    return crackPaths.map((crack, index) => ({
      geometry: createCrackRibbonGeometry(crack.points, crack.widths, params.crackThickness, index * 1.7),
      isBranch: crack.isBranch,
    }))
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
          float hammered = perlinNoise(pbrUv * 40.0 + time * 0.1);
          float hammered2 = perlinNoise(pbrUv * 90.0 - time * 0.05);
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
          
          // Fine banding/flow perpendicular to crack
          float band1 = sin(vUv.x * 40.0 + vUv.y * 8.0) * 0.5 + 0.5;
          float band2 = sin(vUv.x * 85.0 - vUv.y * 12.0 + time * 0.5) * 0.5 + 0.5;
          gold *= 0.92 + (band1 * 0.04 + band2 * 0.04) * hammered;
          
          // Layer multiple detail frequencies
          albedo *= 0.95 + hammered * 0.08;
          albedo *= 0.97 + hammered2 * 0.06;
          gold *= mix(vec3(1.0), albedo, 0.2);
          
          // Enhanced micro glints using Perlin noise
          float glint = smoothstep(0.94, 1.0, perlinNoise(vUv * 100.0 + time * 3.0 + vPhaseOffset));
          float glint2 = smoothstep(0.97, 1.0, perlinNoise(vUv * 180.0 - time * 2.5));
          float glint3 = smoothstep(0.99, 1.0, perlinNoise(vWorldPosition.xy * 50.0 + time));
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
