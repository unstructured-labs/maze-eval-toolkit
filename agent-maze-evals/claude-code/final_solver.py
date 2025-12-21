import json
from collections import deque

def load_mazes(filepath):
    with open(filepath, 'r') as f:
        return json.load(f)

def get_all_mazes(data):
    mazes = []
    for difficulty in ['simple', 'easy', 'medium', 'hard', 'expert']:
        if difficulty in data.get('mazes', {}):
            mazes.extend(data['mazes'][difficulty])
    return mazes

def can_move(grid, x, y, direction, width, height):
    if y < 0 or y >= height or x < 0 or x >= width:
        return False
    cell = grid[y][x]
    walls = cell['walls']
    moves = {'UP': 'top', 'DOWN': 'bottom', 'LEFT': 'left', 'RIGHT': 'right'}
    return not walls[moves[direction]]

def move(x, y, direction):
    deltas = {'UP': (0, -1), 'DOWN': (0, 1), 'LEFT': (-1, 0), 'RIGHT': (1, 0)}
    dx, dy = deltas[direction]
    return x + dx, y + dy

def bfs_path(grid, width, height, start, end):
    queue = deque([(start[0], start[1], [])])
    visited = {start}

    while queue:
        x, y, path = queue.popleft()
        if (x, y) == end:
            return path

        for direction in ['UP', 'DOWN', 'LEFT', 'RIGHT']:
            if can_move(grid, x, y, direction, width, height):
                new_x, new_y = move(x, y, direction)
                if (new_x, new_y) not in visited and 0 <= new_x < width and 0 <= new_y < height:
                    visited.add((new_x, new_y))
                    queue.append((new_x, new_y, path + [direction]))
    return None

def path_through_waypoints(grid, width, height, start, waypoints, goal):
    """Find path through waypoints, skipping unreachable ones."""
    all_points = [start] + waypoints + [goal]
    full_path = []
    current = start

    for target in all_points[1:]:
        segment = bfs_path(grid, width, height, current, target)
        if segment is not None:
            full_path.extend(segment)
            current = target

    # Make sure we reach the goal
    if current != goal:
        final = bfs_path(grid, width, height, current, goal)
        if final:
            full_path.extend(final)

    return full_path

def visualize_path(maze, path):
    """Show path on maze."""
    grid = maze['grid']
    width, height = maze['width'], maze['height']
    start, goal = maze['start'], maze['goal']

    visited = [[' ' for _ in range(width)] for _ in range(height)]
    x, y = start['x'], start['y']
    visited[y][x] = 'S'

    for i, m in enumerate(path):
        x, y = move(x, y, m)
        if x == goal['x'] and y == goal['y']:
            visited[y][x] = 'G'
        elif visited[y][x] == ' ':
            visited[y][x] = '*'

    result = ["     " + "".join(f" {i}  " for i in range(width))]
    result.append("   +" + "---+" * width)

    for yy in range(height):
        line = f" {yy} "
        for xx in range(width):
            cell = grid[yy][xx]
            line += "|" if cell['walls']['left'] else " "
            line += f" {visited[yy][xx]} "
        line += "|" if grid[yy][width-1]['walls']['right'] else " "
        result.append(line)
        result.append("   +" + "".join("---+" if grid[yy][xx]['walls']['bottom'] else "   +" for xx in range(width)))

    return '\n'.join(result)

# Load mazes
data = load_mazes('mazes.json')
mazes = get_all_mazes(data)
solutions = {}

# MAZE 1: ed380998-f161-4054-885f-2dd8f24d67b9
# Start: (6, 5), Goal: (7, 7)
# Special: Trace around the largest area shape
# The large wall structure is around (1,1)-(4,3) - need to visit cells adjacent to its perimeter
print("=" * 70)
print("MAZE 1: ed380998-f161-4054-885f-2dd8f24d67b9")
maze = mazes[0]
grid, w, h = maze['grid'], maze['width'], maze['height']
start = (maze['start']['x'], maze['start']['y'])
goal = (maze['goal']['x'], maze['goal']['y'])

