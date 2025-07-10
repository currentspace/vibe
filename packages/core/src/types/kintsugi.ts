/**
 * Kintsugi effect parameters
 */

export interface KintsugiParams {
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
  maxLuminance?: number
  fresnelPower?: number
  anisotropyStrength?: number
}