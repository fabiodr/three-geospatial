import { useFrame } from '@react-three/fiber'
import { useEffect } from 'react'

import { type CloudsPass } from '@takram/three-clouds'
import { type CloudsProps } from '@takram/three-clouds/r3f'

import { useControls } from '../helpers/useControls'

export interface CloudsControlParams {
  enabled: boolean
  toneMapping: boolean
}

export function useCloudsControls(
  pass: CloudsPass | null,
  {
    coverage: defaultCoverage,
    animate: defaultAnimate,
    localWeatherVelocity: defaultLocalWeatherVelocity
  }: {
    coverage?: number
    animate?: boolean
    localWeatherVelocity?: number
  } = {}
): [CloudsControlParams, Partial<CloudsProps>] {
  const { enabled, coverage, animate, shapeDetail, lightShafts } = useControls(
    'clouds',
    {
      enabled: true,
      coverage: { value: defaultCoverage ?? 0.3, min: 0, max: 1, step: 0.01 },
      animate: defaultAnimate ?? false,
      shapeDetail: true,
      lightShafts: true
    }
  )

  useEffect(() => {
    if (pass == null) {
      return
    }
    pass.renderPass.currentMaterial.shapeDetail = shapeDetail
  }, [pass, shapeDetail])

  const { temporalUpscale, resolutionScale } = useControls(
    'clouds rendering',
    {
      temporalUpscale: true,
      resolutionScale: { value: 1, options: [0.25, 0.5, 0.75, 1] }
    },
    { collapsed: true }
  )

  const {
    mapSize: shadowMapSize,
    cascadeCount,
    temporalPass: shadowTemporalPass,
    temporalJitter: shadowTemporalJitter
  } = useControls(
    'shadow rendering',
    {
      mapSize: { value: 512, options: [256, 512, 1024] },
      cascadeCount: { value: 3, options: [1, 2, 3, 4] },
      temporalPass: true,
      temporalJitter: true
    },
    { collapsed: true }
  )

  useEffect(() => {
    if (pass != null) {
      pass.shadow.cascadeCount = cascadeCount
      pass.shadowPass.temporalPass = shadowTemporalPass
      pass.shadowPass.currentMaterial.temporalJitter = shadowTemporalJitter
    }
  }, [pass, cascadeCount, shadowTemporalPass, shadowTemporalJitter])

  const scatteringParams = useControls(
    'scattering',
    {
      scatteringCoefficient: { value: 1, min: 0, max: 5 },
      absorptionCoefficient: { value: 0.02, min: 0, max: 5 },
      scatterAnisotropy1: { value: 0.7, min: 0, max: 1 },
      scatterAnisotropy2: { value: -0.2, min: -1, max: 0 },
      scatterAnisotropyMix: { value: 0.5, min: 0, max: 1 },
      skyIrradianceScale: { value: 2.5, min: 0, max: 5 },
      groundIrradianceScale: { value: 3, min: 0, max: 10 },
      powderScale: { value: 0.8, min: 0, max: 1 },
      powderExponent: { value: 150, min: 1, max: 1000 }
    },
    { collapsed: true }
  )

  const cloudsRaymarchParams = useControls(
    'clouds raymarch',
    {
      maxIterations: { value: 500, min: 100, max: 1000 },
      minStepSize: { value: 50, min: 50, max: 200 },
      maxStepSize: { value: 1000, min: 200, max: 2000 },
      maxRayDistance: { value: 5e5, min: 1e4, max: 1e6 },
      maxSunIterations: { value: 3, min: 0, max: 10, step: 1 },
      maxGroundIterations: { value: 2, min: 0, max: 10, step: 1 }
    },
    { collapsed: true }
  )

  const shadowRaymarchParams = useControls(
    'shadow raymarch',
    {
      maxIterations: { value: 50, min: 10, max: 100 },
      minStepSize: { value: 100, min: 50, max: 200 },
      maxStepSize: { value: 1000, min: 200, max: 2000 },
      maxOpticalDepthTailScale: { value: 2, min: 0, max: 4 }
    },
    { collapsed: true }
  )

  useFrame(() => {
    if (pass == null) {
      return
    }
    for (const key in scatteringParams) {
      pass.renderPass.currentMaterial.uniforms[key].value =
        scatteringParams[key as keyof typeof scatteringParams]
    }
    for (const key in cloudsRaymarchParams) {
      pass.renderPass.currentMaterial.uniforms[key].value =
        cloudsRaymarchParams[key as keyof typeof cloudsRaymarchParams]
    }
    for (const key in shadowRaymarchParams) {
      pass.shadowPass.currentMaterial.uniforms[key].value =
        shadowRaymarchParams[key as keyof typeof shadowRaymarchParams]
    }
  })

  const {
    showSampleCount: debugShowSampleCount,
    showFrontDepth: debugShowFrontDepth,
    showShadowMap: debugShowShadowMap,
    showCascades: debugShowCascades,
    showUv: debugShowUv,
    showShadowLength: debugShowShadowLength,
    showVelocity: debugShowVelocity
  } = useControls(
    'debug',
    {
      showSampleCount: false,
      showFrontDepth: false,
      showShadowMap: false,
      showCascades: false,
      showUv: false,
      showShadowLength: false,
      showVelocity: false
    },
    { collapsed: true }
  )

  useEffect(() => {
    if (pass == null) {
      return
    }
    if (debugShowSampleCount) {
      pass.renderPass.currentMaterial.defines.DEBUG_SHOW_SAMPLE_COUNT = '1'
    } else {
      delete pass.renderPass.currentMaterial.defines.DEBUG_SHOW_SAMPLE_COUNT
    }
    if (debugShowFrontDepth) {
      pass.renderPass.currentMaterial.defines.DEBUG_SHOW_FRONT_DEPTH = '1'
    } else {
      delete pass.renderPass.currentMaterial.defines.DEBUG_SHOW_FRONT_DEPTH
    }
    if (debugShowShadowMap) {
      pass.renderPass.currentMaterial.defines.DEBUG_SHOW_SHADOW_MAP = '1'
    } else {
      delete pass.renderPass.currentMaterial.defines.DEBUG_SHOW_SHADOW_MAP
    }
    if (debugShowCascades) {
      pass.renderPass.currentMaterial.defines.DEBUG_SHOW_CASCADES = '1'
    } else {
      delete pass.renderPass.currentMaterial.defines.DEBUG_SHOW_CASCADES
    }
    if (debugShowUv) {
      pass.renderPass.currentMaterial.defines.DEBUG_SHOW_UV = '1'
    } else {
      delete pass.renderPass.currentMaterial.defines.DEBUG_SHOW_UV
    }
    pass.renderPass.currentMaterial.needsUpdate = true
  }, [
    pass,
    debugShowSampleCount,
    debugShowFrontDepth,
    debugShowShadowMap,
    debugShowCascades,
    debugShowUv
  ])

  useEffect(() => {
    if (pass == null) {
      return
    }
    if (debugShowShadowLength) {
      pass.renderPass.resolveMaterial.defines.DEBUG_SHOW_SHADOW_LENGTH = '1'
    } else {
      delete pass.renderPass.resolveMaterial.defines.DEBUG_SHOW_SHADOW_LENGTH
    }
    if (debugShowVelocity) {
      pass.renderPass.resolveMaterial.defines.DEBUG_SHOW_VELOCITY = '1'
    } else {
      delete pass.renderPass.resolveMaterial.defines.DEBUG_SHOW_VELOCITY
    }
    pass.renderPass.resolveMaterial.needsUpdate = true
  }, [pass, debugShowShadowLength, debugShowVelocity])

  return [
    {
      enabled,
      toneMapping:
        !debugShowSampleCount &&
        !debugShowFrontDepth &&
        !debugShowUv &&
        !debugShowShadowMap &&
        !debugShowShadowLength
    },
    {
      coverage,
      temporalUpscale: temporalUpscale && !debugShowShadowMap,
      'resolution-scale': resolutionScale,
      localWeatherVelocity: animate
        ? [defaultLocalWeatherVelocity ?? 0.001, 0]
        : [0, 0],
      'shadow-mapSize': [shadowMapSize, shadowMapSize],
      lightShafts
    }
  ]
}