# The large shape is bounded by walls at (1,1)-(3,3) area
# Perimeter cells around it (adjacent to walls):
# Top: (0,0), (1,0), (2,0), (3,0), (4,0)
# Right side: (4,1), (4,2), (4,3), (4,4)
# Bottom: (3,4), (2,4), (1,4), (0,4)
# Left: (0,3), (0,2), (0,1)
waypoints = [(5,5), (4,5), (3,5), (2,5), (1,5), (0,5), (0,4), (0,3), (0,2), (0,1), (0,0),
             (1,0), (2,0), (3,0), (4,0), (5,0), (6,0), (7,0), (7,1), (7,2), (7,3),
             (7,4), (7,5), (7,6)]
path = path_through_waypoints(grid, w, h, start, waypoints, goal)
solutions[maze['id']] = path
print(f"Path length: {len(path)}")
print(visualize_path(maze, path))

# MAZE 2: 826b9330-6a53-40bd-9079-8f7441a40bdc
# Start: (6, 7), Goal: (6, 3)
# Special: Visit cells around the letter "A" wall structure
# The A is formed by walls: legs at columns 1 and 3, crossbar around row 2-3
print("\n" + "=" * 70)
print("MAZE 2: 826b9330-6a53-40bd-9079-8f7441a40bdc")
maze = mazes[1]
grid, w, h = maze['grid'], maze['width'], maze['height']
start = (maze['start']['x'], maze['start']['y'])
goal = (maze['goal']['x'], maze['goal']['y'])

# The A structure is around x=1-3, y=1-5
# Cells around perimeter of A:
# Left of left leg: (0,1), (0,2), (0,3), (0,4), (0,5)
# Right of right leg: (4,1), (4,2), (4,3), (4,4), (4,5)
# Inside crossbar area: (2,3), (2,4)
waypoints = [(5,7), (4,7), (4,6), (4,5), (4,4), (4,3), (4,2), (4,1), (4,0),
             (3,0), (2,0), (1,0), (0,0), (0,1), (0,2), (0,3), (0,4), (0,5), (0,6),
             (1,6), (2,6), (3,6), (4,6), (5,6), (5,5), (5,4), (5,3)]
path = path_through_waypoints(grid, w, h, start, waypoints, goal)
solutions[maze['id']] = path
print(f"Path length: {len(path)}")
print(visualize_path(maze, path))

# MAZE 3: dd42ed41-c98b-45ed-8255-3940ce008646
# Start: (7, 0), Goal: (2, 5)
# Special: Find longest perimeter shape, trace around it
# The shape with longest perimeter is the rectangular structure at (1,1)-(4,1)
print("\n" + "=" * 70)
print("MAZE 3: dd42ed41-c98b-45ed-8255-3940ce008646")
maze = mazes[2]
grid, w, h = maze['grid'], maze['width'], maze['height']
start = (maze['start']['x'], maze['start']['y'])
goal = (maze['goal']['x'], maze['goal']['y'])

# Large rectangle at (1,1)-(4,1) - perimeter cells around it
# Top row: (0,0), (1,0), (2,0), (3,0), (4,0), (5,0)
# Bottom: (0,2), (1,2), (2,2), (3,2), (4,2), (5,2)
waypoints = [(6,0), (5,0), (4,0), (3,0), (2,0), (1,0), (0,0), (0,1), (0,2),
             (0,3), (0,4), (0,5), (0,6), (0,7), (1,7), (2,7), (3,7), (4,7), (5,7),
             (5,6), (5,5), (5,4), (4,4), (3,4), (3,5)]
path = path_through_waypoints(grid, w, h, start, waypoints, goal)
solutions[maze['id']] = path
print(f"Path length: {len(path)}")
print(visualize_path(maze, path))

# MAZE 4: bca39bb8-af0a-4d6b-b0da-e56a67d8cc5c
# Start: (1, 6), Goal: (6, 1)
# Special: Travel through diagonal zig-zag corridor
# The corridor runs from bottom-left to top-right in a zig-zag pattern
print("\n" + "=" * 70)
print("MAZE 4: bca39bb8-af0a-4d6b-b0da-e56a67d8cc5c")
maze = mazes[3]
grid, w, h = maze['grid'], maze['width'], maze['height']
start = (maze['start']['x'], maze['start']['y'])
goal = (maze['goal']['x'], maze['goal']['y'])

