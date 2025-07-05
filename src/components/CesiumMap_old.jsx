import {Viewer, Cartesian3, Cartographic, Cesium3DTileset, Color} from 'cesium'
import { useState, useEffect, useRef } from 'react'
import UI from './UI'

const CesiumMap = () => {
  const viewerRef = useRef()
  const [cameraHeight, setCameraHeight] = useState(0)



  useEffect(() => {
    const viewer = new Viewer('cesiumContainer', {
      sceneMode: 3,
      baseLayerPicker: true,
    })

    viewerRef.current = viewer


    // const loadTileset = async () => {
    //   try {
    //     const tileset = await Cesium3DTileset.fromUrl('https://my-3d-tiles.s3.eu-north-1.amazonaws.com/tiles/test/tileset.json')
    //     viewer.scene.primitives.add(tileset)
    //
    //     await viewer.zoomTo(tileset)
    //     console.log('%c[✓] Tileset loaded & zoomed', 'color: green')
    //   } catch (error) {
    //     console.error('%c[✗] Error loading tileset:', 'color: red', error)
    //   }
    // }

    //FIXME OLD VERSION, if needed blop - uncomment
    const loadTileset = async () => {
      try {
        const response = await fetch('https://my-3d-tiles.s3.eu-north-1.amazonaws.com/tiles/test/tileset.json')
        const data = await response.json()

        const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)

        const tileset = await Cesium3DTileset.fromUrl('https://my-3d-tiles.s3.eu-north-1.amazonaws.com/tiles/test/tileset.json')
        viewer.scene.primitives.add(tileset)

        await viewer.zoomTo(tileset)
        console.log('%c[✓] Tileset loaded & zoomed', 'color: green')
      } catch (error) {
        console.error('%c[✗] Error loading tileset:', 'color: red', error)
      }
    }

    loadTileset()

    viewer.scene.camera.moveEnd.addEventListener(() => {
      const carto = Cartographic.fromCartesian(viewer.scene.camera.position)
      setCameraHeight(carto.height)
    })

    return () => {
      if (viewer && !viewer.isDestroyed()) {
        viewer.destroy()
      }
    }
  }, [])

  return (
    <>
      <div id="cesiumContainer" style={{ width: '100%', height: '100vh' }} />
      <UI
        onToggleLevel={() => {}}
        activeLevels={[1, 2, 3, 4, 5]}
        onSearch={() => {}}
      />
    </>
  )
}

export default CesiumMap