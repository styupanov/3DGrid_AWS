import {
  Viewer,
  Cartesian3,
  Cartographic,
  Cesium3DTileset,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  Color,
  OpenStreetMapImageryProvider,
} from 'cesium'
import { useState, useEffect, useRef } from 'react'
import UI from './UI'
import {Divider} from 'antd';
import {getLevelConfig} from '@/components/utils';
import coords from '../successful_routes_start_fin_coords.json';
const coordsMap = {};
coords.forEach(item => {
  coordsMap[item.Cell_id] = { lat: item.lat, lon: item.lon };
});

const CesiumMap = () => {
  const viewerRef = useRef()
  const [cameraHeight, setCameraHeight] = useState(0)
  const selectedFeatureRef = useRef(null)
  const [renderedFeature, setRenderedFeature] = useState(null)
  const [copiedKey, setCopiedKey] = useState(null)
  const [popupPosition, setPopupPosition] = useState({ x: 350, y: 20 })
  const [selectedLevel, setSelectedLevel] = useState(5)
  const [selectedCellId, setSelectedCellId] = useState(null)
  const [selectedCellLevel, setSelectedCellLevel] = useState(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [searching, setSearching] = useState(false)
  const [filterProps, setFilterProps] = useState({
    pc_build3d: true,
    pc_green3d: true,
    pc_roads_3d: true,
    pc_water3d: true,
    LST: true,
    NDVI: true,
    AQI: true,
    TJ: true,
  })
  const [filterRanges, setFilterRanges] = useState({
    pc_build3d: [0, 100],
    pc_green3d: [0, 100],
    pc_roads_3d: [0, 100],
    pc_water3d: [0, 100],
    LST: [0, 100],
    NDVI: [0, 100],
    AQI: [0, 100],
    TJ: [0, 100],
  });
  const [selectedProperty, setSelectedProperty] = useState('pc_build3d');
  const [loading, setLoading] = useState(false)
  const [routeInfo, setRouteInfo] = useState({
    startCell: null,
    finishCell: null,
    routeCellIds: [],
  });

  const getBaseColor = () => {
    switch (selectedProperty) {
      case 'pc_build3d': return '#67000D';
      case 'pc_green3d': return '#006837';
      case 'pc_roads_3d': return '#1A1A1A';
      default: return '#000000';
    }
  };

  // const colorBySelectedProperty = (tileset) => {
  //   if (!tileset || !selectedProperty) return;
  //
  //   const colors = [
  //     'color("rgba(0, 102, 255, 0.5)")',
  //     'color("rgba(0, 149, 255, 0.5)")',
  //     'color("rgba(71, 178, 255, 0.5)")',
  //     'color("rgba(94, 202, 239, 0.5)")',
  //     'color("rgba(240, 216, 30, 0.5)")',
  //     'color("rgba(255, 188, 0, 0.5)")',
  //     'color("rgba(255, 137, 3, 0.5)")',
  //     'color("rgba(255, 84, 0, 0.5)")',
  //     'color("rgba(255, 43, 0, 0.5)")',
  //     'color("rgba(255, 0, 0, 0.7)")',
  //   ];
  //
  //   const conditions = [];
  //   for (let i = 0; i < 10; i++) {
  //     const min = i * 10;
  //     const max = i === 9 ? 10000000 : (i + 1) * 10;
  //     conditions.push([`\${${selectedProperty}} >= ${min} && \${${selectedProperty}} < ${max}`, colors[i]]);
  //   }
  //
  //   // fallback
  //   conditions.push(['true', 'color("white")']);
  //
  //   tileset.style = new Cesium.Cesium3DTileStyle({
  //     color: {
  //       conditions
  //     }
  //   });
  // };

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

  const applyStyleToTileset = (tileset, activeProps, filterRanges, selectedProperty, routeInfo) => {
    if (!tileset) return;

    const style = {};
    console.log(':::::BEFORE FILTERS:::::')
    console.log('activeProps: ', activeProps)
    console.log('filterRanges: ', filterRanges)
    // === 1. ФИЛЬТРАЦИЯ ===
    if (routeInfo?.routeCellIds?.length > 0) {
      console.log('// === ROUTE FILTER ===');

      const idsSet = new Set(routeInfo.routeCellIds);
      const routeCondition = Array.from(idsSet)
        .map(id => `\${cell_id} === '${id}'`)
        .join(' || ');

      style.show = {
        conditions: [
          [routeCondition, 'true'],
          ['true', 'false']
        ]
      };

      console.log(`[✓] Applied route filter: ${routeCondition}`);
    } else if (activeProps?.length > 0) {
      console.log('// === 1. ФИЛЬТРАЦИЯ ===');
      const filterConditions = activeProps.map(key => {
        const [min, max] = filterRanges[key] || [0, 100];
        return `\${${key}} >= ${min} && \${${key}} <= ${max}`;
      });
      const combinedFilter = filterConditions.join(' && ');

      const showConditions = [];

      // Добавим первым условием исключение по selectedProperty === 0
      if (selectedProperty) {
        showConditions.push([`\${${selectedProperty}} === 0`, 'false']);
      }

      // Основное условие фильтра
      showConditions.push([combinedFilter, 'true']);
      showConditions.push(['true', 'false']); // fallback

      style.show = { conditions: showConditions };

      console.log(`[✓] Applied filter condition: ${combinedFilter} + no zero`);
    }
    console.log('Im at applyStyleToTileset, before // === 2. РАСКРАСКА ===')
    // === 2. РАСКРАСКА ===
    if (selectedProperty) {
      console.log('Im in // === 2. РАСКРАСКА ===');

      const colors = [
        'color("rgba(0, 102, 255, 0.05)")',
        'color("rgba(0, 149, 255, 0.2)")',
        'color("rgba(71, 178, 255, 0.3)")',
        'color("rgba(94, 202, 239, 0.4)")',
        'color("rgba(240, 216, 30, 0.5)")',
        'color("rgba(255, 188, 0, 0.6)")',
        'color("rgba(255, 137, 3, 0.7)")',
        'color("rgba(255, 84, 0, 0.8)")',
        'color("rgba(255, 43, 0, 0.9)")',
        'color("rgba(255, 0, 0, 1)")',
      ];

      const levelConfig = getLevelConfig([selectedLevel][0]);
      const { thresholds } = levelConfig;

      const colorConditions = [];

      // if (routeInfo && routeInfo.startCell) {
      //   colorConditions.push([
      //     `\${cell_id} === '${routeInfo.startCell}'`,
      //     'color("green")'
      //   ]);
      // }
      //
      // if (routeInfo && routeInfo.finishCell) {
      //   colorConditions.push([
      //     `\${cell_id} === '${routeInfo.finishCell}'`,
      //     'color("red")'
      //   ]);
      // }
      //
      // if (routeInfo && Array.isArray(routeInfo.routeCellIds) && routeInfo.routeCellIds.length > 0) {
      //   // оставляем только routeCellIds
      //   const idsSet = new Set(routeInfo.routeCellIds);
      //   style.show = new Cesium.Expression(
      //     `(${Array.from(idsSet).map(id => `\${cell_id} === '${id}'`).join(' || ')})`
      //   );
      // } else {
      //   style.show = undefined; // показываем всё если нет маршрута
      // }

      for (let i = 0; i < thresholds.length - 1; i++) {
        const min = thresholds[i];
        const max = thresholds[i + 1];
        colorConditions.push([
          `\${${selectedProperty}} >= ${min} && \${${selectedProperty}} < ${max}`,
          colors[i]
        ]);
      }

      colorConditions.push(['true', 'color("rgba(0,0,0,0)")']); // fallback

      style.color = { conditions: colorConditions };

      console.log(`[✓] Applied fixed color scheme by ${selectedProperty}`);
    }

    tileset.style = new Cesium.Cesium3DTileStyle(style);
    console.log(tileset.style)
  };

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
        // `https://s3-3d-tiles.s3.eu-north-1.amazonaws.com/lvl2_routing/tileset.json`
        `https://s3-3d-tiles.s3.eu-north-1.amazonaws.com/lvl${level}/tileset.json`
        // `https://s3-3d-tiles.s3.eu-north-1.amazonaws.com/lvl${level}m/tileset/tileset.json`
        //   `https://s3-3d-tiles.s3.eu-north-1.amazonaws.com/lvl3_test_merged-tiles/tileset.json`
        //   `https://s3-3d-tiles.s3.eu-north-1.amazonaws.com/marked/lvl${level}/tileset.json`
      )
      // const tileset = await Cesium3DTileset.fromUrl(
      //   `https://s3-3d-tiles.s3.eu-north-1.amazonaws.com/lvl5tetsfme/lvl4_test/tileset/tileset.json`
      // )

      tileset.maximumScreenSpaceError = 8 // Увеличьте для снижения детализации и повышения производительности
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

      viewer.scene.primitives.add(tileset)
      await viewer.zoomTo(tileset)
      applyStyleToTileset(tileset, Object.keys(filterProps).filter(k => filterProps[k]), filterRanges, selectedProperty);
      // applyFilterToTileset(tileset, Object.keys(filterProps).filter(k => filterProps[k]))
      // colorBySelectedProperty(tileset)
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

  const handleSearch = (searchId, isParentSearch = false, color = Color.BLUE) => {
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

          if (targetValue === searchId) {
            if (!isParentSearch && selectedFeatureRef.current && selectedFeatureRef.current !== feature) {
              selectedFeatureRef.current.color = Color.WHITE
            }

            feature.color = color

            if (!isParentSearch) {
              selectedFeatureRef.current = feature
              setRenderedFeature(feature)
              setSelectedCellId(searchId)
              setSelectedCellLevel(feature.getProperty('level'))
              const lon = parseFloat(feature.getProperty('Longitude'));
              const lat = parseFloat(feature.getProperty('Latitude'));
              const height = parseFloat(feature.getProperty('Height') || 0);

              if (!isNaN(lon) && !isNaN(lat)) {
                // целевая точка
                const target = Cesium.Cartesian3.fromDegrees(lon, lat, height);

                // расчёт небольшой «не доезжаемости»
                const offset = new Cesium.Cartesian3(500, 650, -500); // 500 м вверх
                const destination = Cesium.Cartesian3.add(target, offset, new Cesium.Cartesian3());


                viewer.camera.flyTo({
                  destination,
                  duration: 1.5,
                  orientation: {
                    heading: viewer.camera.heading,
                    pitch: viewer.camera.pitch,
                    roll: viewer.camera.roll
                  }
                });

                console.log(`🛰️ Flying to cell_id: ${searchId} at [${lon}, ${lat}, ${height}]`);
              } else {
                console.warn(`🙈 Не удалось получить координаты для cell_id: ${searchId}`);
              }
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
      baseLayerPicker: true,
      sceneMode: 3,
      infoBox: false,
      selectionIndicator: false,
      timeline: false,
      animation: false,
      creditContainer: document.createElement('div')
    })

    viewerRef.current = viewer

    viewer.imageryLayers.addImageryProvider(
      new OpenStreetMapImageryProvider({
        url: 'https://a.tile.openstreetmap.org/'
      })
    )
    // viewer.scene.globe.depthTestAgainstTerrain = true

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
      console.log('Feature properties:');
      pickedFeature.getPropertyIds?.().forEach((name) => {
        console.log(`${name} – ${pickedFeature.getProperty(name)}`);
      });
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
        setPopupPosition({ x: 350, y: 20 })
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
    const viewer = viewerRef.current;
    if (!viewer) return;

    if (selectedLevel !== 2) return;

    const flyAndSearch = (cellId, color) => {
      const coord = coordsMap[cellId]; // твой словарь {cell_id: {lon, lat, height}}

      if (coord) {
        const { lon, lat, height = 0 } = coord;

        const target = Cesium.Cartesian3.fromDegrees(lon, lat, height);
        const offset = new Cesium.Cartesian3(500, 650, -500);
        const destination = Cesium.Cartesian3.add(target, offset, new Cesium.Cartesian3());
        setSearching(true);
        viewer.camera.flyTo({
          destination,
          duration: 1.5,
          orientation: {
            heading: viewer.camera.heading,
            pitch: viewer.camera.pitch,
            roll: viewer.camera.roll
          }
        });

        console.log(`🛰️ Flying (via coords) to cell_id: ${cellId} at [${lon}, ${lat}, ${height}]`);

        setTimeout(() => {
          handleSearch(cellId, false, color)
          setSearching(false)
        }, 4000);

      } else {
        console.warn(`😵 Нет координат в словаре для cell_id: ${cellId}`);
      }
    };

    if (routeInfo.startCell) {
      flyAndSearch(routeInfo.startCell, Cesium.Color.GREEN);
    }

    if (routeInfo.finishCell) {
      flyAndSearch(routeInfo.finishCell, Cesium.Color.RED);
    }
  }, [routeInfo.startCell,routeInfo.finishCell, selectedLevel]);

  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer) return

    const tileset = viewer.scene.primitives._primitives.find(p => p instanceof Cesium3DTileset);
    if (tileset) {
      applyStyleToTileset(tileset, Object.keys(filterProps).filter(k => filterProps[k]), filterRanges, selectedProperty, routeInfo);
      // applyFilterToTileset(tileset, );
    }
  }, [filterProps, filterRanges, selectedProperty, routeInfo]);

  // useEffect(() => {
  //   const viewer = viewerRef.current;
  //   if (!viewer) return;
  //
  //   const tileset = viewer.scene.primitives._primitives.find(p => p instanceof Cesium3DTileset);
  //   if (tileset) {
  //     colorBySelectedProperty(tileset);
  //   }
  // }, [selectedProperty]);

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
      {searching && (
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
          Ищем искомый объект...
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
          setFilterProps({ pc_build3d: true, pc_green3d: true, pc_roads_3d: true })
          setSelectedLevel(level)
          loadTileset(level)
        }}
        filterProps={filterProps}
        activeLevels={[selectedLevel]}
        onSearch={handleSearch}
        onColorByType={colorByType}
        setFilterProps={setFilterProps}
        onUpdateFilterRanges={setFilterRanges}
        selectedProperty={selectedProperty}
        setSelectedProperty={setSelectedProperty}
        onRouteChange={setRouteInfo}
      />
      {renderedFeature && (
        <div
          className={'scrollable-content'}
          style={{
            position: 'absolute',
            top: `${popupPosition.y}px`,
            left: `${popupPosition.x}px`,
            // transform: 'translate(-50%, -100%)',
            backgroundColor: 'rgba(0, 0, 50, 0.85)',
            color: 'white',
            padding: '12px',
            borderRadius: '8px',
            zIndex: 1000,
            boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
            maxWidth: '300px',
            pointerEvents: 'none',
            maxHeight: 'calc(113px + 63vh)',
            overflow: 'scroll',
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
          <Divider
            style={{
              backgroundColor: 'white',
            }}
          />
          {typeof renderedFeature.getProperty === 'function' && (
            <>
              {/*FIXME Level*/}
              <div style={{marginTop: '8px'}}>
                <div
                  key={renderedFeature.getProperty('level')?.toString()}
                  style={{
                    marginBottom: '4px',
                    wordBreak: 'break-word',
                    whiteSpace: 'pre-wrap',
                    pointerEvents: 'auto'
                  }}
                >
                  <strong>Level:</strong> {Math.floor(renderedFeature.getProperty('level')?.toString())}{' '}
                  {/*<button*/}
                  {/*  style={{*/}
                  {/*    marginLeft: '6px',*/}
                  {/*    cursor: 'pointer',*/}
                  {/*    backgroundColor: 'transparent',*/}
                  {/*    border: '1px solid white',*/}
                  {/*    color: 'white',*/}
                  {/*    fontSize: '12px',*/}
                  {/*    padding: '2px 6px',*/}
                  {/*    borderRadius: '4px'*/}
                  {/*  }}*/}
                  {/*  onClick={(e) => {*/}
                  {/*    e.stopPropagation()*/}
                  {/*    console.log('[COPY]', renderedFeature.getProperty('level')?.toString())*/}
                  {/*    navigator.clipboard.writeText(renderedFeature.getProperty('level')?.toString())*/}
                  {/*    setCopiedKey('level')*/}
                  {/*    setTimeout(() => setCopiedKey(null), 1500)*/}
                  {/*  }}*/}
                  {/*  title="Скопировать"*/}
                  {/*>*/}
                  {/*  {copiedKey === name ? 'Copied!' : 'Copy'}*/}
                  {/*</button>*/}
                </div>
              </div>

              {/*FIXME Cell ID*/}
              <div style={{marginTop: '8px'}}>
                <div
                  key={renderedFeature.getProperty('cell_id')?.toString()}
                  style={{
                    marginBottom: '4px',
                    wordBreak: 'break-word',
                    whiteSpace: 'pre-wrap',
                    pointerEvents: 'auto'
                  }}
                >
                  <strong>Cell ID:</strong> {renderedFeature.getProperty('cell_id')?.toString()}{' '}
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
                      console.log('[COPY]', renderedFeature.getProperty('cell_id')?.toString())
                      navigator.clipboard.writeText(renderedFeature.getProperty('cell_id')?.toString())
                      setCopiedKey('cell_id')
                      setTimeout(() => setCopiedKey(null), 1500)
                    }}
                    title="Скопировать"
                  >
                    {copiedKey === name ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              {/*FIXME Parent ID*/}
              <div style={{marginTop: '8px'}}>
                <div
                  key={renderedFeature.getProperty('parent_id')?.toString()}
                  style={{
                    marginBottom: '4px',
                    wordBreak: 'break-word',
                    whiteSpace: 'pre-wrap',
                    pointerEvents: 'auto'
                  }}
                >
                  <strong>Parent ID:</strong> {renderedFeature.getProperty('parent_id')?.toString()}{' '}
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
                      console.log('[COPY]', renderedFeature.getProperty('parent_id')?.toString())
                      navigator.clipboard.writeText(renderedFeature.getProperty('parent_id')?.toString())
                      setCopiedKey('parent_id')
                      setTimeout(() => setCopiedKey(null), 1500)
                    }}
                    title="Скопировать"
                  >
                    {copiedKey === name ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              {/*FIXME HEIGHT*/}
              <div style={{marginTop: '8px'}}>
                <div
                  key={renderedFeature.getProperty('Height')?.toString()}
                  style={{
                    marginBottom: '4px',
                    wordBreak: 'break-word',
                    whiteSpace: 'pre-wrap',
                    pointerEvents: 'auto'
                  }}
                >
                  <strong>Height:</strong> {Math.floor(renderedFeature.getProperty('Height')?.toString())}{' '}
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
                      console.log('[COPY]', renderedFeature.getProperty('Height')?.toString())
                      navigator.clipboard.writeText(renderedFeature.getProperty('Height')?.toString())
                      setCopiedKey('Height')
                      setTimeout(() => setCopiedKey(null), 1500)
                    }}
                    title="Скопировать"
                  >
                    {copiedKey === name ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              {/*FIXME Latitude*/}
              <div style={{marginTop: '8px'}}>
                <div
                  key={renderedFeature.getProperty('Latitude')?.toString()}
                  style={{
                    marginBottom: '4px',
                    wordBreak: 'break-word',
                    whiteSpace: 'pre-wrap',
                    pointerEvents: 'auto'
                  }}
                >
                  <strong>Latitude:</strong> {renderedFeature.getProperty('Latitude')?.toFixed(5)}{' '}
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
                      console.log('[COPY]', renderedFeature.getProperty('Latitude')?.toString())
                      navigator.clipboard.writeText(renderedFeature.getProperty('Latitude')?.toString())
                      setCopiedKey('Latitude')
                      setTimeout(() => setCopiedKey(null), 1500)
                    }}
                    title="Скопировать"
                  >
                    {copiedKey === name ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              {/*FIXME Longitude*/}
              <div style={{marginTop: '8px'}}>
                <div
                  key={renderedFeature.getProperty('Longitude')?.toString()}
                  style={{
                    marginBottom: '4px',
                    wordBreak: 'break-word',
                    whiteSpace: 'pre-wrap',
                    pointerEvents: 'auto'
                  }}
                >
                  <strong>Longitude:</strong> {renderedFeature.getProperty('Longitude')?.toFixed(5)}{' '}
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
                      console.log('[COPY]', renderedFeature.getProperty('Longitude')?.toString())
                      navigator.clipboard.writeText(renderedFeature.getProperty('Longitude')?.toString())
                      setCopiedKey('Longitude')
                      setTimeout(() => setCopiedKey(null), 1500)
                    }}
                    title="Скопировать"
                  >
                    {copiedKey === name ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

            </>
          )}
          <Divider
            style={{
              backgroundColor: 'white',
            }}
          />
          <strong> Percent of filling with:</strong>
          {typeof renderedFeature.getProperty === 'function' && (
            <>
              {/*FIXME Buildings*/}
              <div style={{marginTop: '8px'}}>
                <div
                  key={renderedFeature.getProperty('pc_build3d')?.toString()}
                  style={{
                    marginBottom: '4px',
                    wordBreak: 'break-word',
                    whiteSpace: 'pre-wrap',
                    pointerEvents: 'auto'
                  }}
                >
                  <strong>Buildings:</strong> {renderedFeature.getProperty('pc_build3d')?.toString() + ' ' + '%'}
                  {/*<button*/}
                  {/*  style={{*/}
                  {/*    marginLeft: '6px',*/}
                  {/*    cursor: 'pointer',*/}
                  {/*    backgroundColor: 'transparent',*/}
                  {/*    border: '1px solid white',*/}
                  {/*    color: 'white',*/}
                  {/*    fontSize: '12px',*/}
                  {/*    padding: '2px 6px',*/}
                  {/*    borderRadius: '4px'*/}
                  {/*  }}*/}
                  {/*  onClick={(e) => {*/}
                  {/*    e.stopPropagation()*/}
                  {/*    console.log('[COPY]', renderedFeature.getProperty('level')?.toString())*/}
                  {/*    navigator.clipboard.writeText(renderedFeature.getProperty('level')?.toString())*/}
                  {/*    setCopiedKey('level')*/}
                  {/*    setTimeout(() => setCopiedKey(null), 1500)*/}
                  {/*  }}*/}
                  {/*  title="Скопировать"*/}
                  {/*>*/}
                  {/*  {copiedKey === name ? 'Copied!' : 'Copy'}*/}
                  {/*</button>*/}
                </div>
              </div>

              {/*FIXME Greenary*/}
              <div style={{marginTop: '8px'}}>
                <div
                  key={renderedFeature.getProperty('pc_green3d')?.toString()}
                  style={{
                    marginBottom: '4px',
                    wordBreak: 'break-word',
                    whiteSpace: 'pre-wrap',
                    pointerEvents: 'auto'
                  }}
                >
                  <strong>Greenary:</strong>{renderedFeature.getProperty('pc_green3d')?.toString() + ' ' + '%'}
                  {/*<button*/}
                  {/*  style={{*/}
                  {/*    marginLeft: '6px',*/}
                  {/*    cursor: 'pointer',*/}
                  {/*    backgroundColor: 'transparent',*/}
                  {/*    border: '1px solid white',*/}
                  {/*    color: 'white',*/}
                  {/*    fontSize: '12px',*/}
                  {/*    padding: '2px 6px',*/}
                  {/*    borderRadius: '4px'*/}
                  {/*  }}*/}
                  {/*  onClick={(e) => {*/}
                  {/*    e.stopPropagation()*/}
                  {/*    console.log('[COPY]', renderedFeature.getProperty('level')?.toString())*/}
                  {/*    navigator.clipboard.writeText(renderedFeature.getProperty('level')?.toString())*/}
                  {/*    setCopiedKey('level')*/}
                  {/*    setTimeout(() => setCopiedKey(null), 1500)*/}
                  {/*  }}*/}
                  {/*  title="Скопировать"*/}
                  {/*>*/}
                  {/*  {copiedKey === name ? 'Copied!' : 'Copy'}*/}
                  {/*</button>*/}
                </div>
              </div>

              {/*FIXME Roads*/}
              <div style={{marginTop: '8px'}}>
                <div
                  key={renderedFeature.getProperty('pc_roads_3d')?.toString()}
                  style={{
                    marginBottom: '4px',
                    wordBreak: 'break-word',
                    whiteSpace: 'pre-wrap',
                    pointerEvents: 'auto'
                  }}
                >
                  <strong>Roads:</strong>{renderedFeature.getProperty('pc_roads_3d')?.toString() + ' ' + '%'}
                  {/*<button*/}
                  {/*  style={{*/}
                  {/*    marginLeft: '6px',*/}
                  {/*    cursor: 'pointer',*/}
                  {/*    backgroundColor: 'transparent',*/}
                  {/*    border: '1px solid white',*/}
                  {/*    color: 'white',*/}
                  {/*    fontSize: '12px',*/}
                  {/*    padding: '2px 6px',*/}
                  {/*    borderRadius: '4px'*/}
                  {/*  }}*/}
                  {/*  onClick={(e) => {*/}
                  {/*    e.stopPropagation()*/}
                  {/*    console.log('[COPY]', renderedFeature.getProperty('level')?.toString())*/}
                  {/*    navigator.clipboard.writeText(renderedFeature.getProperty('level')?.toString())*/}
                  {/*    setCopiedKey('level')*/}
                  {/*    setTimeout(() => setCopiedKey(null), 1500)*/}
                  {/*  }}*/}
                  {/*  title="Скопировать"*/}
                  {/*>*/}
                  {/*  {copiedKey === name ? 'Copied!' : 'Copy'}*/}
                  {/*</button>*/}
                </div>
              </div>
            </>
          )}

          <Divider
            style={{
              backgroundColor: 'white',
            }}
          />

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
            Show parent items
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
            Back to first one item
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
            Show children items
          </button>
        </div>
      )}
    </>
  )
}

