/**
 * Saved Mazes Overlay - Floating panel showing saved maze designs
 */

import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { cn } from '@/ui-library/lib/utils'

import type { SavedMazeDesign } from '../utils/mazeStorage'

interface SavedMazesOverlayProps {
  mazes: SavedMazeDesign[]
  onLoad: (name: string) => void
  onDelete: (name: string) => void
  isVisible: boolean
}

export function SavedMazesOverlay({ mazes, onLoad, onDelete, isVisible }: SavedMazesOverlayProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  if (!isVisible) return null

  return (
    <div className="self-start bg-background/95 backdrop-blur-sm border rounded-lg shadow-lg min-w-40 max-w-52">
      <button
        type="button"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <span>Saved Mazes ({mazes.length})</span>
        {isCollapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
      </button>

      {!isCollapsed && (
        <div className="max-h-48 overflow-y-auto border-t">
          {mazes.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground italic">No saved mazes yet</div>
          ) : (
            mazes.map((maze) => (
              <div
                key={maze.name}
                className="flex items-center justify-between px-3 py-1.5 hover:bg-muted/50 group"
              >
                <button
                  type="button"
                  onClick={() => onLoad(maze.name)}
                  className="flex-1 text-left text-xs truncate hover:text-primary transition-colors"
                  title={`${maze.width}x${maze.height} - ${maze.difficulty}`}
                >
                  {maze.name}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(maze.name)
                  }}
                  className={cn(
                    'opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-red-500 transition-opacity',
                  )}
                  title="Delete maze"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