# The zig-zag corridor interior: follow the diagonal path
# Looking at walls: (1,5)-(2,5) corridor segment, (2,4)-(3,4), (3,3)-(4,3), (4,2)-(5,2), (5,1)-(6,1)
waypoints = [(1,5), (2,5), (2,4), (3,4), (3,3), (4,3), (4,2), (5,2), (5,1)]
path = path_through_waypoints(grid, w, h, start, waypoints, goal)
solutions[maze['id']] = path
print(f"Path length: {len(path)}")
print(visualize_path(maze, path))

# MAZE 5: 3b0fd997-552e-4648-a362-8688efe12e3c
# Start: (0, 0), Goal: (0, 1)
# Special: Enter square donut from bottom-right entrance, exit other side
# The donut is at (4,1)-(6,3) with entrances at bottom-right and top-left
print("\n" + "=" * 70)
print("MAZE 5: 3b0fd997-552e-4648-a362-8688efe12e3c")
maze = mazes[4]
grid, w, h = maze['grid'], maze['width'], maze['height']
start = (maze['start']['x'], maze['start']['y'])
goal = (maze['goal']['x'], maze['goal']['y'])

# Go right, enter donut from bottom right (around 7,4), go through, exit other side, return
# Donut inner: cells (5,2) area
# Bottom-right entrance seems to be at (7,4) going up into the donut
# Top exit at (4,1) area
waypoints = [(1,0), (2,0), (3,0), (4,0), (5,0), (6,0), (7,0), (7,1), (7,2), (7,3),
             (7,4), (6,4), (5,4), (4,4), (4,3), (4,2), (4,1), (5,1), (6,1),
             (6,2), (6,3), (5,3), (5,2), (4,2), (3,2), (3,1), (2,1), (1,1)]
path = path_through_waypoints(grid, w, h, start, waypoints, goal)
solutions[maze['id']] = path
print(f"Path length: {len(path)}")
print(visualize_path(maze, path))

# MAZE 6: 72e7d42e-31f3-44ec-ae12-4b47ab085fa7
# Start: (6, 3), Goal: (4, 3)
# Special: Visit corner tile by L-shape
# The L-shape is in bottom-left corner at (1,5)-(3,6)
# Corner tile is (0,7)
print("\n" + "=" * 70)
print("MAZE 6: 72e7d42e-31f3-44ec-ae12-4b47ab085fa7")
maze = mazes[5]
grid, w, h = maze['grid'], maze['width'], maze['height']
start = (maze['start']['x'], maze['start']['y'])
goal = (maze['goal']['x'], maze['goal']['y'])

# Go down to corner (0,7), then back up to goal
waypoints = [(7,3), (7,4), (7,5), (7,6), (7,7), (6,7), (5,7), (4,7), (3,7), (2,7), (1,7), (0,7),
             (0,6), (0,5), (0,4), (0,3), (0,2), (0,1), (0,0), (1,0), (2,0), (3,0), (3,1), (3,2), (3,3)]
path = path_through_waypoints(grid, w, h, start, waypoints, goal)
solutions[maze['id']] = path
print(f"Path length: {len(path)}")
print(visualize_path(maze, path))

# MAZE 7: fda7e6d7-42a8-4ed1-b712-3b7aa78371be
# Start: (1, 7), Goal: (7, 1)
# Special: Trace clockwise around 3x3 square at (1,1)-(3,3)
print("\n" + "=" * 70)
print("MAZE 7: fda7e6d7-42a8-4ed1-b712-3b7aa78371be")
maze = mazes[6]
grid, w, h = maze['grid'], maze['width'], maze['height']
start = (maze['start']['x'], maze['start']['y'])
goal = (maze['goal']['x'], maze['goal']['y'])

# Clockwise around the 3x3 square: start at top-left, go right, down, left, up
# Perimeter cells: (0,0)→(4,0)→(4,4)→(0,4)→(0,0)
# Go up to square, trace clockwise, then continue to goal
waypoints = [(0,7), (0,6), (0,5), (0,4), (0,3), (0,2), (0,1), (0,0),
             (1,0), (2,0), (3,0), (4,0), (4,1), (4,2), (4,3), (4,4),
             (4,5), (5,5), (5,4), (5,3), (5,2), (5,1), (6,1)]
path = path_through_waypoints(grid, w, h, start, waypoints, goal)
solutions[maze['id']] = path
print(f"Path length: {len(path)}")
print(visualize_path(maze, path))

