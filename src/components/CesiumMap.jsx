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
  const [selectedLevel, setSelectedLevel] = useState(5)
  const [selectedCellId, setSelectedCellId] = useState(null)
  const [selectedCellLevel, setSelectedCellLevel] = useState(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [filterProps, setFilterProps] = useState({
    pc_build3d: false,
    pc_green3d: false,
    pc_roads_3d: false
  })
  const [loading, setLoading] = useState(false)

  const colorByType = () => {
    const viewer = viewerRef.current
    const scene = viewer?.scene

    if (!scene) return

    const tileset = scene.primitives._primitives.find(p => p instanceof Cesium3DTileset)
    if (!tileset) return

    const applyColoring = (tile) => {
      if (tile.content?.featuresLength > 0) {
        for (let i = 0; i < tile.content.featuresLength; i++) {
          const feature = tile.content.getFeature(i)
          const type = feature.getProperty('type')?.toLowerCase()

          switch (type) {
            case 'blue':
              feature.color = Color.BLUE
              break
            case 'red':
              feature.color = Color.RED
              break
            case 'green':
              feature.color = Color.GREEN
              break
            default:
              feature.color = Color.WHITE
              break
          }
        }
      }
      tile.children?.forEach(applyColoring)
    }

    applyColoring(tileset.root)
  }

  const applyFilterToTileset = (tileset, activeProps) => {
    if (!tileset || !activeProps || activeProps.length === 0) {
      // Если нет фильтров — показываем всё
      tileset.style = undefined
      return
    }

    const condition = activeProps.map(prop => `\${${prop}} > 5`).join(' && ')

    tileset.style = new Cesium.Cesium3DTileStyle({
      show: {
        conditions: [
          [condition, "true"],
          ["true", "false"]
        ]
      }
    })

    console.log(`[✓] Applied tile style filter: ${condition}`)
  }

  // const applyFeatureFilter = (tileset) => {
  //   const props = Object.keys(filterProps).filter(key => filterProps[key])
  //   console.log('applyFeatureFilter props: - ', props)
  //   if (props.length === 0) {
  //     // Если ничего не выбрано — показать все фичи
  //     const resetTile = (tile) => {
  //       if (tile.content?.featuresLength > 0) {
  //         for (let i = 0; i < tile.content.featuresLength; i++) {
  //           tile.content.getFeature(i).show = true
  //         }
  //       }
  //       tile.children?.forEach(resetTile)
  //     }
  //     resetTile(tileset.root)
  //     return
  //   }
  //
  //   const filterTile = (tile) => {
  //     if (tile.content?.featuresLength > 0) {
  //       for (let i = 0; i < tile.content.featuresLength; i++) {
  //         const feature = tile.content.getFeature(i)
  //
  //         if (props.length === 0) {
  //           feature.show = true
  //           continue
  //         }
  //
  //         const shouldShow = props.every((prop) => {
  //           const val = parseFloat(feature.getProperty(prop))
  //           console.log('val: ', val)
  //           console.log('!isNaN(val) && val > 0', !isNaN(val) && val > 0)
  //           return !isNaN(val) && val > 0
  //         })
  //
  //         feature.show = false
  //       }
  //     }
  //
  //     tile.children?.forEach(filterTile)
  //   }
  //
  //   filterTile(tileset.root)
  // }

  const loadTileset = async (level) => {

    try {
      const viewer = viewerRef.current
      if (!viewer) throw new Error('Viewer is not initialized yet')
      setLoading(true)
      viewer.scene.primitives.removeAll()

      const tileset = await Cesium3DTileset.fromUrl(
        `https://s3-3d-tiles.s3.eu-north-1.amazonaws.com/lvl${level}m/tileset/tileset.json`
      //   `https://s3-3d-tiles.s3.eu-north-1.amazonaws.com/marked/lvl${level}/tileset.json`
      )
      // const tileset = await Cesium3DTileset.fromUrl(
      //   `https://s3-3d-tiles.s3.eu-north-1.amazonaws.com/lvl5tetsfme/lvl4_test/tileset/tileset.json`
      // )
      tileset.maximumScreenSpaceError = 32 // Увеличьте для снижения детализации и повышения производительности
      tileset.maximumMemoryUsage = 512 // Максимальное использование памяти в МБ
      tileset.cullWithChildrenBounds = true // Использовать объединенные границы дочерних тайлов для отсечения
      tileset.dynamicScreenSpaceError = true // Включить динамическую ошибку экранного пространства
      tileset.dynamicScreenSpaceErrorDensity = 0.00278 // Плотность для динамической ошибки
      tileset.dynamicScreenSpaceErrorFactor = 4.0 // Фактор для динамической ошибки
      tileset.dynamicScreenSpaceErrorHeightFalloff = 0.25 // Падение высоты для динамической ошибки
      tileset.skipLevelOfDetail = true // Пропуск уровней детализации
      tileset.baseScreenSpaceError = 1024 // Базовая ошибка экранного пространства
      tileset.skipScreenSpaceErrorFactor = 16 // Фактор ошибки для пропуска уровней
      tileset.skipLevels = 1 // Количество уровней для пропуска
      tileset.immediatelyLoadDesiredLevelOfDetail = false // Немедленная загрузка желаемого уровня детализации
      tileset.loadSiblings = false // Загрузка соседних тайлов
      tileset.foveatedScreenSpaceError = true // Приоритизация загрузки тайлов в центре экрана
      tileset.foveatedConeSize = 0.1 // Размер конуса для фовеации
      tileset.foveatedMinimumScreenSpaceErrorRelaxation = 0.0 // Минимальное ослабление ошибки экранного пространства для фовеации
      tileset.foveatedTimeDelay = 0.2 // Задержка времени для фовеации

      // tileset.maximumScreenSpaceError = 2
      // tileset.dynamicScreenSpaceError = true
      // tileset.maximumMemoryUsage = 128
      // tileset.skipLevelOfDetail = true
      // tileset.immediatelyLoadDesiredLevelOfDetail = false
      // tileset.preloadWhenHidden = false
      // tileset.preloadFlightDestinations = false

      viewer.scene.primitives.add(tileset)
      await viewer.zoomTo(tileset)
      applyFilterToTileset(tileset, Object.keys(filterProps).filter(k => filterProps[k]))
      setLoading(false)
      console.log(`%c[✓] Tileset lvl${level} loaded & zoomed`, 'color: green')
    } catch (error) {
      console.error(`%c[✗] Error loading tileset lvl${level}m:`, 'color: red', error)
    }
  }

  const showParentFeature = () => {
    if (!renderedFeature) return
    const parentId = renderedFeature.getProperty('parent_id')
    const level = parseInt(renderedFeature.getProperty('level'))

    if (!parentId || isNaN(level)) {
      console.warn('Нет данных о родителе или уровне.')
      return
    }

    const newLevel = level + 1

    // Сброс текущего
    if (selectedFeatureRef.current && selectedFeatureRef.current.color) {
      try {
        selectedFeatureRef.current.color = Color.WHITE
      } catch (e) {
        console.warn('Не удалось сбросить цвет предыдущей фичи:', e)
      }
      selectedFeatureRef.current = null
      setRenderedFeature(null)
    }

    setSelectedLevel(newLevel)

    loadTileset(newLevel).then(() => {
      setTimeout(() => {
        const viewer = viewerRef.current
        const scene = viewer?.scene

        const tileset = scene.primitives._primitives.find(p => p instanceof Cesium3DTileset)
        if (!tileset) return

        const highlightTile = (tile) => {
          if (tile.content?.featuresLength > 0) {
            for (let i = 0; i < tile.content.featuresLength; i++) {
              const feature = tile.content.getFeature(i)
              const cellId = feature.getProperty('cell_id')

              if (cellId === parentId.toString()) {
                feature.color = Color.BLUE
                selectedFeatureRef.current = feature
                setRenderedFeature(feature)
              } else {
                feature.color = new Color(1, 1, 1, 0.05) // полупрозрачный
              }
            }
          }
          tile.children?.forEach(highlightTile)
        }

        highlightTile(tileset.root)
      }, 500)
    })
  }

  const handleSearch = (searchId, isParentSearch = false) => {
    const viewer = viewerRef.current
    const scene = viewer?.scene

    if (!scene || !searchId) return

    const tileset = scene.primitives._primitives.find(p => p instanceof Cesium3DTileset)
    if (!tileset) return

    let found = false

    const searchInTile = (tile) => {
      if (tile.content?.featuresLength > 0) {
        for (let i = 0; i < tile.content.featuresLength; i++) {
          const feature = tile.content.getFeature(i)
          const targetValue = isParentSearch ? feature.getProperty('parent_id') : feature.getProperty('cell_id')
          console.log('targetValue: ', targetValue)
          console.log('searchId: ', searchId)
          if (targetValue === searchId) {
            if (!isParentSearch && selectedFeatureRef.current && selectedFeatureRef.current !== feature) {
              selectedFeatureRef.current.color = Color.WHITE
            }

            feature.color = Color.BLUE

            if (!isParentSearch) {
              selectedFeatureRef.current = feature
              setRenderedFeature(feature)
              setSelectedCellId(searchId)
              setSelectedCellLevel(feature.getProperty('level'))
            }

            found = true
          }
        }
      }

      tile.children?.forEach(searchInTile)
    }

    searchInTile(tileset.root)

    if (!found) {
      console.warn(`Cell ID ${searchId} not found.`)
    }
  }

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging) {
        setPopupPosition((prev) => ({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y,
        }))
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, dragOffset])

  useEffect(() => {

    const viewer = new Viewer('cesiumContainer', {
      sceneMode: 3,
      baseLayerPicker: true,
      infoBox: false,
      selectionIndicator: false,
      timeline: false,
      animation: false,
      creditContainer: document.createElement('div')
    })

    viewerRef.current = viewer
    viewer.scene.globe.depthTestAgainstTerrain = true

    // const loadTileset = async () => {
    //   try {
    //
    //     //FIXME OLD ONE
    //     // const tileset = await Cesium3DTileset.fromUrl('https://my-3d-tiles.s3.eu-north-1.amazonaws.com/tiles/test/tileset.json')
    //     const tileset = await Cesium3DTileset.fromUrl('https://s3-3d-tiles.s3.eu-north-1.amazonaws.com/lvl5/tileset.json')
    //     viewer.scene.primitives.add(tileset)
    //     await viewer.zoomTo(tileset)
    //     console.log('%c[✓] Tileset loaded & zoomed', 'color: green')
    //   } catch (error) {
    //     console.error('%c[✗] Error loading tileset:', 'color: red', error)
    //   }
    // }



    loadTileset(selectedLevel)

    const handler = new ScreenSpaceEventHandler(viewer.scene.canvas)

    handler.setInputAction((movement) => {
      const pickedFeature = viewer.scene.pick(movement.position)
      console.log('%c[✓] Picked Feature:', 'color: cyan', pickedFeature)
      // debugger
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
        setSelectedCellId(pickedFeature.getProperty('cell_id'))
        setSelectedCellLevel(pickedFeature.getProperty('level'))
        setPopupPosition({ x: movement.position.x, y: movement.position.y })
      } else {
        setSelectedCellId(null)
        setSelectedCellLevel(null)
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

  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer) return

    const tileset = viewer.scene.primitives._primitives.find(p => p instanceof Cesium3DTileset)
    if (tileset) applyFilterToTileset(tileset, Object.keys(filterProps).filter(k => filterProps[k]))
  }, [filterProps])

  return (
    <>
      {loading && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: '20px 40px',
          borderRadius: '8px',
          zIndex: 2000
        }}>
          Загрузка тайлсета...
        </div>
      )}
      <div id="cesiumContainer" style={{ width: '100%', height: '100vh' }} />
      <UI
        onToggleLevel={(level) => {
          // Сбросить предыдущую выбранную фичу и скрыть попап
          if (selectedFeatureRef.current && selectedFeatureRef.current.color) {
            try {
              selectedFeatureRef.current.color = Color.WHITE
            } catch (e) {
              console.warn('Не удалось сбросить цвет предыдущей фичи:', e)
            }
            selectedFeatureRef.current = null
            setRenderedFeature(null)
            setSelectedCellId(null)
            setSelectedCellLevel(null)
          }
          setFilterProps({ pc_build3d: false, pc_green3d: false, pc_roads_3d: false })
          setSelectedLevel(level)
          loadTileset(level)
        }}
        filterProps={filterProps}
        activeLevels={[selectedLevel]}
        onSearch={handleSearch}
        onColorByType={colorByType}
        setFilterProps={setFilterProps}
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
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'move',
              userSelect: 'none',
              pointerEvents: 'auto'
            }}
            onMouseDown={(e) => {
              setIsDragging(true)
              setDragOffset({
                x: e.clientX - popupPosition.x,
                y: e.clientY - popupPosition.y,
              })
            }}
          >
            <strong>Selected Feature</strong>
            <button
              onClick={() => {
                setRenderedFeature(null)
                setSelectedCellId(null)
                setSelectedCellLevel(null)
              }}
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
          <button
            onClick={showParentFeature}
            style={{
              marginTop: '10px',
              backgroundColor: '#0066cc',
              border: 'none',
              color: 'white',
              padding: '6px 12px',
              borderRadius: '4px',
              cursor: 'pointer',
              pointerEvents: 'auto'
            }}
          >
            Показать родительские айтемы
          </button>
          <button
            onClick={async () => {
              if (selectedCellId && selectedCellLevel) {
                // Сброс текущей фичи
                if (selectedFeatureRef.current && selectedFeatureRef.current.color) {
                  try {
                    selectedFeatureRef.current.color = Color.WHITE
                  } catch (e) {
                    console.warn('Не удалось сбросить цвет предыдущей фичи:', e)
                  }
                  selectedFeatureRef.current = null
                  setRenderedFeature(null)
                }

                const newLevel = parseInt(selectedCellLevel)
                setSelectedLevel(newLevel)
                console.log('newLevel: ', newLevel)
                await loadTileset(newLevel)
                setTimeout(() => {
                  handleSearch(selectedCellId)
                }, 500)
              }
            }}
            disabled={renderedFeature?.getProperty('cell_id') === selectedCellId}
            style={{
              marginTop: '8px',
              backgroundColor: renderedFeature?.getProperty('cell_id') === selectedCellId ? '#999' : '#00aa88',
              border: 'none',
              color: 'white',
              padding: '6px 12px',
              borderRadius: '4px',
              cursor: renderedFeature?.getProperty('cell_id') === selectedCellId ? 'default' : 'pointer',
              pointerEvents: 'auto',
              opacity: renderedFeature?.getProperty('cell_id') === selectedCellId ? 0.6 : 1
            }}
          >
            Вернуться в первоначальный айтем
          </button>
          <button
            onClick={() => {
              if (!renderedFeature || !selectedCellId) return

              const level = parseInt(renderedFeature.getProperty('level'))
              const current_cell_id = renderedFeature.getProperty('cell_id')
              if (isNaN(level) || level <= 1) return

              const newLevel = level - 1

              // Сброс текущей фичи
              if (selectedFeatureRef.current && selectedFeatureRef.current.color) {
                try {
                  selectedFeatureRef.current.color = Color.WHITE
                } catch (e) {
                  console.warn('Не удалось сбросить цвет предыдущей фичи:', e)
                }
                selectedFeatureRef.current = null
                setRenderedFeature(null)
              }

              setSelectedLevel(newLevel)
              console.log('setSelectedLevel newLevel: ', newLevel)
              loadTileset(newLevel).then(() => {
                setTimeout(() => {
                  const viewer = viewerRef.current
                  const scene = viewer?.scene

                  const tileset = scene.primitives._primitives.find(p => p instanceof Cesium3DTileset)
                  if (!tileset) return

                  const highlightChildren = (tile) => {
                    if (tile.content?.featuresLength > 0) {
                      // debugger
                      for (let i = 0; i < tile.content.featuresLength; i++) {
                        const feature = tile.content.getFeature(i)
                        const parentId = feature.getProperty('parent_id')
                        console.log('Feature::')
                        console.log(current_cell_id.toString(), ' :current_cell_id:')
                        console.log(parentId, ' :parentId')
                        if (parentId === current_cell_id.toString()) {
                          feature.color = Color.BLUE
                        } else {
                          feature.color = new Color(1, 1, 1, 0.05)
                        }
                      }
                    }
                    tile.children?.forEach(highlightChildren)
                  }

                  highlightChildren(tileset.root)
                }, 3000)
              })
            }}
            style={{
              marginTop: '8px',
              backgroundColor: '#0066cc',
              border: 'none',
              color: 'white',
              padding: '6px 12px',
              borderRadius: '4px',
              cursor: 'pointer',
              pointerEvents: 'auto'
            }}
          >
            Показать дочерние айтемы
          </button>
        </div>
      )}
    </>
  )
}

export default CesiumMap