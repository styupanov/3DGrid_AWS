import { useState, useEffect } from 'react'
import {Modal, Button, Slider, Checkbox, Select, Input, Card, Divider, ConfigProvider} from 'antd'
import {DownOutlined, UpOutlined} from '@ant-design/icons';
import { useAuthenticator } from '@aws-amplify/ui-react';
import {getLevelConfig} from '@/components/utils';

const UI = ({ onToggleLevel, activeLevels, onSearch, onColorByType, setFilterProps, filterProps, onUpdateFilterRanges, selectedProperty, setSelectedProperty  }) => {
  const [searchId, setSearchId] = useState('')
  const [searchParentId, setSearchParentId] = useState('')
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [sliderValues, setSliderValues] = useState({
    pc_build3d: [0, 0.01],
    pc_green3d: [0, 0.01],
    pc_roads_3d: [0, 0.01],
  })
  const [selectedProp, setSelectedProp] = useState('pc_build3d')
  const [collapsed, setCollapsed] = useState(false)
  const { user, signOut } = useAuthenticator((context) => [context.user]);
  const handleSliderChange = (key, value) => {
    setSliderValues(prev => ({ ...prev, [key]: value }))
    setFilterProps(prev => ({ ...prev, [key]: true }))
  }

  const levels = [2, 3, 4, 5]

  const props_dict = {
    pc_build3d: {label: 'Buildings', value: 'pc_build3d'},
    pc_green3d: {label: 'Greenery', value: 'pc_green3d'},
    pc_roads_3d: {label: 'Roads', value: 'pc_roads_3d'}
  }



  useEffect(() => {
    const { min, max } = getLevelConfig(activeLevels[0]);
    const updated = {
      pc_build3d: [min, max],
      pc_green3d: [min, max],
      pc_roads_3d: [min, max]
    };
    setSliderValues(updated);
  }, [activeLevels[0]]);

  useEffect(() => {
    onUpdateFilterRanges(sliderValues);
  }, [sliderValues, onUpdateFilterRanges]);


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

    // const thresholds = activeLevels[0] === 5
    //   ? ['0', '0.001', '0.002', '0.003', '0.004', '0.005', '0.006', '0.007', '0.008', '0.009']
    //   : activeLevels[0] === 4
    //     ? ['0', '0.1', '0.2', '0.3', '0.4', '0.5', '0.6', '0.7', '0.8', '0.9', '1']
    //     : ['0', '10', '20', '30', '40', '50', '60', '70', '80', '90'];
    //
    // const labels = activeLevels[0] === 5
    //   ? ['0.001', '0.002', '0.003', '0.004', '0.005', '0.006', '0.007', '0.008', '0.009', '0.01']
    //   : activeLevels[0] === 4
    //     ? ['0.1', '0.2', '0.3', '0.4', '0.5', '0.6', '0.7', '0.8', '0.9', '1']
    //     : ['10', '20', '30', '40', '50', '60', '70', '80', '90', '100+'];

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

    const { thresholds, labels } = getLevelConfig(activeLevels[0])



    return (
      <div style={{
        position: 'fixed',
        bottom: '10px',
        backgroundColor: 'white',
        width: '1000px',
        borderRadius: '8px',
        padding: '8px 16px',
        left: 'calc(100vw / 2 - 400px)',
      }}>
        <div style={{ marginBottom: 8, fontWeight: 500 }}>
          {props_dict[selectedProperty]?.label || selectedProperty} to color scheme
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-around' }}>
          {colors.map((color, index) => (
            <div key={index} style={{
              textAlign: 'center',
              minWidth: '75px',
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
                {thresholds[index]} – {labels[index]}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const levelMin = activeLevels[0] === 5 ? 0 : activeLevels[0] === 4 ? 0 : 0;
  const levelMax = activeLevels[0] === 5 ? 0.01 : activeLevels[0] === 4 ? 1 : 10;

  const { min, max, step } = getLevelConfig(activeLevels[0]);
  // if(user){
  //   debugger
  // }

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
          minWidth: 260,
          borderRadius: 8,
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

            <Divider style={{margin: '10px 0'}}/>

            <div style={{ marginBottom: 10, marginTop: 10, marginLeft: 2, marginRight: 2 }}>
              <strong style={{ marginBottom: 10, display: 'block'}} >Range for properties</strong>
              {Object.keys(sliderValues).map((key) => (
                <div key={key}>
                  <div>{props_dict[key].label}: {sliderValues[key][0]} - {sliderValues[key][1]}</div>
                  <Slider
                    range={{ draggableTrack: true }}
                    value={sliderValues[key]}
                    onChange={(value) => handleSliderChange(key, value)}
                    min={min}
                    max={max}
                    step={step}
                  />
                </div>
              ))}
            </div>

            <Divider style={{margin: '10px 0'}}/>

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
    </ConfigProvider>
  )
}

export default UI