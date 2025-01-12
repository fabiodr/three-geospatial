/* eslint-disable @typescript-eslint/no-unsafe-declaration-merging */

import {
  GLSL3,
  Matrix4,
  RawShaderMaterial,
  Uniform,
  Vector2,
  Vector3,
  type Camera,
  type Texture
} from 'three'

import { resolveIncludes } from '@takram/three-geospatial'
import { turbo } from '@takram/three-geospatial/shaders'

import fragmentShader from './shaders/cloudsResolve.frag?raw'
import vertexShader from './shaders/cloudsResolve.vert?raw'

export interface CloudsResolveMaterialParameters {
  inputBuffer?: Texture | null
  depthVelocityBuffer?: Texture | null
  historyBuffer?: Texture | null
}

interface CloudsResolveMaterialUniforms {
  [key: string]: Uniform<unknown>
  inputBuffer: Uniform<Texture | null>
  depthVelocityBuffer: Uniform<Texture | null>
  historyBuffer: Uniform<Texture | null>
  inverseProjectionMatrix: Uniform<Matrix4>
  inverseViewMatrix: Uniform<Matrix4>
  reprojectionMatrix: Uniform<Matrix4>
  texelSize: Uniform<Vector2>
  cameraPosition: Uniform<Vector3>
}

export interface CloudsResolveMaterial {
  uniforms: CloudsResolveMaterialUniforms
}

export class CloudsResolveMaterial extends RawShaderMaterial {
  constructor({
    inputBuffer = null,
    depthVelocityBuffer = null,
    historyBuffer = null
  }: CloudsResolveMaterialParameters = {}) {
    super({
      name: 'CloudsResolveMaterial',
      glslVersion: GLSL3,
      vertexShader,
      fragmentShader: resolveIncludes(fragmentShader, {
        core: {
          turbo
        }
      }),
      uniforms: {
        inputBuffer: new Uniform(inputBuffer),
        depthVelocityBuffer: new Uniform(depthVelocityBuffer),
        historyBuffer: new Uniform(historyBuffer),
        inverseProjectionMatrix: new Uniform(new Matrix4()),
        inverseViewMatrix: new Uniform(new Matrix4()),
        reprojectionMatrix: new Uniform(new Matrix4()),
        texelSize: new Uniform(new Vector2()),
        cameraPosition: new Uniform(new Vector3())
      } satisfies CloudsResolveMaterialUniforms,
      defines: {}
    })
  }

  copyCameraSettings(camera: Camera): void {
    const uniforms = this.uniforms
    uniforms.inverseProjectionMatrix.value.copy(camera.projectionMatrixInverse)
    uniforms.inverseViewMatrix.value.copy(camera.matrixWorld)
    camera.getWorldPosition(uniforms.cameraPosition.value)
  }

  setReprojectionMatrix(camera: Camera): void {
    const uniforms = this.uniforms
    uniforms.reprojectionMatrix.value
      .copy(camera.projectionMatrix)
      .multiply(camera.matrixWorldInverse)
  }

  setSize(width: number, height: number): void {
    this.uniforms.texelSize.value.set(1 / width, 1 / height)
  }
}
