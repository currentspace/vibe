'use client'

import React, { useRef, useState, useEffect } from 'react'
import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Box as ChakraBox, Text } from '@chakra-ui/react'
import * as THREE from 'three'

/**
 * Kintsugi Mesh Component
 */
function KintsugiMesh() {
  const meshRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const [stage, setStage] = useState<'slate' | 'cracking' | 'filling' | 'flowing'>('slate')
  const stageStartTime = useRef(0)
  
  // Load textures
  const [slateTexture, goldTexture] = useLoader(THREE.TextureLoader, [
    '/slate.png',
    '/gold.png'
  ])
  
  // Set texture wrapping
  useEffect(() => {
    slateTexture.wrapS = slateTexture.wrapT = THREE.RepeatWrapping
    goldTexture.wrapS = goldTexture.wrapT = THREE.RepeatWrapping
  }, [slateTexture, goldTexture])

  // Custom shader material
  const shaderMaterial = React.useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        u_slateTexture: { value: slateTexture },
        u_goldTexture: { value: goldTexture },
        u_time: { value: 0 },
        u_crackAmount: { value: 0 },
        u_goldFill: { value: 0 },
        u_flowSpeed: { value: 0 }
      },
      side: THREE.DoubleSide,
      transparent: true,
      vertexShader: `
        precision mediump float;
        
        uniform float u_time;
        uniform float u_crackAmount;
        
        varying vec2 vUv;
        varying float vCrackPattern;
        
        // Same noise functions as fragment shader
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
          // Create main crack lines
          float crack1 = abs(sin(uv.x * 8.0 + noise(uv * 3.0) * 2.0)) < 0.1 ? 1.0 : 0.0;
          float crack2 = abs(cos(uv.y * 6.0 + noise(uv * 4.0) * 1.5)) < 0.1 ? 1.0 : 0.0;
          float crack3 = abs(sin((uv.x + uv.y) * 5.0 + noise(uv * 2.0))) < 0.15 ? 1.0 : 0.0;
          
          // Combine cracks
          float cracks = max(max(crack1, crack2), crack3);
          
          // Add organic variation
          float n1 = noise(uv * 10.0);
          float n2 = noise(uv * 20.0 + vec2(100.0));
          float variation = n1 * 0.3 + n2 * 0.2;
          
          cracks = cracks * (0.7 + variation);
          cracks = smoothstep(0.2, 0.8, cracks);
          
          return cracks;
        }
        
        void main() {
          vUv = uv;
          vec3 pos = position;
          
          // Calculate crack pattern
          float crack = crackPattern(uv);
          vCrackPattern = crack;
          
          // Displace vertices based on crack pattern
          if (u_crackAmount > 0.0 && crack > 0.3) {
            // Calculate displacement direction based on position
            vec2 fromCenter = normalize(uv - vec2(0.5));
            vec2 crackDir = mix(fromCenter, vec2(
              noise(uv * 15.0) - 0.5,
              noise(uv * 15.0 + vec2(100.0)) - 0.5
            ), 0.5);
            
            // Push vertices apart at crack locations
            float displacement = crack * u_crackAmount;
            pos.xy += crackDir * displacement * 0.3;
            
            // Also push forward/backward for 3D effect
            pos.z += sin(crack * 3.14159) * displacement * 0.5;
          }
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        precision mediump float;
        
        uniform sampler2D u_slateTexture;
        uniform sampler2D u_goldTexture;
        uniform float u_time;
        uniform float u_crackAmount;
        uniform float u_goldFill;
        uniform float u_flowSpeed;
        
        varying vec2 vUv;
        varying float vCrackPattern;
        
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
          float n1 = noise(uv * 5.0);
          float n2 = noise(uv * 10.0 + vec2(100.0));
          float n3 = noise(uv * 20.0 + vec2(200.0));
          
          float cracks = n1 * 0.5 + n2 * 0.3 + n3 * 0.2;
          cracks = smoothstep(0.4, 0.6, cracks);
          
          float edges = abs(sin(uv.x * 30.0)) * abs(cos(uv.y * 30.0));
          cracks *= smoothstep(0.7, 0.9, edges);
          
          return cracks * u_crackAmount;
        }
        
        void main() {
          vec2 uv = vUv;
          
          // Sample textures
          vec4 slate = texture2D(u_slateTexture, uv * 2.0); // Scale texture
          
          // Animate gold texture for flow effect
          vec2 flowUV = uv * 2.0;
          flowUV.x += sin(u_time * u_flowSpeed + uv.y * 5.0) * 0.01;
          flowUV.y += cos(u_time * u_flowSpeed + uv.x * 5.0) * 0.01;
          vec4 gold = texture2D(u_goldTexture, flowUV);
          
          // Use crack pattern from vertex shader
          float crackMask = vCrackPattern * u_crackAmount;
          
          // Enhance gold with metallic shine
          float shimmer = sin(u_time * 3.0 + uv.x * 10.0) * 0.2 + 0.8;
          gold.rgb *= shimmer;
          
          vec4 finalColor;
          
          // During cracking phase, show black/dark cracks
          if (u_goldFill < 0.01 && crackMask > 0.1) {
            // Make cracks appear as dark voids
            finalColor = mix(slate, vec4(0.0, 0.0, 0.0, 1.0), smoothstep(0.1, 0.6, crackMask));
          } else {
            // During filling phase, blend in gold
            float fillMask = crackMask * u_goldFill;
            finalColor = mix(slate, gold, fillMask);
          }
          
          // Add depth to crack edges
          float edge = abs(dFdx(crackMask)) + abs(dFdy(crackMask));
          if (edge > 0.01) {
            finalColor.rgb *= 0.6;
          }
          
          gl_FragColor = finalColor;
        }
      `
    })
  }, [slateTexture, goldTexture])

  // Animation loop
  useFrame((state) => {
    if (!materialRef.current) return
    
    const currentTime = state.clock.elapsedTime
    const stageTime = currentTime - stageStartTime.current
    
    // Update time uniform
    materialRef.current.uniforms.u_time.value = currentTime
    
    // Stage-based animation
    if (stage === 'slate' && stageTime > 2) {
      setStage('cracking')
      stageStartTime.current = currentTime
    } else if (stage === 'cracking') {
      materialRef.current.uniforms.u_crackAmount.value = Math.min(stageTime / 2, 1)
      if (stageTime > 2) {
        setStage('filling')
        stageStartTime.current = currentTime
      }
    } else if (stage === 'filling') {
      materialRef.current.uniforms.u_goldFill.value = Math.min(stageTime / 3, 1)
      if (stageTime > 3) {
        setStage('flowing')
        materialRef.current.uniforms.u_flowSpeed.value = 1
      }
    }
    
    // Slight rotation for 3D effect
    if (meshRef.current) {
      meshRef.current.rotation.y = Math.sin(currentTime * 0.1) * 0.1
      meshRef.current.rotation.x = Math.cos(currentTime * 0.1) * 0.05
    }
  })

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[4, 4, 128, 128]} />
      <primitive object={shaderMaterial} ref={materialRef} attach="material" />
    </mesh>
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
 * Kintsugi Three.js Scene
 */
export default function KintsugiThreeJS() {
  const [fps, setFps] = useState(0)

  return (
    <ChakraBox position="relative" width="100%" height="100%">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        style={{ background: '#1a1a1a' }}
        gl={{ antialias: true }}
      >
        {/* FPS Counter */}
        <FPSCounter onFpsUpdate={setFps} />
        
        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={0.8} castShadow />
        <directionalLight position={[-5, 5, 5]} intensity={0.5} color="#ffeecc" />
        <pointLight position={[0, 0, 10]} intensity={0.3} />
        
        {/* Kintsugi Mesh */}
        <React.Suspense fallback={null}>
          <KintsugiMesh />
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
  )
}