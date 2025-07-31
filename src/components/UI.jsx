import { useState, useEffect } from 'react'
import {Modal, Button, Slider, Checkbox, Select, Input, Card, Divider, ConfigProvider} from 'antd'
import {DownOutlined, UpOutlined} from '@ant-design/icons';
import { useAuthenticator } from '@aws-amplify/ui-react';
import {getLevelConfig} from '@/components/utils';

import data from '../successful_routes_formated.json';
const firstSet = new Set();
const secondSet = new Set();

for (const item of data) {
  if (item.start_finish && Array.isArray(item.start_finish)) {
    firstSet.add(item.start_finish[0]);
    secondSet.add(item.start_finish[1]);
  }
}

const starts = Array.from(firstSet);
const finishes = Array.from(secondSet);


const UI = ({
              onToggleLevel,
              activeLevels,
              onSearch,
              onColorByType,
              setFilterProps,
              filterProps,
              onUpdateFilterRanges,
              selectedProperty,
              setSelectedProperty,
              onRouteChange,
              setShowCells,
              showCells,
              showedOsmBuildings,
              setShowOsmBuildings,
              setFilterCellId,
              setShowParentFilter,
              setShowChildrenFilter,
              filterCellId,
              showChildrenFilter,
              showParentFilter,
              routeInfo,
}) => {
  const [searchId, setSearchId] = useState('')
  const [searchParentId, setSearchParentId] = useState('')
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [sliderValues, setSliderValues] = useState({
    pc_build3d: [0, 0.01],
    pc_green3d: [0, 0.01],
    pc_roads_3d: [0, 0.01],
    pc_water3d: [0, 0.01],
    LST: [0, 0.01],
    NDVI: [0, 0.01],
    AQI: [0, 0.01],
    TJ: [0, 0.01],
  })
  const [selectedProp, setSelectedProp] = useState('pc_build3d')
  const [collapsed, setCollapsed] = useState(false)
  const [startCell, setStartCell] = useState(null);
  const [finishCell, setFinishCell] = useState(null);
  const [routeCellIds, setRouteCellIds] = useState([]);

  const { user, signOut } = useAuthenticator((context) => [context.user]);
  const handleSliderChange = (key, value) => {
    setSliderValues(prev => ({ ...prev, [key]: value }))
  }

  const levels = [1, 2, 3, 4, 5]

  const props_dict = {
    pc_build3d: {label: 'Buildings', value: 'pc_build3d'},
    pc_green3d: {label: 'Greenery', value: 'pc_green3d'},
    pc_roads_3d: {label: 'Roads', value: 'pc_roads_3d'},
    pc_water3d: {label: 'Water', value: 'pc_water3d'},
    LST: {label: 'Land surface temperature', value: 'LST'},
    NDVI: {label: 'Normalized Difference Vegetation Index', value: 'NDVI'},
    AQI: {label: 'Air Quality Index (AQI)', value: 'AQI'},
    TJ: {label: 'Traffic jam index', value: 'TJ'},
  }



  useEffect(() => {
    const level = activeLevels;

    const updated = {
      pc_build3d: [getLevelConfig(level, 'pc_build3d').min, getLevelConfig(level, 'pc_build3d').max],
      pc_green3d: [getLevelConfig(level, 'pc_green3d').min, getLevelConfig(level, 'pc_green3d').max],
      pc_roads_3d: [getLevelConfig(level, 'pc_roads_3d').min, getLevelConfig(level, 'pc_roads_3d').max],
      pc_water3d: [getLevelConfig(level, 'pc_water3d').min, getLevelConfig(level, 'pc_water3d').max],
      LST: [getLevelConfig(level, 'LST').min, getLevelConfig(level, 'LST').max],
      NDVI: [getLevelConfig(level, 'NDVI').min, getLevelConfig(level, 'NDVI').max],
      AQI: [getLevelConfig(level, 'AQI').min, getLevelConfig(level, 'AQI').max],
      TJ: [getLevelConfig(level, 'TJ').min, getLevelConfig(level, 'TJ').max],
    };
    console.log('setSliderValues updated useEffect', updated);
    setSliderValues(updated);
  }, [activeLevels]);

  useEffect(() => {
    console.log('onUpdateFilterRanges sliderValues useEffect', sliderValues);
    onUpdateFilterRanges(sliderValues);
  }, [sliderValues, onUpdateFilterRanges]);

  useEffect(() => {
    setStartCell(routeInfo.startCell)
  }, [routeInfo.startCell])


  const renderLegend = () => {
    const baseColor = {
      pc_build3d: '#67000D',
      pc_green3d: '#006837',
      pc_roads_3d: '#1A1A1A'
    }[selectedProperty] || '#000000'

    const commonColors = [
      '0.1', '0.2', '0.3', '0.4', '0.5', '0.6', '0.7', '0.8', '0.9', '1.0'
    ].map(opacity => {
      const alpha = parseFloat(opacity)
      return baseColor + Math.floor(alpha * 255).toString(16).padStart(2, '0')
    })

    const colors = [
      'rgba(0, 102, 255, 0.05)',
      'rgba(0, 149, 255, 0.2)',
      'rgba(71, 178, 255, 0.3)',
      'rgba(94, 202, 239, 0.4)',
      'rgba(240, 216, 30, 0.5)',
      'rgba(255, 188, 0, 0.6)',
      'rgba(255, 137, 3, 0.7)',
      'rgba(255, 84, 0, 0.8)',
      'rgba(255, 43, 0, 0.9)',
      'rgba(255, 0, 0, 1)'
    ];

    const { thresholds, labels } = getLevelConfig(activeLevels, selectedProperty);

    const getColorSchemeUnit = (level, prop) => {
      const tinyBoys = ['pc_build3d', 'pc_green3d', 'pc_roads_3d', 'pc_water3d'];
      const weirdBoys = ['LST', 'NDVI', 'AQI', 'TJ'];

      if (weirdBoys.includes(prop)) return '';

      if (level === 5 && tinyBoys.includes(prop)) return '10⁻⁶ %';

      if (level === 4 && prop === 'pc_water3d') return '10⁻² %';

      return '%';
    };

    return (
      <div style={{
        position: 'fixed',
        bottom: '10px',
        backgroundColor: 'white',
        width: '580px',
        borderRadius: '8px',
        padding: '8px 16px',
        left: 'calc(100vw / 2 - 290px)',
      }}>
        <div style={{ marginBottom: 8, fontWeight: 500 }}>
          {(props_dict[selectedProperty]?.label || selectedProperty) + ' '}
          to color scheme {' ' + getColorSchemeUnit(activeLevels, selectedProperty)}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-around' }}>
          {colors.map((color, index) => (
            <div key={index} style={{
              textAlign: 'center',
              maxWidth: '55px',
              minWidth: '50px',
              alignItems: 'center',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div
                style={{
                  width: 40,
                  height: 10,
                  background: color,
                  borderRadius: 4,
                  marginBottom: 2
                }}
              />
              <div style={{ fontSize: 10 }}>
                {labels[index - 1] === undefined ? 0 : labels[index]} – {labels[index + 1]}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const levelMin = activeLevels === 5 ? 0 : activeLevels === 4 ? 0 : 0;
  const levelMax = activeLevels === 5 ? 0.01 : activeLevels === 4 ? 1 : 10;

  const { min, max, step } = getLevelConfig(activeLevels, selectedProperty);
  // if(user){
  //   debugger
  // }

  const availableFinishes = startCell
    ? data
      .filter(item => item.start_finish?.[0] === startCell)
      .map(item => item.start_finish[1])
      .filter((v, i, arr) => arr.indexOf(v) === i) // уникальные
    : finishes;

  return (
    <ConfigProvider
      theme={{
        components: {
          Card: {
            bodyPadding:'12px'
          },
        },
      }}
    >
      <Card
        title="Display properties"
        style={{
          position: 'absolute',
          top: 20,
          left: 20,
          zIndex: 999,
          minWidth: 300,
          borderRadius: 8,
          maxWidth: 300,
        }}
      >
        <div
          className={'scrollable-content'}
          style={{
          maxHeight: '63vh',
          overflow: 'scroll',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: 12 }}>Signed in as <strong>{user?.signInDetails?.loginId}</strong></div>
            <Button type="link" size="small" onClick={signOut}>Sign out</Button>
          </div>
          <div
            style={{
              maxHeight: collapsed ? 0 : 1000,
              overflow: 'hidden',
              transition: 'max-height 0.3s ease-in-out',
            }}
          >
            <div style={{ marginBottom: 10 }}>
              <Button
                type="primary"
                onClick={() => {
                  setShowParentFilter(false)
                  setShowChildrenFilter(false)
                  setFilterCellId(null)
                }}
                disabled={!filterCellId}
              >
                { showParentFilter === false && showChildrenFilter === false ? 'Parent or Children not selected' :
                  showParentFilter ? 'Cancel Parent Select' : 'Cancel Children Select'
                }
              </Button>
            </div>
            <div style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <Button
                  type="primary"
                  onClick={() => setShowOsmBuildings(prev => !prev)}
                >
                  {showedOsmBuildings ? 'Hide Buildings' : 'Show Buildings'}
                </Button>

                <Button
                  type="primary"
                  onClick={() => setShowCells(prev => !prev)}
                >
                  {showCells ? 'Hide Tileset' : 'Show Tileset'}
                </Button>
              </div>
              <strong style={{ alignSelf: 'end'}}>Cell size level</strong>
              <Select
                value={activeLevels}
                onChange={(value) => onToggleLevel(value)}
                style={{ width: '100%', marginTop: 5 }}
              >
                {levels.map((level) => (
                  <Option key={level} value={level}>
                    Level {level}
                  </Option>
                ))}
              </Select>
            </div>

            <div style={{ marginTop: 10 }}>
              <strong>Property to color scheme</strong>
              <Select
                style={{ width: '100%' }}
                value={selectedProperty}
                onChange={setSelectedProperty}
                options={[
                  { label: 'Buildings', value: 'pc_build3d' },
                  { label: 'Greenery', value: 'pc_green3d' },
                  { label: 'Roads', value: 'pc_roads_3d' },
                  { label: 'Water', value: 'pc_water3d' },
                  { label: 'Land surface temperature', value: 'LST' },
                  { label: 'Normalized Difference Vegetation Index', value: 'NDVI' },
                  { label: 'Air Quality Index (AQI) Basics', value: 'AQI' },
                  { label: 'Traffic jam index', value: 'TJ' },
                ]}
              />
            </div>

            <Divider style={{margin: '10px 0'}}/>

            <div style={{ marginBottom: 10, marginTop: 10, marginLeft: 2, marginRight: 2 }}>
              <strong style={{ marginBottom: 10, display: 'block'}} >Range for properties</strong>
              {Object.keys(sliderValues).map((key) => {
                const { min, max, step } = getLevelConfig(activeLevels, key);

                return (
                  <div key={key}>
                    <div>
                      {props_dict[key].label}: {sliderValues[key][0]} - {sliderValues[key][1]}
                    </div>
                    <Slider
                      range={{ draggableTrack: true }}
                      value={sliderValues[key]}
                      onChange={(value) => handleSliderChange(key, value)}
                      min={min}
                      max={max}
                      step={step}
                    />
                  </div>
                );
              })}
            </div>

            <Divider style={{margin: '10px 0'}}/>

            <div style={{ marginTop: 10 }}>
              <strong>Search by Cell ID</strong>
              <Input.Search
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                onSearch={() => onSearch(searchId)}
                // onKeyDown={(e) => handleKeyDown(e, false)}
                placeholder="Enter ID..."
                enterButton
                style={{ marginTop: 5 }}
              />
            </div>

            {/*<div style={{ marginTop: 10, marginBottom: 20 }}>*/}
            {/*  <strong>Search by Parent Cell ID</strong>*/}
            {/*  <Input.Search*/}
            {/*    value={searchParentId}*/}
            {/*    onChange={(e) => setSearchParentId(e.target.value)}*/}
            {/*    onSearch={() => onSearch(searchParentId, true)}*/}
            {/*    // onKeyDown={(e) => handleKeyDown(e, true)}*/}
            {/*    placeholder="Enter Parent ID..."*/}
            {/*    enterButton*/}
            {/*    style={{ marginTop: 5 }}*/}
            {/*  />*/}
            {/*</div>*/}

          </div>
        </div>
        <div style={{ textAlign: 'center', marginTop: 0 }}>
          <Button
            type="text"
            icon={collapsed ? <DownOutlined /> : <UpOutlined />}
            onClick={() => setCollapsed(!collapsed)}
          />
        </div>
        {renderLegend()}
      </Card>

      <ConfigProvider>
        {/* … существующий Card здесь … */}
      </ConfigProvider>
      {activeLevels === 2 && (
        <div
          style={{
            position: 'absolute',
            top: 45,
            right: 20,
            zIndex: 999,
            minWidth: 250,
            maxWidth: 300,
            background: 'white',
            borderRadius: 8,
            padding: 12,
            boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
          }}
        >
          <strong>Route Navigation</strong>
          <Button
            type="primary"
            style={{ width: '100%', marginBottom: 5 }}
            onClick={() => {
              window.showStartsCells = true;
              onRouteChange(
                prev => ({ ...prev, showStartsCells: true }),
              )
            }}
          >
            Show Starts Cells
          </Button>
          <div style={{ marginTop: 10 }}>
            <Select
              showSearch
              placeholder="Start Cell"
              style={{ width: '100%', marginBottom: 10 }}
              value={routeInfo.startCell ? routeInfo.startCell : startCell}
              onChange={(val) => {
                setStartCell(val);
                setFinishCell(null); // сбрасываем finish при смене start
                onRouteChange({
                  startCell: val,
                  finishCell: null,
                  routeCellIds: [],
                  showStartsCells: true
                });
              }}
              options={starts.map(s => ({ label: s, value: s }))}
              optionFilterProp="label"
              filterOption={(input, option) =>
                option.label.toLowerCase().includes(input.toLowerCase())
              }
            />

            <Select
              placeholder="Finish Cell"
              style={{ width: '100%', marginBottom: 10 }}
              value={finishCell}
              onChange={(val) => {
                setFinishCell(val);
                onRouteChange({
                  startCell,
                  finishCell: val,
                  routeCellIds: [],
                  showStartsCells: true
                });
              }}
              options={availableFinishes.map(f => ({ label: f, value: f }))}
            />

            <Button
              type="primary"
              style={{ width: '100%', marginBottom: 5 }}
              onClick={() => {
                const found = data.find(
                  (item) =>
                    item.start_finish &&
                    item.start_finish[0] === startCell &&
                    item.start_finish[1] === finishCell
                );

                if (found && found.cell_id) {
                  setRouteCellIds(found.cell_id);
                  console.log('Found cell_id:', found.cell_id);
                  onRouteChange({
                    startCell,
                    finishCell,
                    routeCellIds: found.cell_id,
                    showStartsCells: true
                  });
                } else {
                  setRouteCellIds([]);
                  console.log('No matching route found.');
                  onRouteChange({
                    startCell,
                    finishCell,
                    routeCellIds: [],
                    showStartsCells: true
                  });
                }
              }}
              disabled={!startCell || !finishCell}
            >
              Create Route
            </Button>
            <Button
              type="default"
              danger
              style={{ width: '100%' }}
              onClick={() => {
                setStartCell(null);
                setFinishCell(null);
                setRouteCellIds([]);
                console.log('Route cleared');
                onRouteChange({
                  startCell: null,
                  finishCell: null,
                  routeCellIds: [],
                  showStartsCells: false,
                });
              }}
            >
              Clear Route
            </Button>
            <Button
              type="default"
              danger
              style={{ width: '100%', marginTop: 5 }}
              onClick={() => {
                window.showStartsCells = false
                onRouteChange(
                  {
                    startCell: null,
                    finishCell: null,
                    routeCellIds: [],
                    showStartsCells: false,
                  }
                )
              }}
            >
              Hide Starts Cells
            </Button>
          </div>
        </div>
      )}
    </ConfigProvider>
  )
}

export default UI