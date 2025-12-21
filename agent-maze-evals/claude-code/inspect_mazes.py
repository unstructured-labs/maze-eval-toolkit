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

data = load_mazes('mazes.json')
mazes = get_all_mazes(data)

for i, maze in enumerate(mazes):
    print(f"\n{'='*60}")
    print(f"Maze {i+1}: {maze['id']}")
    print(f"Difficulty: {maze.get('difficulty')}")
    print(f"Size: {maze['width']}x{maze['height']}")
    print(f"Start: {maze.get('start')}")
    print(f"Goal: {maze.get('goal')}")

    # Check special instructions at maze level
    if 'specialInstructions' in maze:
        print(f"\nSPECIAL INSTRUCTIONS: {maze['specialInstructions']}")

    if 'prompts' in maze:
        print(f"\nNumber of prompts: {len(maze['prompts'])}")
        for j, prompt in enumerate(maze['prompts']):
            if isinstance(prompt, str):
                print(f"\n  Prompt {j+1} (string):")
                print(f"    Preview: {prompt[:300]}...")
            else:
                print(f"\n  Prompt {j+1} keys: {list(prompt.keys())}")
