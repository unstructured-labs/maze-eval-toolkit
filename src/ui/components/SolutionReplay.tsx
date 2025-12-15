import type { EvaluationResult } from '../../core/types'

interface SolutionReplayProps {
  result: EvaluationResult
  isReplaying: boolean
  onStartReplay: () => void
  onStopReplay: () => void
}

export default function SolutionReplay({
  result,
  isReplaying,
  onStartReplay,
  onStopReplay,
}: SolutionReplayProps) {
  const moves = result.parsedMoves ?? []

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="font-semibold mb-3">Solution Details</h3>

      {/* Controls */}
      <div className="flex gap-2 mb-4">
        {moves.length > 0 && (
          <button
            type="button"
            onClick={isReplaying ? onStopReplay : onStartReplay}
            className={`px-4 py-2 rounded text-sm font-medium ${
              isReplaying ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {isReplaying ? 'Stop' : 'Replay'}
          </button>
        )}
      </div>

      {/* Moves */}
      {moves.length > 0 ? (
        <div className="mb-4">
          <div className="text-sm text-gray-400 mb-1">Moves ({moves.length}):</div>
          <div className="flex flex-wrap gap-1">
            {moves.map((move, i) => (
              <span
                key={`${move}-${i}`}
                className="px-2 py-0.5 bg-gray-700 rounded text-xs font-mono"
              >
                {move}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-sm text-gray-400 mb-4">No moves parsed from response</div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="text-gray-400">Input Tokens:</div>
        <div>{result.inputTokens ?? '-'}</div>

        <div className="text-gray-400">Output Tokens:</div>
        <div>{result.outputTokens ?? '-'}</div>

        {result.reasoningTokens !== null && (
          <>
            <div className="text-gray-400">Reasoning Tokens:</div>
            <div>{result.reasoningTokens}</div>
          </>
        )}

        <div className="text-gray-400">Time:</div>
        <div>{result.inferenceTimeMs}ms</div>

        <div className="text-gray-400">Cost:</div>
        <div>{result.costUsd !== null ? `$${result.costUsd.toFixed(4)}` : '-'}</div>
      </div>

      {/* Reasoning */}
      {result.reasoning && (
        <div className="mt-4">
          <div className="text-sm text-gray-400 mb-1">Model Reasoning:</div>
          <div className="bg-gray-900 rounded p-2 text-sm text-gray-300 max-h-40 overflow-y-auto">
            {result.reasoning}
          </div>
        </div>
      )}

      {/* Raw Response */}
      <details className="mt-4">
        <summary className="text-sm text-gray-400 cursor-pointer hover:text-gray-300">
          Raw Response
        </summary>
        <div className="mt-2 bg-gray-900 rounded p-2 text-xs text-gray-400 max-h-40 overflow-y-auto font-mono whitespace-pre-wrap">
          {result.rawResponse}
        </div>
      </details>
    </div>
  )
}
