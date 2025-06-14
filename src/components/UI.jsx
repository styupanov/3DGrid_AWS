import { useState, useEffect } from 'react'
import {Modal, Button, Slider, Checkbox, Select, Input, Card} from 'antd'

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

  useEffect(() => {
    onUpdateFilterRanges(sliderValues)
  }, [sliderValues])

  const levels = [2, 3, 4, 5]

  const handleKeyDown = (e, isParent) => {
    if (e.key === 'Enter') {
      onSearch(isParent ? searchParentId : searchId, isParent)
    }
  }

  const handleSliderChange = (key, value) => {
    setSliderValues(prev => ({ ...prev, [key]: value }))
    setFilterProps(prev => ({ ...prev, [key]: true }))
  }


  return (
    <Card
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
      <div style={{ marginBottom: 10 }}>
        <strong>Levels Filter</strong>
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
        <strong>Select Property</strong>
        <Select
          style={{ width: '100%' }}
          value={selectedProperty}
          onChange={setSelectedProperty}
          options={[
            { label: 'pc_build3d', value: 'pc_build3d' },
            { label: 'pc_green3d', value: 'pc_green3d' },
            { label: 'pc_roads_3d', value: 'pc_roads_3d' }
          ]}
        />
      </div>

      <div style={{ marginBottom: 10, marginTop: 10 }}>
        <strong style={{ marginBottom: 10, display: 'block'}} >Range for properties</strong>
        {Object.keys(sliderValues).map((key) => (
          <div key={key} style={{ marginBottom: 20 }}>

            {/*<Checkbox*/}
            {/*  checked={filterProps[key]}*/}
            {/*  onChange={(e) => setFilterProps(prev => ({ ...prev, [key]: e.target.checked }))}*/}
            {/*>*/}
            {/*  {key}*/}
            {/*</Checkbox>*/}
            <div>{key}: {sliderValues[key][0]} - {sliderValues[key][1]}</div>
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


      <div style={{ marginTop: 10 }}>
        <strong>Search by ID</strong>
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
        <strong>Search by Parent ID</strong>
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