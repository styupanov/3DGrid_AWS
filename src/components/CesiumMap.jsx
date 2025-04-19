import {
  Viewer,
  Cartesian3,
  Cartographic,
  Cesium3DTileset,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  Color,
} from 'cesium'
import { useState, useEffect, useRef } from 'react'
import UI from './UI'

const CesiumMap = () => {
  const viewerRef = useRef()
  const [cameraHeight, setCameraHeight] = useState(0)
  const selectedFeatureRef = useRef(null)
  const [renderedFeature, setRenderedFeature] = useState(null)
  const [copiedKey, setCopiedKey] = useState(null)
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const viewer = new Viewer('cesiumContainer', {
      sceneMode: 3,
      baseLayerPicker: true,
      infoBox: false,
      selectionIndicator: false,
    })

    viewerRef.current = viewer

    const loadTileset = async () => {
      try {
        const tileset = await Cesium3DTileset.fromUrl('https://my-3d-tiles.s3.eu-north-1.amazonaws.com/tiles/test/tileset.json')
        viewer.scene.primitives.add(tileset)
        await viewer.zoomTo(tileset)
        console.log('%c[✓] Tileset loaded & zoomed', 'color: green')
      } catch (error) {
        console.error('%c[✗] Error loading tileset:', 'color: red', error)
      }
    }

    loadTileset()

    const handler = new ScreenSpaceEventHandler(viewer.scene.canvas)

    handler.setInputAction((movement) => {
      const pickedFeature = viewer.scene.pick(movement.position)
      console.log('%c[✓] Picked Feature:', 'color: cyan', pickedFeature)
      debugger
      // Сброс цвета предыдущей фичи
      if (selectedFeatureRef.current && typeof selectedFeatureRef.current.color !== 'undefined') {
        try {
          selectedFeatureRef.current.color = Color.WHITE
        } catch (e) {
          console.warn('Не удалось сбросить цвет предыдущей фичи:', e)
        }
      }

      if (pickedFeature && pickedFeature.getProperty) {
        if (pickedFeature.color) pickedFeature.color = Color.BLUE
        selectedFeatureRef.current = pickedFeature
        setRenderedFeature(pickedFeature)
        setPopupPosition({ x: movement.position.x, y: movement.position.y })
      } else {
        selectedFeatureRef.current = null
        setRenderedFeature(null)
      }
    }, ScreenSpaceEventType.LEFT_CLICK)

    handler.setInputAction((movement) => {
      const feature = viewer.scene.pick(movement.endPosition)
      if (feature && feature.getProperty) {
        viewer.canvas.style.cursor = 'pointer'
      } else {
        viewer.canvas.style.cursor = 'default'
      }
    }, ScreenSpaceEventType.MOUSE_MOVE)

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
      {renderedFeature && (
        <div
          style={{
            position: 'absolute',
            top: `${popupPosition.y}px`,
            left: `${popupPosition.x}px`,
            transform: 'translate(-50%, -100%)',
            backgroundColor: 'rgba(0, 0, 50, 0.85)',
            color: 'white',
            padding: '12px',
            borderRadius: '8px',
            zIndex: 1000,
            boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
            maxWidth: '300px',
            pointerEvents: 'none'
          }}
        >
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <strong>Selected Feature</strong>
            <button
              onClick={() => setRenderedFeature(null)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'white',
                fontSize: '16px',
                cursor: 'pointer',
                pointerEvents: 'auto'
              }}
              title="Закрыть"
            >
              ×
            </button>
          </div>
          {typeof renderedFeature.getProperty === 'function' && (
            <div style={{marginTop: '8px'}}>
              {renderedFeature.getPropertyIds?.().map((name) => {
                const value = renderedFeature.getProperty(name)?.toString()

                return (
                  <div
                    key={name}
                    style={{
                      marginBottom: '4px',
                      wordBreak: 'break-word',
                      whiteSpace: 'pre-wrap',
                      pointerEvents: 'auto'
                    }}
                  >
                    <strong>{name}:</strong> {value}{' '}
                    <button
                      style={{
                        marginLeft: '6px',
                        cursor: 'pointer',
                        backgroundColor: 'transparent',
                        border: '1px solid white',
                        color: 'white',
                        fontSize: '12px',
                        padding: '2px 6px',
                        borderRadius: '4px'
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        console.log('[COPY]', value)
                        navigator.clipboard.writeText(value)
                        setCopiedKey(name)
                        setTimeout(() => setCopiedKey(null), 1500)
                      }}
                      title="Скопировать"
                    >
                      {copiedKey === name ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </>
  )
}

export default CesiumMap