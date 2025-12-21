import json

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

def visualize_maze(maze):
    """Create ASCII visualization of the maze."""
    grid = maze['grid']
    width = maze['width']
    height = maze['height']
    start = maze.get('start', {'x': 0, 'y': 0})
    goal = maze.get('goal', {'x': width-1, 'y': height-1})

    # Create a character-based representation
    # Each cell becomes a 3x2 area: top border and interior

    result = []

    # Top border of the maze
    top_line = ""
    for x in range(width):
        cell = grid[0][x]
        top_line += "+"
        if cell['walls']['top']:
            top_line += "---"
        else:
            top_line += "   "
    top_line += "+"
    result.append(top_line)

    for y in range(height):
        # Cell contents line
        content_line = ""
        for x in range(width):
            cell = grid[y][x]
            if cell['walls']['left']:
                content_line += "|"
            else:
                content_line += " "

            # Cell content
            if x == start['x'] and y == start['y']:
                content_line += " S "
            elif x == goal['x'] and y == goal['y']:
                content_line += " G "
            else:
                content_line += "   "

        # Right border of last cell
        if grid[y][width-1]['walls']['right']:
            content_line += "|"
        else:
            content_line += " "
        result.append(content_line)

        # Bottom border line
        bottom_line = ""
        for x in range(width):
            cell = grid[y][x]
            bottom_line += "+"
            if cell['walls']['bottom']:
                bottom_line += "---"
            else:
                bottom_line += "   "
        bottom_line += "+"
        result.append(bottom_line)

    return "\n".join(result)

def visualize_walls_only(maze):
    """Create a simple grid showing wall blocks."""
    grid = maze['grid']
    width = maze['width']
    height = maze['height']
    start = maze.get('start', {'x': 0, 'y': 0})
    goal = maze.get('goal', {'x': width-1, 'y': height-1})

    # Create a 2*width+1 x 2*height+1 grid for walls
    w = 2 * width + 1
    h = 2 * height + 1
    visual = [[' ' for _ in range(w)] for _ in range(h)]

    # Fill in corners
    for y in range(height + 1):
        for x in range(width + 1):
            visual[y * 2][x * 2] = '+'

    # Fill in horizontal walls
    for y in range(height):
        for x in range(width):
            cell = grid[y][x]
            if cell['walls']['top']:
                visual[y * 2][x * 2 + 1] = '-'
            if cell['walls']['bottom']:
                visual[(y + 1) * 2][x * 2 + 1] = '-'

    # Fill in vertical walls
    for y in range(height):
        for x in range(width):
            cell = grid[y][x]
            if cell['walls']['left']:
                visual[y * 2 + 1][x * 2] = '|'
            if cell['walls']['right']:
                visual[y * 2 + 1][(x + 1) * 2] = '|'

    # Mark start and goal
    visual[start['y'] * 2 + 1][start['x'] * 2 + 1] = 'S'
    visual[goal['y'] * 2 + 1][goal['x'] * 2 + 1] = 'G'

    return '\n'.join(''.join(row) for row in visual)

data = load_mazes('mazes.json')
mazes = get_all_mazes(data)

for i, maze in enumerate(mazes):
    print(f"\n{'='*60}")
    print(f"Maze {i+1}: {maze['id']}")
    print(f"Start: ({maze['start']['x']}, {maze['start']['y']}), Goal: ({maze['goal']['x']}, {maze['goal']['y']})")
    print(f"\nSPECIAL INSTRUCTIONS: {maze.get('specialInstructions', 'None')}")
    print(f"\nVisualization:")
    print(visualize_maze(maze))
    print()
