I ran claude-code, gemini-cli and codex (gpt-5.2-codex) on the custom maze test set on Dec. 20, 2025.

# Results

## Codex

Ran for 15m 27s.

```sh
────────────────────────────────────────────────────────────────────────────────────────────────────
   #  Difficulty   Outcome               Steps  Valid Shortest   Goal Efficiency
────────────────────────────────────────────────────────────────────────────────────────────────────
   1  easy         success                  33     33       33    Yes     100.0%
   2  easy         success                  34     34       34    Yes     100.0%
   3  easy         constraint_violated      22     22       26    Yes          -
   4  easy         success                  26     26       14    Yes      53.8%
   5  easy         constraint_violated      35     35       25    Yes          -
   6  easy         success                  20     20       20    Yes     100.0%
   7  easy         success                  40     40       34    Yes      85.0%
   8  easy         success                  33     33       29    Yes      87.9%
   9  easy         constraint_violated      43     43       37    Yes          -
  10  easy         constraint_violated      25     25       25    Yes          -

────────────────────────────────────────────────────────────────────────────────────────────────────
Summary
Total: 10
Successes: 6 (60.0%)
Failures: 0
Invalid Moves: 0
Constraint Violations: 4
No Path Found: 0
```

## Claude Code

Ran for about ~10 minutes.

```sh
────────────────────────────────────────────────────────────────────────────────────────────────────
   #  Difficulty   Outcome               Steps  Valid Shortest   Goal Efficiency
────────────────────────────────────────────────────────────────────────────────────────────────────
   1  easy         constraint_violated      33     33       33    Yes          -
   2  easy         constraint_violated      44     44       34    Yes          -
   3  easy         constraint_violated      26     26       26    Yes          -
   4  easy         constraint_violated      40     40       14    Yes          -
   5  easy         success                  37     37       25    Yes      67.6%
   6  easy         success                  28     28       20    Yes      71.4%
   7  easy         success                  34     34       34    Yes     100.0%
   8  easy         constraint_violated      29     29       29    Yes          -
   9  easy         constraint_violated      79     79       37    Yes          -
  10  easy         constraint_violated      33     33       25    Yes          -

────────────────────────────────────────────────────────────────────────────────────────────────────
Summary
Total: 10
Successes: 3 (30.0%)
Failures: 0
Invalid Moves: 0
Constraint Violations: 7
No Path Found: 0
```

## Gemini CLI

```sh
Session Stats

Interaction Summary
Session ID:                 696b07f3-b5ee-43aa-ba56-1f4368823ad1
Tool Calls:                 15 ( ✓ 14 x 1 )
Success Rate:               93.3%
User Agreement:             100.0% (14 reviewed)
Code Changes:               +395 -1

Performance
Wall Time:                  9m 5s
Agent Active:               5m 18s
  » API Time:               2m 38s (49.8%)
  » Tool Time:              2m 39s (50.2%)
```

```sh
────────────────────────────────────────────────────────────────────────────────────────────────────
   #  Difficulty   Outcome               Steps  Valid Shortest   Goal Efficiency
────────────────────────────────────────────────────────────────────────────────────────────────────
   1  easy         invalid_move             42      0       33     No          -
   2  easy         invalid_move             35      0       34     No          -
   3  easy         invalid_move             21      0       26     No          -
   4  easy         constraint_violated      14     14       14    Yes          -
   5  easy         constraint_violated       5      5       25    Yes          -
   6  easy         constraint_violated       8      8       20    Yes          -
   7  easy         invalid_move             33      0       34    Yes          -
   8  easy         constraint_violated       5      5       29    Yes          -
   9  easy         constraint_violated      11     11       37    Yes          -
  10  easy         invalid_move             24      7       25     No          -

────────────────────────────────────────────────────────────────────────────────────────────────────
Summary
Total: 10
Successes: 0 (0.0%)
Failures: 0
Invalid Moves: 5
Constraint Violations: 5
No Path Found: 0
```