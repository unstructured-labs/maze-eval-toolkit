import json
from collections import deque

def load_mazes(filepath):
    """Load mazes from JSON file."""
    with open(filepath, 'r') as f:
        data = json.load(f)
    return data

def get_all_mazes(data):
    """Extract all mazes from the data structure."""
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

def solve_maze_bfs(maze):
    """Solve maze using BFS and return the move sequence."""
    grid = maze['grid']
    width = maze['width']
    height = maze['height']

    # Find start and end
    start = maze.get('start', {'x': 0, 'y': 0})
    end = maze.get('end', {'x': width - 1, 'y': height - 1})

    start_x, start_y = start['x'], start['y']
    end_x, end_y = end['x'], end['y']

    # BFS
    queue = deque([(start_x, start_y, [])])
    visited = {(start_x, start_y)}

    directions = ['UP', 'DOWN', 'LEFT', 'RIGHT']

    while queue:
        x, y, path = queue.popleft()

        if x == end_x and y == end_y:
            return path

        for direction in directions:
            if can_move(grid, x, y, direction, width, height):
                new_x, new_y = get_new_position(x, y, direction)
                if (new_x, new_y) not in visited and 0 <= new_x < width and 0 <= new_y < height:
                    visited.add((new_x, new_y))
                    queue.append((new_x, new_y, path + [direction]))

    return None  # No solution found

def parse_special_instructions(maze):
    """Parse and return special instructions from maze prompts."""
    instructions = {}
    if 'prompts' in maze:
        for prompt in maze['prompts']:
            if 'specialInstructions' in prompt:
                instructions['special'] = prompt['specialInstructions']
            if 'content' in prompt:
                instructions['content'] = prompt['content']
    return instructions

def main():
    # Load data
    data = load_mazes('mazes.json')
    mazes = get_all_mazes(data)

    print(f"Found {len(mazes)} mazes to solve\n")

    solutions = {}

    for maze in mazes:
        maze_id = maze['id']
        difficulty = maze.get('difficulty', 'unknown')
        width = maze['width']
        height = maze['height']

        print(f"Processing maze: {maze_id}")
        print(f"  Difficulty: {difficulty}, Size: {width}x{height}")

        # Check for special instructions
        instructions = parse_special_instructions(maze)
        if instructions.get('special'):
            print(f"  Special instructions: {instructions['special']}")

        # Solve the maze
        solution = solve_maze_bfs(maze)

        if solution:
            print(f"  Solution found: {len(solution)} moves")
            solutions[maze_id] = solution
        else:
            print(f"  No solution found!")
            solutions[maze_id] = []

        print()

    # Output solutions
    with open('solution.json', 'w') as f:
        json.dump(solutions, f, indent=2)

    print(f"Solutions saved to solution.json")
    print(f"Total mazes solved: {len(solutions)}")

if __name__ == '__main__':
    main()
