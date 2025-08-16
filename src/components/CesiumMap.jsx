import {
  Viewer,
  Cartesian3,
  Cartographic,
  Cesium3DTileset,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  Color,
  OpenStreetMapImageryProvider,
  Ion,
  createOsmBuildingsAsync
} from 'cesium'
import { useState, useEffect, useRef } from 'react'
import UI from './UI'
import {Divider} from 'antd';
import {flyToFeature, getLevelConfig} from '@/components/utils';
import coords from '../successful_routes_start_fin_coords.json';
import data from '../successful_routes_formated.json';
const starts = data.map(item => item.start_finish[0])
const finishes = data.map(item => item.start_finish[1])
const coordsMap = {};
coords.forEach(item => {
  coordsMap[item.Cell_id] = { lat: item.lat, lon: item.lon };
});

const start_cell_filter = '${route_cell_id} >= 1 && ${route_cell_id} <= 328'
const all_cell_filter = '${route_cell_id} >= 1 && ${route_cell_id} <= 200000'
Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI3YmUwZmQyZi0xMTZmLTQ0YzgtYmY5NS0wNmU1OTM1Y2M5M2YiLCJpZCI6MzI1MDEwLCJpYXQiOjE3NTM0MjI1MzV9.-uImTS0_4uarVz2IKXv7yNRDxYxTmkh4DudgfYJ21xE';


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
  const [filterProps, setFilterProps] = useState([
    'pc_build3d',
    'pc_green3d',
    'pc_roads_3d',
    'pc_water3d',
    'LST',
    'NDVI',
    'AQI',
    'TJ',
  ])
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
  const [calculating, setCalculating] = useState(false)
  const [routeInfo, setRouteInfo] = useState({
    startCell: null,
    finishCell: null,
    routeCellIds: [],
    showStartsCells: false,
    start_route_cell_id: null,
    finish_route_cell_id: null,
  });
  const [filterCellId, setFilterCellId] = useState(null)
  const [showParentFilter, setShowParentFilter] = useState(false)
  const [showChildrenFilter, setShowChildrenFilter] = useState(false)
  const [showCells, setShowCells] = useState(true)
  const [showedOsmBuildings, setShowOsmBuildings] = useState(true);
  const osmBuildingsRef = useRef(null);
  const timeout = {
    5: 1000,
    4: 1500,
    3: 5000,
    2: 6000,
    1: 7000
  }

  // const getBaseColor = () => {
  //   switch (selectedProperty) {
  //     case 'pc_build3d': return '#67000D';
  //     case 'pc_green3d': return '#006837';
  //     case 'pc_roads_3d': return '#1A1A1A';
  //     default: return '#000000';
  //   }
  // };

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
  useEffect(() => {
    if(showedOsmBuildings){
      createOsmBuildingsAsync().then(buildings => {
        osmBuildingsRef.current = buildings;
        viewerRef.current.scene.primitives.add(buildings);
      });
    } else {
      viewerRef.current?.scene.primitives._primitives
        .filter(p => p._url?.includes('OpenStreetMap'))
        .forEach(p => viewerRef.current.scene.primitives.remove(p));
    }
  }, [showedOsmBuildings])

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

  const applyStyleToTileset = (
    tileset,
  ) => {
    if (!tileset) return;

    const style = {};
    console.log(':::::BEFORE FILTERS:::::');
    console.log('activeProps:', filterProps);
    console.log('filterRanges:', filterRanges.pc_build3d);
    tileset.show = showCells
    console.log('osmBuildingsRef.current:: - ', osmBuildingsRef.current)
    console.log('showedOsmBuildings:: - ', showedOsmBuildings)

    // if (!osmBuildingsRef.current) {
    //   createOsmBuildingsAsync().then(osm => {
    //     osmBuildingsRef.current = osm;
    //     viewer.scene.primitives.add(osm);
    //     osm.show = true;
    //     setShowOsmBuildings(true);
    //   });
    // } else {
    //   const osm = osmBuildingsRef.current;
    //   osm.show = !osm.show;
    //   setShowOsmBuildings(osm.show);
    // }
    // === 1. ФИЛЬТРАЦИЯ ===
    console.log('routeInfo?.routeCellIds?.length: - ', routeInfo?.routeCellIds?.length)
    console.log('window.showStartsCells: - ', window.showStartsCells)
    console.log('routeInfo?.showStartsCells: - ', routeInfo.showStartsCells);
    if (routeInfo?.routeCellIds?.length > 0 || window.showStartsCells) {
      console.log('// === ROUTE OR START CELLS FILTER ===');
      console.log('tileset.style: - ', tileset.style);

      if(routeInfo?.routeCellIds?.length > 0) {
        const idsSet = new Set([
          ...(routeInfo.routeCellIds || [])
        ]);

        const cellConditions = Array.from(idsSet)
          .map(id => `\${route_cell_id} === ${id}`)
          .join(' || ');

        style.show = {
          conditions: [
            [cellConditions, 'true'],
            ['true', 'false']
          ]
        };
        console.log('cellConditions: - ', cellConditions)
      } else {
        if(routeInfo?.routeCellIds?.length > 0 || routeInfo?.startCell) {
          console.log('// === ROUTE OR START CELLS ===');
          console.log('routeInfo?.routeCellIds: - ',routeInfo?.routeCellIds);
          console.log('routeInfo?.startCell: - ',routeInfo?.startCell);
          setCalculating(false)
          // return;
        } else {
          console.log('we are at else routeInfo?.routeCellIds?.length > 0 || routeInfo?.startCell')
          style.show = {
            conditions: [
              [start_cell_filter, 'true'],
              ['true', 'false']
            ]
          };
        }
      }
      // const idsSet = new Set([
      //   ...(routeInfo.routeCellIds || []),
      //   ...(window.showStartsCells ? starts.map(s => s) : [])
      // ]);

      // const cellConditions = Array.from(idsSet)
      //   .map(id => `\${cell_id} === '${id}'`)
      //   .join(' || ');

      // style.show = {
      //   conditions: [
      //     [start_cell_filter, 'true'],
      //     ['true', 'false']
      //   ]
      // };
      // console.log('start_cell_filter:', start_cell_filter);
      // console.log(`[✓] Applied route/startCell filter: ${cellConditions}`);
    } else if ((filterCellId && (showParentFilter || showChildrenFilter)) || filterProps) {
        console.log('// === COMBINED PARENT/CHILD + PROPS FILTER ===');

        const combinedConditions = [];

        // === 1. Parent/Child Condition
        if (filterCellId && (showParentFilter || showChildrenFilter)) {
          const comparisonKey = showParentFilter ? 'cell_id' : 'parent_id';
          const hierarchyCondition = `\${${comparisonKey}} === '${filterCellId}'`;
          combinedConditions.push(hierarchyCondition);
          console.log(`[✓] Applied ${showParentFilter ? 'parent' : 'children'} filter on ${filterCellId}`);
        }

        // === 2. Property Ranges Condition
        if (filterProps?.length > 0) {
          const rangeConditions = filterProps.map(key => {
            const [min, max] = filterRanges?.[key] || [0, 100];
            return `\${${key}} >= ${min} && \${${key}} <= ${max}`;
          });
          const combinedRangeCondition = rangeConditions.join(' && ');
          combinedConditions.push(combinedRangeCondition);
          console.log(`[✓] Applied props filter: ${combinedRangeCondition}`);
        }

        // === 3. Сборка финального условия
        const fullCondition = combinedConditions.join(' && ');
        const showConditions = [];

        if (selectedProperty) {
          showConditions.push([`\${${selectedProperty}} === 0`, 'false']);
        }

        showConditions.push([fullCondition, 'true']);
        showConditions.push(['true', 'false']); // fallback

        style.show = { conditions: showConditions };
        console.log('selectedLevel: ', selectedLevel);
        console.log(`[✓] Final combined condition: ${fullCondition}`);
      }

    // === 2. РАСКРАСКА ===
    if (selectedProperty) {
      console.log('// === COLORING ===');

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
      // console.log('level from props:: - ', level);
      const levelConfig = getLevelConfig(selectedLevel, selectedProperty);
      if (!levelConfig) {
        console.warn(`⚠️ no levelConfig for level=${selectedLevel} & prop=${selectedProperty}`);
        return;
      }

      const { thresholds } = levelConfig;

      if (!thresholds || thresholds.length < 2) {
        console.warn(`⚠️ invalid thresholds:`, thresholds);
        return;
      }

      if (thresholds.length - 1 > colors.length) {
        console.warn(`⚠️ not enough colors for thresholds. thresholds=${thresholds.length - 1} colors=${colors.length}`);
        return;
      }

      const colorConditions = [];
      for (let i = 0; i < thresholds.length - 1; i++) {
        const min = thresholds[i];
        const max = thresholds[i + 1];
        colorConditions.push([
          `\${${selectedProperty}} >= ${min} && \${${selectedProperty}} < ${max}`,
          colors[i]
        ]);
      }

      colorConditions.push(['true', 'color("rgba(0,0,0,0)")']); // fallback
      if(routeInfo.showStartsCells) {
        style.color = {
          conditions: [
            // старт — зелёный
            routeInfo?.startCell && [
              `\${cell_id} === '${routeInfo.startCell}'`,
              'color("rgba(0, 255, 0, 1)")'
            ],

            // Финиш — красный
            routeInfo?.finishCell && [
              `\${cell_id} === '${routeInfo.finishCell}'`,
              'color("rgba(255, 0, 0, 1)")'
            ],

            // базовый синий
            //FIXME если routeInfo.routeCellIds.length > 0 то start_cell_filter заменить на самый большой айди, вместо 328
            [routeInfo.routeCellIds.length > 0 ? all_cell_filter : start_cell_filter, 'color("rgba(0, 0, 255, 1)")'],
            ['true', 'color("rgba(0,0,0,0)")'] // остальное прозрачное
          ].filter(Boolean)
        };
      } else {
        style.color = { conditions: colorConditions };

        console.log(`[✓] Applied color scheme for ${selectedProperty}`);
      }
    }
    console.log('style.show: ', style.show);
    console.log('style.color: - ', style.color)
    tileset.style = new Cesium.Cesium3DTileStyle(style);
    setCalculating(false)
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

  const loadTileset = async (level,current_cell_id) => {

    try {
      const viewer = viewerRef.current
      if (!viewer) throw new Error('Viewer is not initialized yet')
      setLoading(true)
      viewer.scene.primitives._primitives
        .filter(p => p._url?.includes('https://s3-3d-tiles'))
        .forEach(p => viewerRef.current.scene.primitives.remove(p));

      const getTilesetUrl = (level) => {
        // если мы на уровне 2 и включён режим стартовых клеток — грузим спец-тайлсет
        if (level === 2 && routeInfo?.showStartsCells) {
          return 'https://s3-3d-tiles.s3.eu-north-1.amazonaws.com/tiles_for_routing/tileset_flat.json';
        }
        // иначе — обычный по уровню
        return `https://s3-3d-tiles.s3.eu-north-1.amazonaws.com/lvl${level}/tileset.json`;
      };
      const url = getTilesetUrl(level);
      const tileset = await Cesium3DTileset.fromUrl(url)
        // `https://s3-3d-tiles.s3.eu-north-1.amazonaws.com/lvl2_routing/tileset.json`
        // `https://s3-3d-tiles.s3.eu-north-1.amazonaws.com/lvl${level}/tileset.json`
        // `https://s3-3d-tiles.s3.eu-north-1.amazonaws.com/lvl${level}m/tileset/tileset.json`
        //   `https://s3-3d-tiles.s3.eu-north-1.amazonaws.com/lvl3_test_merged-tiles/tileset.json`
        //   `https://s3-3d-tiles.s3.eu-north-1.amazonaws.com/marked/lvl${level}/tileset.json`
      // )
      // const tileset = await Cesium3DTileset.fromUrl(
      //   `https://s3-3d-tiles.s3.eu-north-1.amazonaws.com/lvl5tetsfme/lvl4_test/tileset/tileset.json`
      // )
      if(level === 2 && routeInfo?.showStartsCells){
        tileset.maximumScreenSpaceError = 1
      } else {
        tileset.maximumScreenSpaceError = 8
      }
       // Увеличьте для снижения детализации и повышения производительности
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
      if(!current_cell_id){
        console.log('::New ChildrenParentFlow:: - loadTileset, I have filterCellId: - ', current_cell_id)
        await viewer.zoomTo(tileset)
      }

      const height = viewer.scene.camera.positionCartographic.height;
      console.log('📏 Высота камеры:', height);
      console.log('::loadTileset:: level - ', level)
      //FIXME в applyStyleToTileset Передавай LEvel
      console.log('::loadTileset:: selectedLevel - ', selectedLevel)
      applyStyleToTileset(tileset, Object.keys(filterProps).filter(k => filterProps[k]), filterRanges, selectedProperty, routeInfo, level);
      // applyFilterToTileset(tileset, Object.keys(filterProps).filter(k => filterProps[k]))
      // colorBySelectedProperty(tileset)
      setLoading(false)

      console.log(`%c[✓] Tileset lvl${level} loaded & zoomed`, 'color: green')
    } catch (error) {
      console.error(`%c[✗] Error loading tileset lvl${level}m:`, 'color: red', error)
    }
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
              // flyToFeature(viewer, feature)
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
      creditContainer: document.createElement('div'),
    })

    viewerRef.current = viewer
    // if (!osmBuildingsRef.current) {
    //   createOsmBuildingsAsync().then(buildings => {
    //     osmBuildingsRef.current = buildings;
    //     viewer.scene.primitives.add(buildings);
    //   });
    // }
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

      // === HANDLE START CELL SELECT WHEN ACTIVE ===
      if (window.showStartsCells) {
        const id = pickedFeature.getProperty('cell_id');
        const route_cell_id = pickedFeature.getProperty('route_cell_id');
        console.log(`[📍] Picked cell: ${id}`);

        pickedFeature.getPropertyIds?.().forEach((name) => {
          console.log(`${name} – ${pickedFeature.getProperty(name)}`);
        });

        setRouteInfo(prev => {
          if (!prev.startCell) {
            // Первый клик — выбираем старт
            return {
              ...prev,
              startCell: id,
              start_route_cell_id: route_cell_id,
              showStartsCells: true // остаёмся в режиме, ждём финиш
            };
          } else {
            // Второй клик — выбираем финиш
            return {
              ...prev,
              finishCell: id,
              finish_route_cell_id: route_cell_id,
              showStartsCells: true // можно выйти из режима, если всё выбрали
            };
          }
        });

        return; // прерываем остальную логику клика
      }

      console.log('%c[✓] Picked Feature:', 'color: cyan', pickedFeature)
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
    const viewer = viewerRef.current;
    if (!viewer) return;

    // Перегружаем тайлсет, если переключили режим стартовых клеток на уровне 2
    if (selectedLevel === 2) {
      loadTileset(selectedLevel);
    }
  }, [routeInfo.showStartsCells, selectedLevel]);

  useEffect(() => {
    const viewer = viewerRef.current
    console.log('!!!!!!!!!!!!!!!viewer', viewer)
    if (!viewer) return

    const condition = viewer.scene.primitives._primitives.filter(p => p._url?.includes('https://s3-3d-tiles')).length
    setCalculating(true)
    if(selectedLevel === 2 && routeInfo.showStartsCells){
      setTimeout(
        () => {
        const tileset = viewer.scene.primitives._primitives.find(p => p._url?.includes('https://s3-3d-tiles'))
        if(!tileset){return}
        console.log('!!!!!!!!!!!!!!!tileset', tileset)
        console.log('!!!!!!!!!!!!!!!applyStyleToTileset at useEffect')
        applyStyleToTileset(tileset)},
        1500)

    } else {
      setTimeout(
        () => {
          const tileset = viewer.scene.primitives._primitives.find(p => p._url?.includes('https://s3-3d-tiles'))
          if(!tileset){return}
          console.log('!!!!!!!!!!!!!!!tileset', tileset)
          console.log('!!!!!!!!!!!!!!!applyStyleToTileset at useEffect')
          applyStyleToTileset(tileset)},
        timeout[selectedLevel])
    }



    // applyFilterToTileset(tileset, );
  }, [filterProps, filterRanges, selectedProperty, routeInfo, selectedLevel, showCells, filterCellId]);

  // useEffect(() => {
  //   const viewer = viewerRef.current;
  //   if (!viewer) return;
  //
  //   const tileset = viewer.scene.primitives._primitives.find(p => p instanceof Cesium3DTileset);
  //   if (tileset) {
  //     colorBySelectedProperty(tileset);
  //   }
  // }, [selectedProperty]);
  const formatDecimelsBGRW = (value) => {
    const num = parseFloat(value);
    if (isNaN(num)) return value; // вдруг там null или чушь
    const decimals = (selectedLevel === 4 || selectedLevel === 5) ? 6 : 2;
    return num.toFixed(decimals);
  };

  const formatDecimelsLNAT = (value) => {
    const num = parseFloat(value);
    if (isNaN(num)) return value; // вдруг там null или чушь
    const decimals = 2;
    return num.toFixed(decimals);
  };

  return (
    <>
      {calculating && (
        <div
          style={{
            position: 'absolute',
            inset: 0, // shorthand: top:0, right:0, bottom:0, left:0
            background: 'rgba(0,0,0,0.7)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            opacity: 1,
            transition: 'opacity 0.5s ease', // плавный переход для затемнения
          }}
        >
          <div
            style={{
              fontSize: '1.5rem',
              background: 'rgba(255,255,255,0.1)',
              padding: '20px 40px',
              borderRadius: '12px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
              backdropFilter: 'blur(4px)', // легкий блюр заднего фона
            }}
          >
            Thank You for waiting. Calculating...
          </div>
        </div>
      )}
      {/*{loading && (*/}
      {/*  <div style={{*/}
      {/*    position: 'absolute',*/}
      {/*    top: '50%',*/}
      {/*    left: '50%',*/}
      {/*    transform: 'translate(-50%, -50%)',*/}
      {/*    background: 'rgba(0,0,0,0.7)',*/}
      {/*    color: 'white',*/}
      {/*    padding: '20px 40px',*/}
      {/*    borderRadius: '8px',*/}
      {/*    zIndex: 2000*/}
      {/*  }}>*/}
      {/*    Загрузка тайлсета...*/}
      {/*  </div>*/}
      {/*)}*/}
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
          console.log('toggleLevel', level);
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
          setSelectedLevel(level)
          loadTileset(level)
        }}
        filterProps={filterProps}
        activeLevels={selectedLevel}
        onSearch={handleSearch}
        onColorByType={colorByType}
        setFilterProps={setFilterProps}
        onUpdateFilterRanges={setFilterRanges}
        selectedProperty={selectedProperty}
        setSelectedProperty={setSelectedProperty}
        onRouteChange={setRouteInfo}
        routeInfo={routeInfo}
        setShowCells={setShowCells}
        showCells={showCells}
        showedOsmBuildings={showedOsmBuildings}
        setShowOsmBuildings={setShowOsmBuildings}
        setFilterCellId={setFilterCellId}
        setShowParentFilter={setShowParentFilter}
        setShowChildrenFilter={setShowChildrenFilter}
        filterCellId={filterCellId}
        showChildrenFilter={showChildrenFilter}
        showParentFilter={showParentFilter}
        loadTileset={loadTileset}
        setCalculating={setCalculating}
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
                  <strong>Buildings:</strong> {formatDecimelsBGRW(renderedFeature.getProperty('pc_build3d')) + ' ' + '%'}
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
                  <strong>Greenary:</strong>{formatDecimelsBGRW(renderedFeature.getProperty('pc_green3d')) + ' ' + '%'}
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
                  <strong>Roads:</strong>{formatDecimelsBGRW(renderedFeature.getProperty('pc_roads_3d')) + ' ' + '%'}
                </div>
              </div>

              {/*FIXME Water*/}
              <div style={{marginTop: '8px'}}>
                <div
                  key={renderedFeature.getProperty('pc_water3d')?.toString()}
                  style={{
                    marginBottom: '4px',
                    wordBreak: 'break-word',
                    whiteSpace: 'pre-wrap',
                    pointerEvents: 'auto'
                  }}
                >
                  <strong>Water:</strong>{formatDecimelsBGRW(renderedFeature.getProperty('pc_water3d')) + ' ' + '%'}
                </div>
              </div>


            </>
          )}
          <Divider
            style={{
              backgroundColor: 'white',
            }}
          />
          <strong> Cell characteristics:</strong>
          {typeof renderedFeature.getProperty === 'function' && (
            <>
              {/*FIXME Land surface temperature*/}
              <div style={{marginTop: '8px'}}>
                <div
                  key={renderedFeature.getProperty('LST')?.toString()}
                  style={{
                    marginBottom: '4px',
                    wordBreak: 'break-word',
                    whiteSpace: 'pre-wrap',
                    pointerEvents: 'auto'
                  }}
                >
                  <strong>Land surface temperature:</strong>{formatDecimelsLNAT(renderedFeature.getProperty('LST')) + ' ' + '°C'}
                </div>
              </div>

              {/*FIXME Normalized Difference Vegetation Index*/}
              <div style={{marginTop: '8px'}}>
                <div
                  key={renderedFeature.getProperty('NDVI')?.toString()}
                  style={{
                    marginBottom: '4px',
                    wordBreak: 'break-word',
                    whiteSpace: 'pre-wrap',
                    pointerEvents: 'auto'
                  }}
                >
                  <strong>Normalized Difference Vegetation Index:</strong>{formatDecimelsLNAT(renderedFeature.getProperty('NDVI')) + ' '}
                </div>
              </div>

              {/*FIXME Air Quality Index (AQI)*/}
              <div style={{marginTop: '8px'}}>
                <div
                  key={renderedFeature.getProperty('AQI')?.toString()}
                  style={{
                    marginBottom: '4px',
                    wordBreak: 'break-word',
                    whiteSpace: 'pre-wrap',
                    pointerEvents: 'auto'
                  }}
                >
                  <strong>Air Quality Index (AQI):</strong>{formatDecimelsLNAT(renderedFeature.getProperty('AQI')) + ' '}
                </div>
              </div>

              {/*FIXME Traffic jam index*/}
              <div style={{marginTop: '8px'}}>
                <div
                  key={renderedFeature.getProperty('TJ')?.toString()}
                  style={{
                    marginBottom: '4px',
                    wordBreak: 'break-word',
                    whiteSpace: 'pre-wrap',
                    pointerEvents: 'auto'
                  }}
                >
                  <strong>Traffic jam index:</strong>{formatDecimelsLNAT(renderedFeature.getProperty('TJ')) + ' '}
                </div>
              </div>
            </>
          )}
          <Divider
            style={{
              backgroundColor: 'white',
            }}
          />
          {selectedLevel === 5 ?
            ''
            :
            <button
              onClick={() => {
                const viewer = viewerRef.current
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
                flyToFeature(viewer, renderedFeature, selectedLevel, newLevel)
                setSelectedLevel(newLevel)
                setFilterCellId(parentId)
                setShowParentFilter(true)
                setShowChildrenFilter(false)
                loadTileset(newLevel, parentId)
              }}
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
          }
          {/*<button*/}
          {/*  onClick={async () => {*/}
          {/*    setFilterCellId(null)*/}
          {/*    setShowParentFilter(false)*/}
          {/*    setShowChildrenFilter(false)*/}

          {/*    if (selectedCellId && selectedCellLevel) {*/}
          {/*      // Сброс текущей фичи*/}
          {/*      if (selectedFeatureRef.current && selectedFeatureRef.current.color) {*/}
          {/*        try {*/}
          {/*          selectedFeatureRef.current.color = Color.WHITE*/}
          {/*        } catch (e) {*/}
          {/*          console.warn('Не удалось сбросить цвет предыдущей фичи:', e)*/}
          {/*        }*/}
          {/*        selectedFeatureRef.current = null*/}
          {/*        setRenderedFeature(null)*/}
          {/*      }*/}

          {/*      const newLevel = parseInt(selectedCellLevel)*/}
          {/*      setSelectedLevel(newLevel)*/}
          {/*      console.log('newLevel: ', newLevel)*/}
          {/*      await loadTileset(newLevel)*/}
          {/*      // setTimeout(() => {*/}
          {/*      //   handleSearch(selectedCellId)*/}
          {/*      // }, 500)*/}
          {/*    }*/}
          {/*  }}*/}
          {/*  disabled={renderedFeature?.getProperty('cell_id') === selectedCellId}*/}
          {/*  style={{*/}
          {/*    marginTop: '8px',*/}
          {/*    backgroundColor: renderedFeature?.getProperty('cell_id') === selectedCellId ? '#999' : '#00aa88',*/}
          {/*    border: 'none',*/}
          {/*    color: 'white',*/}
          {/*    padding: '6px 12px',*/}
          {/*    borderRadius: '4px',*/}
          {/*    cursor: renderedFeature?.getProperty('cell_id') === selectedCellId ? 'default' : 'pointer',*/}
          {/*    pointerEvents: 'auto',*/}
          {/*    opacity: renderedFeature?.getProperty('cell_id') === selectedCellId ? 0.6 : 1*/}
          {/*  }}*/}
          {/*>*/}
          {/*  Back to first one item*/}
          {/*</button>*/}
          {selectedLevel === 1 || selectedLevel === 2 ?
            ''
            :
            <button
              onClick={() => {
                const viewer = viewerRef.current
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

                console.log('::New ChildrenParentFlow:: - Click  Show children items, filterCellId: - ', current_cell_id)
                flyToFeature(viewer, renderedFeature, selectedLevel, newLevel)
                setSelectedLevel(newLevel)
                setFilterCellId(current_cell_id)
                setShowParentFilter(false)
                setShowChildrenFilter(true)
                loadTileset(newLevel, current_cell_id)
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
          }
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