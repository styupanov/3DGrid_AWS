import { useState, useEffect } from 'react'
import {Modal, Button, Slider, Checkbox, Select, Input, Card, Divider} from 'antd'
import {DownOutlined, UpOutlined} from '@ant-design/icons';

const UI = ({ onToggleLevel, activeLevels, onSearch, onColorByType, setFilterProps, filterProps, onUpdateFilterRanges, selectedProperty, setSelectedProperty  }) => {
  const [searchId, setSearchId] = useState('')
  const [searchParentId, setSearchParentId] = useState('')
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [sliderValues, setSliderValues] = useState({
    pc_build3d: [0, 100],
    pc_green3d: [0, 100],
    pc_roads_3d: [0, 100],
  })
  const [selectedProp, setSelectedProp] = useState('pc_build3d')
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    onUpdateFilterRanges(sliderValues)
  }, [sliderValues])

  const levels = [2, 3, 4, 5]

  const props_dict = {
    pc_build3d: {label: 'Buildings', value: 'pc_build3d'},
    pc_green3d: {label: 'Greenery', value: 'pc_green3d'},
    pc_roads_3d: {label: 'Roads', value: 'pc_roads_3d'}
}

  const handleKeyDown = (e, isParent) => {
    if (e.key === 'Enter') {
      onSearch(isParent ? searchParentId : searchId, isParent)
    }
  }

  const handleSliderChange = (key, value) => {
    setSliderValues(prev => ({ ...prev, [key]: value }))
    setFilterProps(prev => ({ ...prev, [key]: true }))
  }

  const renderLegend = () => {
    const commonColors = [
      'rgba(0, 102, 255, 0.1)',
      'rgba(0, 149, 255, 0.2)',
      'rgba(71, 178, 255, 0.3)',
      'rgba(94, 202, 239, 0.4)',
      'rgba(240, 216, 30, 0.5)',
      'rgba(255, 188, 0, 0.6)',
      'rgba(255, 137, 3, 0.7)',
      'rgba(255, 84, 0, 0.8)',
      'rgba(255, 43, 0, 0.9)',
      'rgba(255, 0, 0, 10)',
    ]

    const thresholds = activeLevels[0] === 5
      ? ['0', '0.1', '0.2', '0.5', '0.7', '1', '2', '3', '4', '5']
      : ['0', '10', '20', '30', '40', '50', '60', '70', '80', '90']

    const labels = activeLevels[0] === 5
      ? ['0.1', '0.2', '0.5', '0.7', '1', '2', '3', '4', '5', '6']
      : ['10', '20', '30', '40', '50', '60', '70', '80', '90', '100+']

    return (
      <div style={{
        position: 'fixed',
        bottom: '50px',
        backgroundColor: 'white',
        width: '500px',
        borderRadius: '8px',
        padding: '8px 16px',
        left: 'calc(100vw / 2 - 250px)',
      }}>
        <div style={{ marginBottom: 8, fontWeight: 500 }}>Цветовая шкала</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-around' }}>
          {commonColors.map((color, index) => (
            <div key={index} style={{ textAlign: 'center' }}>
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
                {thresholds[index]} – {labels[index]}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }


  return (
    <Card
      title="Display properties"
      style={{
        position: 'absolute',
        top: 20,
        left: 20,
        zIndex: 999,
        minWidth: 260,
        borderRadius: 8,
        boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
        padding: 8
      }}
    >
        <div
          style={{
            maxHeight: collapsed ? 0 : 1000,
            overflow: 'hidden',
            transition: 'max-height 0.3s ease-in-out',
          }}
        >
          <div style={{ marginBottom: 10 }}>
            <strong>Cell size level</strong>
            <Select
              value={activeLevels[0]}
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
                { label: 'Roads', value: 'pc_roads_3d' }
              ]}
            />
          </div>

          <Divider />

          <div style={{ marginBottom: 10, marginTop: 10, marginLeft: 2, marginRight: 2 }}>
            <strong style={{ marginBottom: 10, display: 'block'}} >Range for properties</strong>
            {Object.keys(sliderValues).map((key) => (
              <div key={key} style={{ marginBottom: 20 }}>

                {/*<Checkbox*/}
                {/*  checked={filterProps[key]}*/}
                {/*  onChange={(e) => setFilterProps(prev => ({ ...prev, [key]: e.target.checked }))}*/}
                {/*>*/}
                {/*  {key}*/}
                {/*</Checkbox>*/}
                <div>{props_dict[key].label}: {sliderValues[key][0]} - {sliderValues[key][1]}</div>
                <Slider
                  range={{ draggableTrack: true }}
                  value={sliderValues[key]}
                  onChange={(value) => handleSliderChange(key, value)}
                  min={0}
                  max={100}
                />
              </div>
            ))}
          </div>

          <Divider />

          <div style={{ marginTop: 10 }}>
            <strong>Search by Cell ID</strong>
            <Input.Search
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              onSearch={() => onSearch(searchId)}
              onKeyDown={(e) => handleKeyDown(e, false)}
              placeholder="Enter ID..."
              enterButton
              style={{ marginTop: 5 }}
            />
          </div>

          <div style={{ marginTop: 10, marginBottom: 20 }}>
            <strong>Search by Parent Cell ID</strong>
            <Input.Search
              value={searchParentId}
              onChange={(e) => setSearchParentId(e.target.value)}
              onSearch={() => onSearch(searchParentId, true)}
              onKeyDown={(e) => handleKeyDown(e, true)}
              placeholder="Enter Parent ID..."
              enterButton
              style={{ marginTop: 5 }}
            />
          </div>

      </div>

      <div style={{ textAlign: 'center', marginTop: collapsed ? 0 : 16 }}>
        <Button
          type="text"
          icon={collapsed ? <DownOutlined /> : <UpOutlined />}
          onClick={() => setCollapsed(!collapsed)}
        />
      </div>
      {renderLegend()}
      {/*<div style={{ marginTop: 10 }}>*/}
      {/*  <Button onClick={() => setIsModalVisible(true)}>Фильтрация</Button>*/}
      {/*</div>*/}

      {/*<div*/}
      {/*  style={{*/}
      {/*    position: 'absolute',*/}
      {/*    left: 280,*/}
      {/*    top: 20,*/}
      {/*    background: 'white',*/}
      {/*    border: '1px solid #ccc',*/}
      {/*    borderRadius: 8,*/}
      {/*    padding: 20,*/}
      {/*    zIndex: 1000,*/}
      {/*    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',*/}
      {/*    width: 300,*/}
      {/*    display: isModalVisible ? 'block' : 'none',*/}
      {/*  }}*/}
      {/*>*/}
      {/*  <div style={{ marginTop: 10, marginBottom: 20 }}>*/}
      {/*    <strong>Search by Parent ID</strong>*/}
      {/*    <div>*/}
      {/*      <input*/}
      {/*        value={searchParentId}*/}
      {/*        onChange={(e) => setSearchParentId(e.target.value)}*/}
      {/*        onKeyDown={(e) => handleKeyDown(e, true)}*/}
      {/*        placeholder="Enter Parent ID..."*/}
      {/*      />*/}
      {/*      <button onClick={() => onSearch(searchParentId, true)}>Search</button>*/}
      {/*    </div>*/}
      {/*  </div>*/}
      {/*  {Object.keys(sliderValues).map((key) => (*/}
      {/*    <div key={key} style={{ marginBottom: 20 }}>*/}

      {/*      /!*<Checkbox*!/*/}
      {/*      /!*  checked={filterProps[key]}*!/*/}
      {/*      /!*  onChange={(e) => setFilterProps(prev => ({ ...prev, [key]: e.target.checked }))}*!/*/}
      {/*      /!*>*!/*/}
      {/*      /!*  {key}*!/*/}
      {/*      /!*</Checkbox>*!/*/}
      {/*      <div>{key}: {sliderValues[key][0]} - {sliderValues[key][1]}</div>*/}
      {/*      <Slider*/}
      {/*        range={{ draggableTrack: true }}*/}
      {/*        value={sliderValues[key]}*/}
      {/*        onChange={(value) => handleSliderChange(key, value)}*/}
      {/*        min={0}*/}
      {/*        max={100}*/}
      {/*      />*/}
      {/*    </div>*/}
      {/*  ))}*/}
      {/*</div>*/}
    </Card>
  )
}

export default UI