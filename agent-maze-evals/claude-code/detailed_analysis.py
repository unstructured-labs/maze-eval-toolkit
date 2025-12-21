import json
from collections import deque

def load_mazes(filepath):
    with open(filepath, 'r') as f:
        data = json.load(f)
    return data

def get_all_mazes(data):
    mazes = []
    difficulties = ['simple', 'easy', 'medium', 'hard', 'expert']
    for difficulty in difficulties:
        if difficulty in data.get('mazes', {}):
            for maze in data['mazes'][difficulty]:
                mazes.append(maze)
    return mazes

def can_move(grid, x, y, direction, width, height):
    if y < 0 or y >= height or x < 0 or x >= width:
        return False
    cell = grid[y][x]
    walls = cell['walls']
    if direction == 'UP':
        return not walls['top']
    elif direction == 'DOWN':
        return not walls['bottom']
    elif direction == 'LEFT':
        return not walls['left']
    elif direction == 'RIGHT':
        return not walls['right']
    return False

def get_neighbors(grid, x, y, width, height):
    """Get all reachable neighbors from (x,y)."""
    neighbors = []
    for d in ['UP', 'DOWN', 'LEFT', 'RIGHT']:
        if can_move(grid, x, y, d, width, height):
            if d == 'UP':
                neighbors.append((x, y-1, d))
            elif d == 'DOWN':
                neighbors.append((x, y+1, d))
            elif d == 'LEFT':
                neighbors.append((x-1, y, d))
            elif d == 'RIGHT':
                neighbors.append((x+1, y, d))
    return neighbors

def print_connectivity(maze):
    """Print connectivity for each cell."""
    grid = maze['grid']
    width = maze['width']
    height = maze['height']

    print("\nCell connectivity (x,y): [reachable directions]")
    for y in range(height):
        for x in range(width):
            neighbors = get_neighbors(grid, x, y, width, height)
            dirs = [n[2] for n in neighbors]
            print(f"  ({x},{y}): {dirs}")

def find_wall_structures(maze):
    """Identify wall structures (enclosed areas)."""
    grid = maze['grid']
    width = maze['width']
    height = maze['height']

    print("\nWall analysis per cell:")
    for y in range(height):
        for x in range(width):
            cell = grid[y][x]
            walls = cell['walls']
            wall_count = sum([walls['top'], walls['bottom'], walls['left'], walls['right']])
            if wall_count >= 2:
                wall_dirs = [d for d, v in walls.items() if v]
                print(f"  ({x},{y}): walls on {wall_dirs}")

def bfs_path(grid, width, height, start, end):
    """Find path between two points using BFS."""
    queue = deque([(start[0], start[1], [])])
    visited = {start}
    directions = ['UP', 'DOWN', 'LEFT', 'RIGHT']

    while queue:
        x, y, path = queue.popleft()
        if (x, y) == end:
            return path

        for direction in directions:
            if can_move(grid, x, y, direction, width, height):
                if direction == 'UP':
                    new_x, new_y = x, y - 1
                elif direction == 'DOWN':
                    new_x, new_y = x, y + 1
                elif direction == 'LEFT':
                    new_x, new_y = x - 1, y
                elif direction == 'RIGHT':
                    new_x, new_y = x + 1, y

                if (new_x, new_y) not in visited and 0 <= new_x < width and 0 <= new_y < height:
                    visited.add((new_x, new_y))
                    queue.append((new_x, new_y, path + [direction]))
    return None

def find_path_through_waypoints(grid, width, height, start, waypoints, goal):
    """Find a path from start through all reachable waypoints to goal."""
    all_points = [start] + waypoints + [goal]
    full_path = []
    current = start

    for next_point in all_points[1:]:
        segment = bfs_path(grid, width, height, current, next_point)
        if segment is None:
            # Skip unreachable waypoint, try to continue
            print(f"    Skipping unreachable waypoint {next_point}")
            continue
        full_path.extend(segment)
        current = next_point

    return full_path

def visualize_with_coords(maze):
    """Create ASCII visualization with coordinate labels."""
    grid = maze['grid']
    width = maze['width']
    height = maze['height']
    start = maze.get('start', {'x': 0, 'y': 0})
    goal = maze.get('goal', {'x': width-1, 'y': height-1})

    result = []

    # Column headers
    header = "    "
    for x in range(width):
        header += f" {x}  "
    result.append(header)

    # Top border
    top_line = "   +"
    for x in range(width):
        cell = grid[0][x]
        top_line += "---+" if cell['walls']['top'] else "   +"
    result.append(top_line)

    for y in range(height):
        content_line = f" {y} "
        for x in range(width):
            cell = grid[y][x]
            content_line += "|" if cell['walls']['left'] else " "
            if x == start['x'] and y == start['y']:
                content_line += " S "
            elif x == goal['x'] and y == goal['y']:
                content_line += " G "
            else:
                content_line += "   "
        content_line += "|" if grid[y][width-1]['walls']['right'] else " "
        result.append(content_line)

        bottom_line = "   +"
        for x in range(width):
            cell = grid[y][x]
            bottom_line += "---+" if cell['walls']['bottom'] else "   +"
        result.append(bottom_line)

    return '\n'.join(result)

# Load data
data = load_mazes('mazes.json')
mazes = get_all_mazes(data)

# Analyze each maze
for i, maze in enumerate(mazes):
    print("\n" + "=" * 70)
    print(f"MAZE {i+1}: {maze['id']}")
    print(f"Start: ({maze['start']['x']}, {maze['start']['y']})")
    print(f"Goal: ({maze['goal']['x']}, {maze['goal']['y']})")
    print(f"\nSpecial Instructions: {maze.get('specialInstructions', 'None')}")
    print(f"\n{visualize_with_coords(maze)}")

    # Find simple BFS path
    path = bfs_path(maze['grid'], maze['width'], maze['height'],
                   (maze['start']['x'], maze['start']['y']),
                   (maze['goal']['x'], maze['goal']['y']))
    print(f"\nSimple BFS path ({len(path)} moves): {path}")
