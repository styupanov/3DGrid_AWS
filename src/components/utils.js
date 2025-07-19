export const getLevelConfig = (level) => {
  switch (level) {
    case 5:
      return {
        min: 0,
        max: 0.0185,
        step: 0.0001,
        thresholds: ['0', '0.0001', '0.0002', '0.0004', '0.0005', '0.0007', '0.0011', '0.0013', '0.0015', '0.0019', '0.0022'],
        labels: ['0.1', '0.2', '0.4', '0.5', '0.7', '0.11', '0.13', '0.15', '0.19', '0.22']
      }
    case 4:
      return {
        min: 0,
        max: 1,
        step: 0.1,
        thresholds: ['0', '0.1', '0.2', '0.3', '0.4', '0.5', '0.6', '0.7', '0.8', '0.9', '1'],
        labels: ['0.1', '0.2', '0.3', '0.4', '0.5', '0.6', '0.7', '0.8', '0.9', '1']
      }
    case 2:
    case 3:
    default:
      return {
        min: 0,
        max: 100,
        step: 1,
        thresholds: ['0', '10', '20', '30', '40', '50', '60', '70', '80', '90'],
        labels: ['10', '20', '30', '40', '50', '60', '70', '80', '90', '100+']
      }
  }
}


// tileset.maximumScreenSpaceError = 8 // Увеличьте для снижения детализации и повышения производительности
// tileset.maximumMemoryUsage = 512 // Максимальное использование памяти в МБ
// tileset.cullWithChildrenBounds = true // Использовать объединенные границы дочерних тайлов для отсечения
// tileset.dynamicScreenSpaceError = true // Включить динамическую ошибку экранного пространства
// tileset.dynamicScreenSpaceErrorDensity = 0.00278 // Плотность для динамической ошибки
// tileset.dynamicScreenSpaceErrorFactor = 4.0 // Фактор для динамической ошибки
// tileset.dynamicScreenSpaceErrorHeightFalloff = 0.25 // Падение высоты для динамической ошибки
// tileset.skipLevelOfDetail = true // Пропуск уровней детализации
// tileset.baseScreenSpaceError = 1024 // Базовая ошибка экранного пространства
// tileset.skipScreenSpaceErrorFactor = 16 // Фактор ошибки для пропуска уровней
// tileset.skipLevels = 1 // Количество уровней для пропуска
// tileset.immediatelyLoadDesiredLevelOfDetail = false // Немедленная загрузка желаемого уровня детализации
// tileset.loadSiblings = false // Загрузка соседних тайлов
// tileset.foveatedScreenSpaceError = true // Приоритизация загрузки тайлов в центре экрана
// tileset.foveatedConeSize = 0.1 // Размер конуса для фовеации
// tileset.foveatedMinimumScreenSpaceErrorRelaxation = 0.0 // Минимальное ослабление ошибки экранного пространства для фовеации
// tileset.foveatedTimeDelay = 0.2 // Задержка времени для фовеации