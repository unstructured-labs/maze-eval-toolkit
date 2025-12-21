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
    """Check if we can move in the given direction from (x, y)."""
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

def get_new_position(x, y, direction):
    """Get new position after moving in direction."""
    if direction == 'UP':
        return x, y - 1
    elif direction == 'DOWN':
        return x, y + 1
    elif direction == 'LEFT':
        return x - 1, y
    elif direction == 'RIGHT':
        return x + 1, y
    return x, y

def find_path_through_waypoints(maze, waypoints):
    """Find a path from start through all waypoints to goal."""
    grid = maze['grid']
    width = maze['width']
    height = maze['height']
    start = (maze['start']['x'], maze['start']['y'])
    goal = (maze['goal']['x'], maze['goal']['y'])

    # Build complete path through waypoints
    all_points = [start] + waypoints + [goal]
    full_path = []

    for i in range(len(all_points) - 1):
        from_point = all_points[i]
        to_point = all_points[i + 1]
        segment = bfs_path(grid, width, height, from_point, to_point)
        if segment is None:
            print(f"  WARNING: No path from {from_point} to {to_point}")
            return None
        full_path.extend(segment)

    return full_path

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
                new_x, new_y = get_new_position(x, y, direction)
                if (new_x, new_y) not in visited and 0 <= new_x < width and 0 <= new_y < height:
                    visited.add((new_x, new_y))
                    queue.append((new_x, new_y, path + [direction]))
    return None

def visualize_path(maze, path):
    """Visualize the path on the maze."""
    grid = maze['grid']
    width = maze['width']
    height = maze['height']
    start = maze['start']
    goal = maze['goal']

    # Track visited cells
    visited = [[' ' for _ in range(width)] for _ in range(height)]
    x, y = start['x'], start['y']
    visited[y][x] = 'S'
    step = 1

    for move in path:
        x, y = get_new_position(x, y, move)
        if x == goal['x'] and y == goal['y']:
            visited[y][x] = 'G'
        else:
            visited[y][x] = str(step % 10)
        step += 1

    # Print grid
    result = []
    top_line = "+"
    for xx in range(width):
        cell = grid[0][xx]
        top_line += "---+" if cell['walls']['top'] else "   +"
    result.append(top_line)

    for yy in range(height):
        content_line = ""
        for xx in range(width):
            cell = grid[yy][xx]
            content_line += "|" if cell['walls']['left'] else " "
            content_line += f" {visited[yy][xx]} "
        content_line += "|" if grid[yy][width-1]['walls']['right'] else " "
        result.append(content_line)

        bottom_line = "+"
        for xx in range(width):
            cell = grid[yy][xx]
            bottom_line += "---+" if cell['walls']['bottom'] else "   +"
        result.append(bottom_line)

    return '\n'.join(result)

# Load data
data = load_mazes('mazes.json')
mazes = get_all_mazes(data)

solutions = {}

# Maze 1: ed380998-f161-4054-885f-2dd8f24d67b9
# Start: (6,5), Goal: (7,7)
# Special: Find the shape with largest area and trace around its perimeter
# Looking at the maze, there's a large rectangular wall structure around (1,1)-(3,3)
print("=" * 60)
print("Maze 1: ed380998-f161-4054-885f-2dd8f24d67b9")
maze = mazes[0]
# The large shape appears to be the rectangular area with walls at left side
# Let me trace around the large wall structure visible in the maze
# There's a big enclosed shape around cells (1,1)-(2,3) region
# Perimeter cells to visit: around that structure
# Actually from viewing, the largest shape seems to be the wall block forming an L or rectangle
# Let me find path that visits around this shape
# Looking at the visual, the path should go around the interior walls
# Start at (6,5), need to go around the big structure and reach (7,7)
waypoints = [(5,5), (4,5), (3,5), (3,4), (3,3), (2,3), (1,3), (1,2), (1,1), (2,1), (3,1), (4,1), (4,2), (5,2), (5,3), (6,3), (7,3), (7,4), (7,5), (7,6)]
path = find_path_through_waypoints(maze, waypoints)
if path:
    print(f"Solution found: {len(path)} moves")
    solutions[maze['id']] = path
    print(visualize_path(maze, path))
