import { useCallback, useState } from 'react'
import type { Difficulty, EvaluationResult, TestSetFile } from '../core/types'
import { DIFFICULTIES } from '../core/types'
import MazeViewer from './components/MazeViewer'
import ModelSummary from './components/ModelSummary'
import Navigation from './components/Navigation'
import SolutionReplay from './components/SolutionReplay'

export default function App() {
  const [testSet, setTestSet] = useState<TestSetFile | null>(null)
  const [results, setResults] = useState<EvaluationResult[]>([])
  const [currentDifficulty, setCurrentDifficulty] = useState<Difficulty>('simple')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedResult, setSelectedResult] = useState<EvaluationResult | null>(null)
  const [isReplaying, setIsReplaying] = useState(false)

  // Get current maze
  const mazes = testSet?.mazes[currentDifficulty] ?? []
  const currentMaze = mazes[currentIndex] ?? null
  const totalMazes = mazes.length

  // Get results for current maze
  const mazeResults = results.filter((r) => r.mazeId === currentMaze?.id)

  // Handle test set file upload
  const handleTestSetUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const data = JSON.parse(text) as TestSetFile
      setTestSet(data)
      setCurrentDifficulty('simple')
      setCurrentIndex(0)
      setSelectedResult(null)
    } catch (err) {
      alert(`Failed to parse test set: ${err}`)
    }
  }, [])

  // Handle results file upload (JSON export from SQLite)
  const handleResultsUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const data = JSON.parse(text) as EvaluationResult[]
      setResults(data)
      setSelectedResult(null)
    } catch (err) {
      alert(`Failed to parse results: ${err}`)
    }
  }, [])

  // Navigation handlers
  const goToMaze = useCallback((index: number) => {
    setCurrentIndex(index)
    setSelectedResult(null)
    setIsReplaying(false)
  }, [])

  const changeDifficulty = useCallback((difficulty: Difficulty) => {
    setCurrentDifficulty(difficulty)
    setCurrentIndex(0)
    setSelectedResult(null)
    setIsReplaying(false)
  }, [])

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">LMIQ v1 Beta - Maze Viewer</h1>
          <div className="flex gap-4">
            <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm">
              Load Test Set
              <input type="file" accept=".json" onChange={handleTestSetUpload} className="hidden" />
            </label>
            <label className="cursor-pointer bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-sm">
              Load Results
              <input type="file" accept=".json" onChange={handleResultsUpload} className="hidden" />
            </label>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        {!testSet ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg">Load a test set JSON file to get started</p>
            <p className="text-gray-500 text-sm mt-2">
              Generate one with:{' '}
              <code className="bg-gray-800 px-2 py-1 rounded">task generate</code>
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Panel - Maze View */}
            <div className="lg:col-span-2 space-y-4">
              {/* Difficulty tabs */}
              <div className="flex gap-2">
                {DIFFICULTIES.map((d) => {
                  const count = testSet.mazes[d]?.length ?? 0
                  if (count === 0) return null
                  return (
                    <button
                      type="button"
                      key={d}
                      onClick={() => changeDifficulty(d)}
                      className={`px-4 py-2 rounded text-sm font-medium ${
                        currentDifficulty === d
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {d} ({count})
                    </button>
                  )
                })}
              </div>

              {/* Navigation */}
              <Navigation current={currentIndex} total={totalMazes} onNavigate={goToMaze} />

              {/* Maze Viewer */}
              {currentMaze && (
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <span className="text-gray-400 text-sm">Maze ID: </span>
                      <span className="font-mono text-sm">{currentMaze.id.slice(0, 8)}...</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-400">Size: </span>
                      <span>
                        {currentMaze.width}x{currentMaze.height}
                      </span>
                      <span className="text-gray-400 ml-4">Shortest Path: </span>
                      <span className="text-green-400">{currentMaze.shortestPath}</span>
                    </div>
                  </div>
                  <MazeViewer
                    maze={currentMaze}
                    solution={selectedResult}
                    isReplaying={isReplaying}
                    onReplayComplete={() => setIsReplaying(false)}
                  />
                </div>
              )}
            </div>

            {/* Right Panel - Results */}
            <div className="space-y-4">
              {/* Model Summary */}
              {currentMaze && mazeResults.length > 0 && (
                <ModelSummary
                  results={mazeResults}
                  shortestPath={currentMaze.shortestPath}
                  selectedId={selectedResult?.id}
                  onSelect={(result) => {
                    setSelectedResult(result)
                    setIsReplaying(false)
                  }}
                />
              )}

              {/* Solution Replay */}
              {selectedResult && (
                <SolutionReplay
                  result={selectedResult}
                  isReplaying={isReplaying}
                  onStartReplay={() => setIsReplaying(true)}
                  onStopReplay={() => setIsReplaying(false)}
                />
              )}

              {/* No results message */}
              {currentMaze && mazeResults.length === 0 && (
                <div className="bg-gray-800 rounded-lg p-4 text-center">
                  <p className="text-gray-400">No evaluation results for this maze</p>
                  <p className="text-gray-500 text-sm mt-2">
                    Load results JSON or run an evaluation
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