# MAZE 8: def00088-bcc5-468d-9d85-656ddd412c21
# Start: (1, 7), Goal: (0, 7)
# Special: Walk up the upside-down staircase from bottom to top
# The staircase is on the right side, stepping from (6,5) up to (2,0) if viewed upside-down
print("\n" + "=" * 70)
print("MAZE 8: def00088-bcc5-468d-9d85-656ddd412c21")
maze = mazes[7]
grid, w, h = maze['grid'], maze['width'], maze['height']
start = (maze['start']['x'], maze['start']['y'])
goal = (maze['goal']['x'], maze['goal']['y'])

# The staircase: walls step down from left to right when viewed normally
# Upside down: steps go from right-bottom to left-top
# Walk along adjacent cells from bottom step to top step
# Looking at the pattern: vertical walls at x=6 y=0-5, x=5 y=1-4, x=4 y=2-3, etc.
# Adjacent cells to trace: start at bottom-right, go up stairs
waypoints = [(2,7), (3,7), (4,7), (5,7), (6,7), (7,7), (7,6), (7,5), (6,5),
             (6,4), (5,4), (5,3), (4,3), (4,2), (3,2), (3,1), (2,1), (2,0),
             (1,0), (0,0), (0,1), (0,2), (0,3), (0,4), (0,5), (0,6)]
path = path_through_waypoints(grid, w, h, start, waypoints, goal)
solutions[maze['id']] = path
print(f"Path length: {len(path)}")
print(visualize_path(maze, path))

# MAZE 9: 966ed09a-7729-4deb-8bef-afe1c3717127
# Start: (7, 0), Goal: (7, 7)
# Special: Climb vertical zig-zag column from bottom to top
# The zig-zag is at x=1-2, walls creating back-and-forth pattern
print("\n" + "=" * 70)
print("MAZE 9: 966ed09a-7729-4deb-8bef-afe1c3717127")
maze = mazes[8]
grid, w, h = maze['grid'], maze['width'], maze['height']
start = (maze['start']['x'], maze['start']['y'])
goal = (maze['goal']['x'], maze['goal']['y'])

# Zig-zag column at left side: need to go from bottom to top zig-zagging
# Go down through left column, zig-zagging between x=1 and x=2
# Then continue to goal on right
waypoints = [(6,0), (5,0), (4,0), (3,0), (2,0), (1,0), (0,0),
             (0,1), (1,1), (2,1), (2,2), (1,2), (0,2),
             (0,3), (1,3), (2,3), (2,4), (1,4), (0,4),
             (0,5), (1,5), (2,5), (2,6), (1,6), (0,6),
             (0,7), (1,7), (2,7), (3,7), (4,7), (5,7), (6,7)]
path = path_through_waypoints(grid, w, h, start, waypoints, goal)
solutions[maze['id']] = path
print(f"Path length: {len(path)}")
print(visualize_path(maze, path))

# MAZE 10: 97eac5d5-7b8f-44c8-9627-20787ae0f646
# Start: (7, 6), Goal: (7, 7)
# Special: Trace around the large square at (1,2)-(3,4)
print("\n" + "=" * 70)
print("MAZE 10: 97eac5d5-7b8f-44c8-9627-20787ae0f646")
maze = mazes[9]
grid, w, h = maze['grid'], maze['width'], maze['height']
start = (maze['start']['x'], maze['start']['y'])
goal = (maze['goal']['x'], maze['goal']['y'])

# Square perimeter: cells around (1,2)-(3,4)
# Adjacent cells: (0,1)-(4,1) on top, (0,5)-(4,5) on bottom, (0,2)-(0,4) left, (4,2)-(4,4) right
waypoints = [(6,6), (5,6), (4,6), (3,6), (2,6), (1,6), (0,6), (0,5), (0,4), (0,3), (0,2), (0,1),
             (0,0), (1,0), (2,0), (3,0), (4,0), (4,1), (4,2), (4,3), (4,4), (4,5),
             (5,5), (6,5), (7,5), (7,6)]
path = path_through_waypoints(grid, w, h, start, waypoints, goal)
solutions[maze['id']] = path
print(f"Path length: {len(path)}")
print(visualize_path(maze, path))

# Save solutions
with open('solution.json', 'w') as f:
    json.dump(solutions, f, indent=2)

print("\n" + "=" * 70)
print("All solutions saved to solution.json")
for maze_id, path in solutions.items():
    print(f"  {maze_id}: {len(path)} moves")