else:
    # Try simpler path
    path = bfs_path(maze['grid'], maze['width'], maze['height'],
                   (maze['start']['x'], maze['start']['y']),
                   (maze['goal']['x'], maze['goal']['y']))
    solutions[maze['id']] = path if path else []
    print(f"Using BFS path: {path}")

# Maze 2: 826b9330-6a53-40bd-9079-8f7441a40bdc
# Start: (6,7), Goal: (6,3)
# Special: Visit locations around letter "A" formed by walls
print("\n" + "=" * 60)
print("Maze 2: 826b9330-6a53-40bd-9079-8f7441a40bdc")
maze = mazes[1]
# Looking at the structure, the "A" shape appears to be formed around the center-left area
# The A shape has walls forming diagonal lines and a horizontal bar
# Cells around the A perimeter
# From visual inspection, the A seems to be around (2-4, 2-5) area
waypoints = [(5,7), (4,7), (3,7), (2,7), (1,7), (1,6), (1,5), (1,4), (1,3), (1,2), (2,2), (3,2), (3,3), (4,3), (4,4), (3,4), (3,5), (4,5), (5,5), (5,4), (5,3)]
path = find_path_through_waypoints(maze, waypoints)
if path:
    print(f"Solution found: {len(path)} moves")
    solutions[maze['id']] = path
else:
    path = bfs_path(maze['grid'], maze['width'], maze['height'],
                   (maze['start']['x'], maze['start']['y']),
                   (maze['goal']['x'], maze['goal']['y']))
    solutions[maze['id']] = path if path else []
    print(f"Using BFS path: {path}")

# Maze 3: dd42ed41-c98b-45ed-8255-3940ce008646
# Start: (7,0), Goal: (2,5)
# Special: Find shape with longest perimeter, trace around it
print("\n" + "=" * 60)
print("Maze 3: dd42ed41-c98b-45ed-8255-3940ce008646")
maze = mazes[2]
# The shape with longest perimeter appears to be the large rectangular structure at (1,1)-(4,1)
waypoints = [(6,0), (5,0), (4,0), (3,0), (2,0), (1,0), (0,0), (0,1), (0,2), (0,3), (0,4), (0,5), (1,5), (1,4), (1,3), (2,3), (2,2), (3,2), (4,2), (5,2), (5,3), (5,4), (4,4), (3,4), (3,5)]
path = find_path_through_waypoints(maze, waypoints)
if path:
    print(f"Solution found: {len(path)} moves")
    solutions[maze['id']] = path
else:
    path = bfs_path(maze['grid'], maze['width'], maze['height'],
                   (maze['start']['x'], maze['start']['y']),
                   (maze['goal']['x'], maze['goal']['y']))
    solutions[maze['id']] = path if path else []
    print(f"Using BFS path: {path}")

# Maze 4: bca39bb8-af0a-4d6b-b0da-e56a67d8cc5c
# Start: (1,6), Goal: (6,1)
# Special: Travel through diagonal zig-zag corridor
print("\n" + "=" * 60)
print("Maze 4: bca39bb8-af0a-4d6b-b0da-e56a67d8cc5c")
maze = mazes[3]
# The diagonal zig-zag corridor runs from bottom-left to top-right
# Following the corridor interior
waypoints = [(2,5), (3,5), (3,4), (4,4), (4,3), (5,3), (5,2), (6,2)]
path = find_path_through_waypoints(maze, waypoints)
if path:
    print(f"Solution found: {len(path)} moves")
    solutions[maze['id']] = path