{/*{renderedFeature.getPropertyIds?.().map((name) => {*/}
{/*  const value = renderedFeature.getProperty(name)?.toString()*/}

{/*  return (*/}
{/*    <div*/}
{/*      key={name}*/}
{/*      style={{*/}
{/*        marginBottom: '4px',*/}
{/*        wordBreak: 'break-word',*/}
{/*        whiteSpace: 'pre-wrap',*/}
{/*        pointerEvents: 'auto'*/}
{/*      }}*/}
{/*    >*/}
{/*      <strong>{name}:</strong> {value}{' '}*/}
{/*      <button*/}
{/*        style={{*/}
{/*          marginLeft: '6px',*/}
{/*          cursor: 'pointer',*/}
{/*          backgroundColor: 'transparent',*/}
{/*          border: '1px solid white',*/}
{/*          color: 'white',*/}
{/*          fontSize: '12px',*/}
{/*          padding: '2px 6px',*/}
{/*          borderRadius: '4px'*/}
{/*        }}*/}
{/*        onClick={(e) => {*/}
{/*          e.stopPropagation()*/}
{/*          console.log('[COPY]', value)*/}
{/*          navigator.clipboard.writeText(value)*/}
{/*          setCopiedKey(name)*/}
{/*          setTimeout(() => setCopiedKey(null), 1500)*/}
{/*        }}*/}
{/*        title="Скопировать"*/}
{/*      >*/}
{/*        {copiedKey === name ? 'Copied!' : 'Copy'}*/}
{/*      </button>*/}
{/*    </div>*/}
{/*  )*/}
{/*})}*/}

export default CesiumMap