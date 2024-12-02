// Custom types with support for pass through props to work around lack of provided types
declare module '3d-tiles-renderer/r3f' {
  import { type GlobeControls, type TilesRenderer } from '3d-tiles-renderer'
  import { type RefAttributes } from 'react'

  export function TilesPlugin<T extends new (...args: any[]) => any>(
    props: {
      args?: ConstructorParameters<T>[0]
      plugin: T
    } & Partial<ConstructorParameters<T>[0]> &
      RefAttributes<T>
  ): JSX.Element

  export function TilesRenderer<T extends new (...args: any[]) => any>(
    props: {
      url?: String
    } & Partial<ConstructorParameters<T>[0]> &
      RefAttributes<TilesRenderer>
  ): JSX.Element

  export function GlobeControls<T extends new (...args: any[]) => any>(
    props: {} & Partial<ConstructorParameters<T>[0]> &
      RefAttributes<GlobeControls>
  ): JSX.Element
}