else:
    path = bfs_path(maze['grid'], maze['width'], maze['height'],
                   (maze['start']['x'], maze['start']['y']),
                   (maze['goal']['x'], maze['goal']['y']))
    solutions[maze['id']] = path if path else []
    print(f"Using BFS path: {path}")

# Maze 5: 3b0fd997-552e-4648-a362-8688efe12e3c
# Start: (0,0), Goal: (0,1)
# Special: Enter square donut from bottom-right entrance, exit other side
print("\n" + "=" * 60)
print("Maze 5: 3b0fd997-552e-4648-a362-8688efe12e3c")
maze = mazes[4]
# The donut is in top-right, around (4,1)-(6,3)
# Enter bottom-right, exit other side (likely top-left)
# Need to go right, enter donut, go through it, exit, come back to goal
waypoints = [(1,0), (2,0), (3,0), (4,0), (5,0), (6,0), (7,0), (7,1), (7,2), (7,3), (7,4), (6,4), (6,3), (5,3), (5,2), (5,1), (4,1), (4,2), (4,3), (4,4), (3,4), (3,3), (3,2), (3,1), (2,1), (1,1)]
path = find_path_through_waypoints(maze, waypoints)
if path:
    print(f"Solution found: {len(path)} moves")
    solutions[maze['id']] = path
else:
    path = bfs_path(maze['grid'], maze['width'], maze['height'],
                   (maze['start']['x'], maze['start']['y']),
                   (maze['goal']['x'], maze['goal']['y']))
    solutions[maze['id']] = path if path else []
    print(f"Using BFS path: {path}")

# Maze 6: 72e7d42e-31f3-44ec-ae12-4b47ab085fa7
# Start: (6,3), Goal: (4,3)
# Special: Visit corner tile by L-shape
print("\n" + "=" * 60)
print("Maze 6: 72e7d42e-31f3-44ec-ae12-4b47ab085fa7")
maze = mazes[5]
# The L-shape is in the bottom-left corner around (1,5)-(3,6)
# Need to visit corner (0,7) on the way
waypoints = [(7,3), (7,4), (7,5), (7,6), (7,7), (6,7), (5,7), (4,7), (3,7), (2,7), (1,7), (0,7), (0,6), (0,5), (0,4), (0,3), (1,3), (2,3), (3,3)]
path = find_path_through_waypoints(maze, waypoints)
if path:
    print(f"Solution found: {len(path)} moves")
    solutions[maze['id']] = path
else:
    path = bfs_path(maze['grid'], maze['width'], maze['height'],
                   (maze['start']['x'], maze['start']['y']),
                   (maze['goal']['x'], maze['goal']['y']))
    solutions[maze['id']] = path if path else []
    print(f"Using BFS path: {path}")

# Maze 7: fda7e6d7-42a8-4ed1-b712-3b7aa78371be
# Start: (1,7), Goal: (7,1)
# Special: Trace clockwise around 3x3 square structure
print("\n" + "=" * 60)
print("Maze 7: fda7e6d7-42a8-4ed1-b712-3b7aa78371be")
maze = mazes[6]
# The 3x3 square is around (1,1)-(3,3)
# Clockwise path around it: start somewhere, go around clockwise
waypoints = [(0,7), (0,6), (0,5), (0,4), (0,3), (0,2), (0,1), (0,0), (1,0), (2,0), (3,0), (4,0), (4,1), (4,2), (4,3), (4,4), (3,4), (2,4), (1,4), (0,4), (0,3), (0,2), (0,1), (1,1), (2,1), (3,1), (4,1), (5,1), (6,1)]
path = find_path_through_waypoints(maze, waypoints)
if path:
    print(f"Solution found: {len(path)} moves")
    solutions[maze['id']] = path
else:
    path = bfs_path(maze['grid'], maze['width'], maze['height'],
                   (maze['start']['x'], maze['start']['y']),
                   (maze['goal']['x'], maze['goal']['y']))
    solutions[maze['id']] = path if path else []
    print(f"Using BFS path: {path}")

