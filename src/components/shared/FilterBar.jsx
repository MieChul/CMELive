import './shared-exchange.css'

const filters = [
  { id: 'all', label: 'All' },
  { id: 'unresponded', label: 'Unresponded' },
]

const sorts = [
  { id: 'latest', label: 'Latest' },
  { id: 'votes', label: 'Most votes' },
]

export default function FilterBar({ sort, onSort, filter, onFilter, disabled = false }) {
  return (
    <div className="filter-bar">
      <div className="filter-bar__row">
        <span className="filter-bar__label">Sort</span>
        <div className="filter-bar__chips">
          {sorts.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`filter-chip ${sort === s.id ? 'filter-chip--on' : ''}`}
              disabled={disabled}
              onClick={() => onSort(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
      <div className="filter-bar__row">
        <span className="filter-bar__label">Filter</span>
        <div className="filter-bar__chips">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`filter-chip ${filter === f.id ? 'filter-chip--on' : ''}`}
              disabled={disabled}
              onClick={() => onFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
