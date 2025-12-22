/**
 * Maze Controls Panel - Difficulty, hack modes, fog, and maze stats
 */

import { Button } from '@/ui-library/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/ui-library/components/ui/card'
import { Checkbox } from '@/ui-library/components/ui/checkbox'
import { Input } from '@/ui-library/components/ui/input'
import { Label } from '@/ui-library/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui-library/components/ui/select'
import { Separator } from '@/ui-library/components/ui/separator'
import { Switch } from '@/ui-library/components/ui/switch'

type Difficulty = 'simple' | 'easy' | 'medium' | 'hard' | 'nightmare' | 'horror'

interface MazeStats {
  shortestPath: number
  totalReachable: number
  ratio: number
  wouldRegenerate: boolean
}

interface MazeControlsProps {
  difficulty: Difficulty
  onDifficultyChange: (d: Difficulty) => void
  minShortestPath: string
  onMinShortestPathChange: (value: string) => void
  generateHoles: boolean
  onGenerateHolesToggle: () => void
  exitDoorEnabled: boolean
  onExitDoorToggle: () => void
  wildcardTileEnabled: boolean
  onWildcardTileToggle: () => void
  humanPlayerModeEnabled: boolean
  onHumanPlayerModeToggle: () => void
  perspectiveRotationEnabled: boolean
  onPerspectiveRotationToggle: () => void
  hackMode: 0 | 1 | 2
  onHackModeChange: (mode: 0 | 1 | 2) => void
  fogEnabled: boolean
  onFogToggle: () => void
  mazeStats: MazeStats | null
  generationIterations: number
  generationFailed: boolean
  onRegenerate: () => void
  hasInteracted: boolean
  onResetState: () => void
  mazeDesignEnabled: boolean
  onMazeDesignEnabledToggle: () => void
}

const DIFFICULTY_OPTIONS: { value: Difficulty; label: string }[] = [
  { value: 'simple', label: 'Simple' },
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
  { value: 'nightmare', label: 'Nightmare' },
  { value: 'horror', label: 'Horror' },
]