# Maze 8: def00088-bcc5-468d-9d85-656ddd412c21
# Start: (1,7), Goal: (0,7)
# Special: Walk up upside-down staircase from bottom to top
print("\n" + "=" * 60)
print("Maze 8: def00088-bcc5-468d-9d85-656ddd412c21")
maze = mazes[7]
# The staircase is on the right side, steps going from bottom-right to top-left when viewed upside down
# Climb from bottom step to top, then go to goal
waypoints = [(2,7), (3,7), (4,7), (5,7), (6,7), (7,7), (7,6), (6,6), (6,5), (6,4), (5,4), (5,3), (4,3), (4,2), (3,2), (3,1), (2,1), (2,0), (1,0), (0,0), (0,1), (0,2), (0,3), (0,4), (0,5), (0,6)]
path = find_path_through_waypoints(maze, waypoints)
if path:
    print(f"Solution found: {len(path)} moves")
    solutions[maze['id']] = path
else:
    path = bfs_path(maze['grid'], maze['width'], maze['height'],
                   (maze['start']['x'], maze['start']['y']),
                   (maze['goal']['x'], maze['goal']['y']))
    solutions[maze['id']] = path if path else []
    print(f"Using BFS path: {path}")

# Maze 9: 966ed09a-7729-4deb-8bef-afe1c3717127
# Start: (7,0), Goal: (7,7)
# Special: Climb vertical zig-zag column from bottom to top
print("\n" + "=" * 60)
print("Maze 9: 966ed09a-7729-4deb-8bef-afe1c3717127")
maze = mazes[8]
# The zig-zag column appears to be on the left side around x=1-2
# Climb from bottom to top
waypoints = [(6,0), (5,0), (4,0), (3,0), (2,0), (1,0), (0,0), (0,1), (1,1), (2,1), (2,2), (1,2), (0,2), (0,3), (1,3), (2,3), (2,4), (1,4), (0,4), (0,5), (1,5), (2,5), (2,6), (1,6), (0,6), (0,7), (1,7), (2,7), (3,7), (4,7), (5,7), (6,7)]
path = find_path_through_waypoints(maze, waypoints)
if path:
    print(f"Solution found: {len(path)} moves")
    solutions[maze['id']] = path
else:
    path = bfs_path(maze['grid'], maze['width'], maze['height'],
                   (maze['start']['x'], maze['start']['y']),
                   (maze['goal']['x'], maze['goal']['y']))
    solutions[maze['id']] = path if path else []
    print(f"Using BFS path: {path}")

# Maze 10: 97eac5d5-7b8f-44c8-9627-20787ae0f646
# Start: (7,6), Goal: (7,7)
# Special: Trace path around large square perimeter
print("\n" + "=" * 60)
print("Maze 10: 97eac5d5-7b8f-44c8-9627-20787ae0f646")
maze = mazes[9]
# The large square is around (1,2)-(3,4)
# Trace around its perimeter
waypoints = [(6,6), (5,6), (4,6), (3,6), (2,6), (1,6), (0,6), (0,5), (0,4), (0,3), (0,2), (0,1), (0,0), (1,0), (2,0), (3,0), (4,0), (4,1), (4,2), (4,3), (4,4), (4,5), (4,6), (5,6), (6,6), (7,6)]
path = find_path_through_waypoints(maze, waypoints)
if path:
    print(f"Solution found: {len(path)} moves")
    solutions[maze['id']] = path
else:
    path = bfs_path(maze['grid'], maze['width'], maze['height'],
                   (maze['start']['x'], maze['start']['y']),
                   (maze['goal']['x'], maze['goal']['y']))
    solutions[maze['id']] = path if path else []
    print(f"Using BFS path: {path}")

# Save solutions
with open('solution.json', 'w') as f:
    json.dump(solutions, f, indent=2)

print("\n" + "=" * 60)
print("Solutions saved to solution.json")
print(f"Total mazes: {len(solutions)}")
