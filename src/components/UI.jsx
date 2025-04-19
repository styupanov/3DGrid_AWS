import { useState } from 'react'

const UI = ({ onToggleLevel, activeLevels, onSearch }) => {
  const [searchId, setSearchId] = useState('')

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
      }}
    >
      <div>
        <strong>Levels filter</strong>
        {Array.from({ length: 5 }, (_, i) => i + 1).map((level) => (
          <div key={level}>
            <label>
              <input
                type="checkbox"
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
            placeholder="Enter ID..."
          />
          <button onClick={() => onSearch(searchId)}>Search</button>
        </div>
      </div>
    </div>
  )
}

export default UI