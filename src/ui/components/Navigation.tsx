interface NavigationProps {
  current: number
  total: number
  onNavigate: (index: number) => void
}

export default function Navigation({ current, total, onNavigate }: NavigationProps) {
  return (
    <div className="flex items-center justify-between bg-gray-800 rounded-lg px-4 py-3">
      <button
        type="button"
        onClick={() => onNavigate(Math.max(0, current - 1))}
        disabled={current === 0}
        className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        ← Previous
      </button>

      <div className="flex items-center gap-2">
        <span className="text-gray-400">Maze</span>
        <input
          type="number"
          value={current + 1}
          min={1}
          max={total}
          onChange={(e) => {
            const val = Number.parseInt(e.target.value, 10)
            if (!Number.isNaN(val) && val >= 1 && val <= total) {
              onNavigate(val - 1)
            }
          }}
          className="w-16 px-2 py-1 text-center bg-gray-700 rounded border border-gray-600"
        />
        <span className="text-gray-400">of {total}</span>
      </div>

      <button
        type="button"
        onClick={() => onNavigate(Math.min(total - 1, current + 1))}
        disabled={current >= total - 1}
        className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Next →
      </button>
    </div>
  )
}
