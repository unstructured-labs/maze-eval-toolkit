/**
 * AI prompt generation utilities
 */

import type {
  Cell,
  ExitDoorPair,
  Hole,
  MoveByMoveContext,
  PerspectiveRotation,
  Position,
  PromptViewOptions,
  WildcardTile,
} from '../types'
import { getPerspectiveRotationDescription } from './geometry'
import {
  renderMazeAs2DMatrix,
  renderMazeAsAdjacencyList,
  renderMazeAsBlocks,
  renderMazeAsCoordinateMatrix,
  renderMazeAsCoordinateToken,
  renderMazeAsExplicitEdges,
  renderMazeAsText,
} from './mazeRendering'

export const generateAIPrompt = (
  grid: Cell[][],
  playerPos: Position,
  goalPos: Position,
  viewOptions: PromptViewOptions = {
    ascii: true,
    adjacencyList: true,
    coordinateMatrix: true,
    matrix2D: true,
    blockFormat: false,
    explicitEdges: false,
    coordinateToken: false,
    includeUnreachableInstructions: false,
    applyTimePressure: false,
    executionMode: 'fullSolution',
  },
  holes: Hole[] = [],
  exitDoorPair: ExitDoorPair | null = null,
  moveByMoveContext: MoveByMoveContext | null = null,
  wildcardTile: WildcardTile = null,
  perspectiveRotation: PerspectiveRotation = 'none',
): string => {
  const sections: string[] = []
  const hasHoles = holes.length > 0
  const hasPortals = exitDoorPair !== null
  const hasWildcard = wildcardTile !== null

  // ASCII view
  if (viewOptions.ascii) {
    const mazeText = renderMazeAsText(grid, playerPos, goalPos, holes, wildcardTile)
    const holeLegend = hasHoles ? '\n- X = Hole (void) - DO NOT ENTER, you will lose!' : ''
    const portalLegend = hasPortals ? '\n- Some boundary edges may be open' : ''
    const wildcardLegend = hasWildcard
      ? '\n- ? = Wildcard tile (passable, can be passed through)'
      : ''
    sections.push(`MAZE (ASCII):
${mazeText}

ASCII LEGEND:
- P = Player starting position
- G = Goal position
- +-- = Wall on top of cell
- | = Wall on left/right of cell
- Spaces between walls = Passable paths${holeLegend}${portalLegend}${wildcardLegend}`)
  }

  // Adjacency List view
  if (viewOptions.adjacencyList) {
    const adjacencyList = renderMazeAsAdjacencyList(
      grid,
      playerPos,
      goalPos,
      holes,
      exitDoorPair,
      wildcardTile,
    )
    const holeLegend = hasHoles
      ? '\n- [HOLE] marks void cells - these are impassable and dangerous'
      : ''
    const portalLegend = hasPortals
      ? '\n- (?) indicates a passable direction with unknown outcome'
      : ''
    const wildcardLegend = hasWildcard
      ? '\n- [?] marks the wildcard tile (passable, no special effect)'
      : ''
    sections.push(`GRAPH ADJACENCY LIST:
${adjacencyList}

ADJACENCY LIST LEGEND:
- Each line shows a cell coordinate and its reachable neighbors
- Format: (x,y) -> (neighbor1), (neighbor2), ...
- [P] marks the player position, [G] marks the goal${holeLegend}${portalLegend}${wildcardLegend}`)
  }

  // Coordinate Matrix view
  if (viewOptions.coordinateMatrix) {
    const coordinateMatrix = renderMazeAsCoordinateMatrix(
      grid,
      playerPos,
      goalPos,
      holes,
      exitDoorPair,
      wildcardTile,
    )
    const holeLegend = hasHoles
      ? '\n- H:.... marks hole cells - void spaces that cause you to lose if entered'
      : ''
    const portalLegend = hasPortals
      ? '\n- ? in move string indicates a passable but unknown direction'
      : ''
    const wildcardLegend = hasWildcard
      ? '\n- W: prefix marks the wildcard tile (can be passed through)'
      : ''
    sections.push(`COORDINATE MATRIX:
${coordinateMatrix}

MATRIX LEGEND:
- Each cell shows valid moves: U=Up, D=Down, L=Left, R=Right, .=blocked
- P: prefix marks player position, G: prefix marks goal
- Coordinates: x increases rightward, y increases downward${holeLegend}${portalLegend}${wildcardLegend}`)
  }

  // Valid Move Layout - shows grid + valid moves from each cell
  if (viewOptions.matrix2D) {
    const matrix2D = renderMazeAs2DMatrix(grid, playerPos, goalPos, holes, wildcardTile)
    const holeLegend = hasHoles ? '\n- X = Hole (impassable, causes failure if entered)' : ''
    const wildcardLegend = hasWildcard ? '\n- ? = Wildcard tile (passable)' : ''
    sections.push(`VALID MOVE LAYOUT:
${matrix2D}

LEGEND:
- P = Player (your current position)
- G = Goal (destination)
- . = Empty passable cell${holeLegend}${wildcardLegend}

MOVEMENT:
- UP: decreases row (move toward row 0)
- DOWN: increases row (move toward higher row numbers)
- LEFT: decreases column (move toward col 0)
- RIGHT: increases column (move toward higher column numbers)
- Each (row,col) entry shows the valid moves from that cell`)
  }

  // Block Format - visual 2D grid with thick walls
  if (viewOptions.blockFormat) {
    const blockMaze = renderMazeAsBlocks(grid, playerPos, goalPos, holes, wildcardTile)
    const holeLegend = hasHoles ? '\n- X = Hole (void) - DO NOT ENTER!' : ''
    const wildcardLegend = hasWildcard ? '\n- ? = Wildcard tile (passable)' : ''
    sections.push(`BLOCK FORMAT:
${blockMaze}

BLOCK LEGEND:
- # = Wall (impassable)
- . = Open path (passable)
- P = Player starting position
- G = Goal position${holeLegend}${wildcardLegend}`)
  }

  // Explicit Edges - natural language graph edges
  if (viewOptions.explicitEdges) {
    const explicitEdges = renderMazeAsExplicitEdges(
      grid,
      playerPos,
      goalPos,
      holes,
      exitDoorPair,
      wildcardTile,
    )
    const holeLegend = hasHoles ? '\n- [HOLE] marks void cells with no available moves' : ''
    const portalLegend = hasPortals ? '\n- (?) indicates unknown portal destination' : ''
    const wildcardLegend = hasWildcard ? '\n- [?] marks the wildcard tile' : ''
    sections.push(`EXPLICIT GRAPH EDGES:
${explicitEdges}

EDGE LEGEND:
- Each line shows available actions from a node and their destinations
- [PLAYER] marks your starting position, [GOAL] marks the destination${holeLegend}${portalLegend}${wildcardLegend}`)
  }

  // Coordinate Token Format - MazeBench tokenized representation
  if (viewOptions.coordinateToken) {
    const coordinateToken = renderMazeAsCoordinateToken(
      grid,
      playerPos,
      goalPos,
      holes,
      exitDoorPair,
      wildcardTile,
    )
    const holeLegend = hasHoles ? '\n- <|void|> = Hole (impassable void, causes failure)' : ''
    const portalLegend = hasPortals ? '\n- <|portal|> = Portal (teleportation point)' : ''
    const wildcardLegend = hasWildcard ? '\n- <|wildcard|> = Wildcard tile (passable)' : ''
    sections.push(`COORDINATE TOKEN FORMAT:
${coordinateToken}

TOKEN LEGEND:
- <|row-col|> = Cell coordinate (0-indexed)
- Wall tokens: combinations of up/down/left/right (e.g., <|up_left_wall|>, <|no_wall|>)
- <|origin|> = Starting position (your current location)
- <|target|> = Goal position (destination)
- <|blank|> = Empty passable cell${holeLegend}${portalLegend}${wildcardLegend}`)
  }

  const unreachableInstructions = viewOptions.includeUnreachableInstructions
    ? `
For this maze, it's possible it's unsolvable. Therefore you have additional actions available. If you decide it's impossible to navigate to the goal return { "action": "GOAL_UNREACHABLE" }. However, if you are undecided, return { "action": "UNDECIDED" }. Of course, if there is a path to reach the goal you should return that path.
`
    : ''

  const timePressureInstructions = viewOptions.applyTimePressure
    ? `
TIME PRESSURE WARNING:
You are under strict time pressure to present a solution. You must not use extended internal chain of thought reasoning, thinking, or private computation. You cannot run any tools or write and execute programs. You must use quick heuristics to arrive at a solution and should avoid lengthy path-finding reasoning. You are being evaluated on your presented solution AND the time required to produce it. Faster is better. You must respond within about ~30 seconds. 30 seconds is about ~2000 tokens or ~2500 words of internal/private reasoning. You must keep your internal computation within this limit. If this is not enough time, respond with { "action": "INSUFFICIENT_TIME" }.
`
    : ''

  const commentsInstructions = viewOptions.applyTimePressure
    ? 'In the "comments" field, indicate how long it took to arrive at your solution and whether you complied with the time pressure rules (no extended reasoning, no tools, quick heuristics only).'
    : 'In the "comments" field, describe any special insight, intuition, or strategy you used to solve the maze.'

  const validActions = viewOptions.includeUnreachableInstructions
    ? viewOptions.applyTimePressure
      ? 'Valid actions: "UP", "DOWN", "LEFT", "RIGHT", "GOAL_UNREACHABLE", "UNDECIDED", "INSUFFICIENT_TIME"'
      : 'Valid actions: "UP", "DOWN", "LEFT", "RIGHT", "GOAL_UNREACHABLE", "UNDECIDED"'
    : viewOptions.applyTimePressure
      ? 'Valid actions: "UP", "DOWN", "LEFT", "RIGHT", "INSUFFICIENT_TIME"'
      : 'Valid actions: "UP", "DOWN", "LEFT", "RIGHT"'

  const holeWarning = hasHoles
    ? '- DANGER: Holes (marked X) are void spaces - entering a hole means you LOSE!\n'
    : ''

  const perspectiveRotationInstructions =
    perspectiveRotation !== 'none'
      ? `
[PERSPECTIVE ROTATION] ${getPerspectiveRotationDescription(perspectiveRotation)}

`
      : ''

  const isMoveByMove = viewOptions.executionMode === 'moveByMove' && moveByMoveContext

  // Move-by-move mode: include context and ask for single move
  if (isMoveByMove) {
    const { startPos, currentPos, moveHistory } = moveByMoveContext
    const moveHistoryStr =
      moveHistory.length > 0 ? moveHistory.join(', ') : '(none - this is your first move)'

    return `You are solving a maze move-by-move. Navigate from the start to G (goal).
${perspectiveRotationInstructions}
${sections.join('\n\n')}

CURRENT STATE:
- Start position: (${startPos.x},${startPos.y})
- Current position: (${currentPos.x},${currentPos.y}) - marked as P in the maze
- Moves taken so far: ${moveHistoryStr}
- Total moves so far: ${moveHistory.length}

RULES:
- You can only move UP, DOWN, LEFT, or RIGHT
- You cannot pass through walls
${holeWarning}- You are deciding ONE move at a time - what is your next move?
${unreachableInstructions}${timePressureInstructions}
IMPORTANT: Please do not write any code to solve the maze. This is a test of your visual/intuitive reasoning path-finding skills.

You can solve it move-by-move. So you will continue to be re-prompted after every move to continue exploring or solving the maze. There is no cost to exploring the maze. At each step, you will see your previous move history and starting position.

Return ONLY a JSON object with your NEXT SINGLE MOVE in this exact format (no other text):
{"comments":"<brief reasoning for this move>","action":"UP"}

${validActions}
`
  }

  // Full solution mode: ask for complete path
  return `You are solving a maze. Navigate from P (player) to G (goal).
${perspectiveRotationInstructions}
${sections.join('\n\n')}

RULES:
- You can only move UP, DOWN, LEFT, or RIGHT
- You cannot pass through walls
${holeWarning}- Find a path to the goal (shortest path preferred, but any valid path works)
${unreachableInstructions}${timePressureInstructions}
IMPORTANT: Please do not write any code to solve the maze. This is a test of your visual/intuitive reasoning path-finding skills. If you write and execute code, this attempt will be disqualified.

Return ONLY a JSON object in this exact format (no other text):
{"comments":"<your comments here>","actions":[{"action":"UP"},{"action":"LEFT"},{"action":"DOWN"},{"action":"RIGHT"}]}

${commentsInstructions}

${validActions}
`
}

// NOTE: Test set prompt generation is now handled by core's generateAllPrompts()
// which is used directly in testSetExport.ts for consistency with CLI evaluation.