export function MazeControls({
  difficulty,
  onDifficultyChange,
  minShortestPath,
  onMinShortestPathChange,
  generateHoles,
  onGenerateHolesToggle,
  exitDoorEnabled,
  onExitDoorToggle,
  wildcardTileEnabled,
  onWildcardTileToggle,
  humanPlayerModeEnabled,
  onHumanPlayerModeToggle,
  perspectiveRotationEnabled,
  onPerspectiveRotationToggle,
  hackMode,
  onHackModeChange,
  fogEnabled,
  onFogToggle,
  mazeStats,
  generationIterations,
  generationFailed,
  onRegenerate,
  hasInteracted,
  onResetState,
  mazeDesignEnabled,
  onMazeDesignEnabledToggle,
}: MazeControlsProps) {
  return (
    <Card className="h-full flex flex-col min-h-0 w-80">
      <CardHeader className="flex-shrink-0 space-y-3 pb-3">
        <CardTitle className="text-base">Maze Controls</CardTitle>
      </CardHeader>

      <CardContent className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-4 pt-0">
        {/* Difficulty & Min Path */}
        <div className="flex gap-2">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="difficulty-select" className="text-xs">
              Difficulty
            </Label>
            <Select value={difficulty} onValueChange={(v) => onDifficultyChange(v as Difficulty)}>
              <SelectTrigger id="difficulty-select" className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DIFFICULTY_OPTIONS.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-20 space-y-1.5">
            <Label htmlFor="min-shortest-path" className="text-xs">
              Min Path
            </Label>
            <Input
              id="min-shortest-path"
              type="number"
              min="1"
              placeholder="30"
              value={minShortestPath}
              onChange={(e) => onMinShortestPathChange(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
        </div>

        {/* Generation Options */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Generation Options</Label>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="generate-holes"
                checked={generateHoles}
                onCheckedChange={() => onGenerateHolesToggle()}
                className="h-3.5 w-3.5"
              />
              <Label htmlFor="generate-holes" className="text-xs cursor-pointer select-none">
                Generate Holes
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="exit-door"
                checked={exitDoorEnabled}
                onCheckedChange={() => onExitDoorToggle()}
                className="h-3.5 w-3.5"
              />
              <Label htmlFor="exit-door" className="text-xs cursor-pointer select-none">
                Exit Door
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="wildcard-tile"
                checked={wildcardTileEnabled}
                onCheckedChange={() => onWildcardTileToggle()}
                className="h-3.5 w-3.5"
              />
              <Label htmlFor="wildcard-tile" className="text-xs cursor-pointer select-none">
                Add Wildcard Tile
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="human-player-mode"
                checked={humanPlayerModeEnabled}
                onCheckedChange={() => onHumanPlayerModeToggle()}
                className="h-3.5 w-3.5"
              />
              <Label htmlFor="human-player-mode" className="text-xs cursor-pointer select-none">
                Enable Human Player Mode
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="perspective-rotation"
                checked={perspectiveRotationEnabled}
                onCheckedChange={() => onPerspectiveRotationToggle()}
                className="h-3.5 w-3.5"
              />
              <Label htmlFor="perspective-rotation" className="text-xs cursor-pointer select-none">
                Perspective Rotation
              </Label>
            </div>
          </div>
        </div>

        {/* Hack Modes */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Hack Modes</Label>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="hack-mode-1"
                checked={hackMode === 1}
                onCheckedChange={(checked) => onHackModeChange(checked ? 1 : 0)}
                className="h-3.5 w-3.5"
              />
              <Label htmlFor="hack-mode-1" className="text-xs cursor-pointer select-none">
                Hack Mode 1 (Straight path)
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="hack-mode-2"
                checked={hackMode === 2}
                onCheckedChange={(checked) => onHackModeChange(checked ? 2 : 0)}
                className="h-3.5 w-3.5"
              />
              <Label htmlFor="hack-mode-2" className="text-xs cursor-pointer select-none">
                Hack Mode 2 (L-shaped path)
              </Label>
            </div>
          </div>
        </div>

        {/* Fog Toggle */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Visibility</Label>
          <div className="flex items-center gap-2">
            <Checkbox
              id="fog-toggle"
              checked={fogEnabled}
              onCheckedChange={() => onFogToggle()}
              className="h-3.5 w-3.5"
            />
            <Label htmlFor="fog-toggle" className="text-xs cursor-pointer select-none">
              Fog of War
            </Label>
          </div>
        </div>

        <Separator />

        {/* Maze Stats */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Maze Stats</Label>
          {mazeStats ? (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-md border px-2 py-1.5">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Shortest Path
                </div>
                <div className="font-mono text-blue-400">{mazeStats.shortestPath} steps</div>
              </div>
              <div className="rounded-md border px-2 py-1.5">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Iterations
                </div>
                <div className="font-mono">{generationIterations}</div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">No maze generated</div>
          )}
        </div>

        {/* Generation Failure Message */}
        {generationFailed && (
          <div className="p-2 rounded-md border border-red-500/30 bg-red-500/10 text-xs text-red-400">
            Failed to generate maze with requested min shortest path after 1,000 iterations. Try a
            lower value or different difficulty.
          </div>
        )}

        <Separator />

        {/* Maze Buttons */}
        <div className="space-y-2">
          <Button onClick={onRegenerate} className="w-full" size="sm">
            Regenerate Maze
          </Button>
          <Button
            onClick={onResetState}
            variant="outline"
            className="w-full"
            size="sm"
            disabled={!hasInteracted}
          >
            Reset Maze State
          </Button>
        </div>

        <Separator />

        {/* Maze Design Mode */}
        <div className="flex items-center justify-between">
          <Label htmlFor="maze-design-enabled" className="text-xs cursor-pointer select-none">
            Enable Maze Design
          </Label>
          <Switch
            id="maze-design-enabled"
            checked={mazeDesignEnabled}
            onCheckedChange={() => onMazeDesignEnabledToggle()}
          />
        </div>
      </CardContent>
    </Card>
  )
}
