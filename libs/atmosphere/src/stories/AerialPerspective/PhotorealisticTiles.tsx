import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { SMAA, ToneMapping } from '@react-three/postprocessing'
import { type StoryFn } from '@storybook/react'
import { GoogleCloudAuthPlugin, type Tile } from '3d-tiles-renderer'
import { GlobeControls } from '3d-tiles-renderer/src/three/controls/GlobeControls'
import { useControls } from 'leva'
import {
  EffectMaterial,
  SMAAPreset,
  ToneMappingMode,
  type EffectComposer as EffectComposerImpl
} from 'postprocessing'
import { useEffect, useMemo, useRef, type FC } from 'react'
import { Mesh, Vector3, type BufferGeometry, type Group } from 'three'
import { DRACOLoader, GLTFLoader } from 'three-stdlib'

import {
  GooglePhotorealisticTilesRenderer,
  TILE_ASYNC_STATE,
  TileCompressionPlugin,
  TilesFadePlugin,
  toCreasedNormalsAsync,
  UpdateOnChangePlugin
} from '@geovanni/3d-tiles'
import {
  Cartographic,
  getMoonDirectionECEF,
  getSunDirectionECEF,
  isNotFalse,
  radians
} from '@geovanni/core'
import { Depth, EffectComposer, LensFlare, Normal } from '@geovanni/effects'
import { useRendererControls } from '@geovanni/react'

import { AerialPerspective } from '../../AerialPerspective'
import { type AerialPerspectiveEffect } from '../../AerialPerspectiveEffect'
import { Atmosphere, type AtmosphereImpl } from '../../Atmosphere'
import { Stars, type StarsImpl } from '../../Stars'
import { useMotionDate } from '../useMotionDate'

const location = new Cartographic(
  // Coordinates of Tokyo station.
  radians(139.7671),
  radians(35.6812)
)

const surfaceNormal = location.toVector().normalize()
const cameraPosition = location
  .toVector()
  .add(new Vector3().copy(surfaceNormal).multiplyScalar(2000))

const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/')

const onLoadModel = ((event: {
  type: 'load-model'
  scene: Group
  tile: Tile
}): void => {
  event.scene.traverse(object => {
    if (object instanceof Mesh) {
      const geometry: BufferGeometry = object.geometry
      event.tile[TILE_ASYNC_STATE] = {
        promise: toCreasedNormalsAsync(geometry, radians(30)).then(result => {
          object.geometry = result
          // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
          delete event.tile[TILE_ASYNC_STATE]
        })
      }
    }
  })
}) as (event: Object) => void

const Scene: FC = () => {
  useRendererControls({ exposure: 10 })

  const { normal, depth, depthNormal } = useControls('effect', {
    depth: false,
    normal: false,
    depthNormal: false
  })

  const motionDate = useMotionDate()
  const sunDirectionRef = useRef(new Vector3())
  const moonDirectionRef = useRef(new Vector3())
  const atmosphereRef = useRef<AtmosphereImpl>(null)
  const starsRef = useRef<StarsImpl>(null)
  const aerialPerspectiveRef = useRef<AerialPerspectiveEffect>(null)

  useFrame(() => {
    const date = new Date(motionDate.get())
    getSunDirectionECEF(date, sunDirectionRef.current)
    getMoonDirectionECEF(date, moonDirectionRef.current)
    if (atmosphereRef.current != null) {
      atmosphereRef.current.material.sunDirection = sunDirectionRef.current
      atmosphereRef.current.material.moonDirection = moonDirectionRef.current
    }
    if (starsRef.current != null) {
      starsRef.current.material.sunDirection = sunDirectionRef.current
    }
    if (aerialPerspectiveRef.current != null) {
      aerialPerspectiveRef.current.sunDirection = sunDirectionRef.current
    }
  })

  const { gl, scene, camera } = useThree()

  const tiles = useMemo(() => {
    const tiles = new GooglePhotorealisticTilesRenderer()
    tiles.registerPlugin(
      new GoogleCloudAuthPlugin({
        apiToken: import.meta.env.STORYBOOK_GOOGLE_MAP_API_KEY
      })
    )
    tiles.registerPlugin(new UpdateOnChangePlugin())
    tiles.registerPlugin(new TileCompressionPlugin())
    tiles.registerPlugin(new TilesFadePlugin())

    const loader = new GLTFLoader(tiles.manager)
    loader.setDRACOLoader(dracoLoader)
    tiles.manager.addHandler(/\.gltf$/, loader)

    return tiles
  }, [])

  useEffect(() => {
    tiles.addEventListener('load-model', onLoadModel)
    return () => {
      tiles.removeEventListener('load-model', onLoadModel)
    }
  }, [tiles])

  useEffect(() => {
    tiles.setCamera(camera)
  }, [tiles, camera])

  useEffect(() => {
    tiles.setResolutionFromRenderer(camera, gl)
  }, [tiles, camera, gl])

  const controls = useMemo(() => {
    const controls = new GlobeControls(scene, camera, gl.domElement, tiles)
    controls.enableDamping = true
    return controls
  }, [scene, camera, gl, tiles])

  useEffect(() => {
    return () => {
      controls.dispose()
    }
  }, [controls])

  const composerRef = useRef<EffectComposerImpl>(null)

  useFrame(() => {
    tiles.update()
    controls.update()

    const composer = composerRef.current
    if (composer != null) {
      composer.passes.forEach(pass => {
        if (pass.fullscreenMaterial instanceof EffectMaterial) {
          pass.fullscreenMaterial.adoptCameraSettings(camera)
        }
      })
    }
  })

  const effectComposer = useMemo(
    () => (
      <EffectComposer
        key={Math.random()}
        ref={composerRef}
        normalPass
        multisampling={0}
      >
        {[
          !normal && !depth && !depthNormal && (
            <AerialPerspective
              key='aerialPerspective'
              ref={aerialPerspectiveRef}
              skyIrradiance={false}
              inputIntensity={0.08}
            />
          ),
          <LensFlare key='lensFlare' />,
          depth && <Depth key='Depth' useTurbo />,
          (normal || depthNormal) && (
            <Normal key='normal' reconstructFromDepth={depthNormal} />
          ),
          !normal && !depth && !depthNormal && (
            <ToneMapping key='toneMapping' mode={ToneMappingMode.AGX} />
          ),
          <SMAA key='smaa' preset={SMAAPreset.ULTRA} />
        ].filter(isNotFalse)}
      </EffectComposer>
    ),
    [normal, depth, depthNormal]
  )

  return (
    <>
      <Atmosphere ref={atmosphereRef} />
      <Stars ref={starsRef} />
      <primitive object={tiles.group} />
      {effectComposer}
    </>
  )
}

export const PhotorealisticTiles: StoryFn = () => {
  return (
    <Canvas
      gl={{
        antialias: false,
        depth: false,
        stencil: false,
        logarithmicDepthBuffer: true
      }}
      camera={{ position: cameraPosition, up: surfaceNormal }}
    >
      <Scene />
    </Canvas>
  )
}
