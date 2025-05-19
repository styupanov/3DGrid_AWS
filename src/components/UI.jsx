import { useState } from 'react'

const UI = ({ onToggleLevel, activeLevels, onSearch, onColorByType, setFilterProps, filterProps }) => {
  const [searchId, setSearchId] = useState('')
  const [searchParentId, setSearchParentId] = useState('')
  const levels = [2, 3, 4, 5]

  const handleKeyDown = (e, isParent) => {
    if (e.key === 'Enter') {
      onSearch(isParent ? searchParentId : searchId, isParent)
    }
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 20,
        left: 20,
        background: 'white',
        padding: 10,
        borderRadius: 4,
        zIndex: 999,
        minWidth: 220,
      }}
    >
      <div>
        <strong>Levels filter</strong>
        {levels.map((level) => (
          <div key={level}>
            <label>
              <input
                type="radio"
                name="level"
                checked={activeLevels.includes(level)}
                onChange={() => onToggleLevel(level)}
              />
              Level {level}
            </label>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 10 }}>
        <strong>Search by ID</strong>
        <div>
          <input
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, false)}
            placeholder="Enter ID..."
          />
          <button onClick={() => onSearch(searchId)}>Search</button>
        </div>
      </div>

      <div style={{ marginTop: 10 }}>
        <strong>Search by Parent ID</strong>
        <div>
          <input
            value={searchParentId}
            onChange={(e) => setSearchParentId(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, true)}
            placeholder="Enter Parent ID..."
          />
          <button onClick={() => onSearch(searchParentId, true)}>Search</button>
        </div>
      </div>

      <div style={{ marginTop: 10 }}>
        <button onClick={onColorByType}>Разметить по типу</button>
      </div>

      <div style={{ marginTop: 10 }}>
        <strong>Фильтрация по пропсам</strong>
        <div><label>
          <input
            type="checkbox"
            checked={filterProps.pc_build3d}
            onChange={e => setFilterProps(prev => ({ ...prev, pc_build3d: e.target.checked }))}
          />
          pc_build3d</label></div>
        <div><label>
          <input
            type="checkbox"
            checked={filterProps.pc_green3d}
            onChange={e => setFilterProps(prev => ({ ...prev, pc_green3d: e.target.checked }))}
          />
          pc_green3d</label></div>
        <div><label>
          <input
            type="checkbox"
            checked={filterProps.pc_roads3d}
            onChange={e => setFilterProps(prev => ({ ...prev, pc_green3d: e.target.checked }))}
          />
          pc_roads3d</label></div>
      </div>
    </div>
  )
}

export default UI
