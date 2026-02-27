# Mock Script Assets

Reusable JSON assets for `MockProposer` / harness script runs.

## Files

- `mock_script_put_in_fridge.json`
- `mock_script_move_and_open.json`

## Example

From `adl-backend/`:

```bash
python -m tests.harness.pipeline_test_harness --proposer mock --mock-script ./tests/assets/mock_script_put_in_fridge.json --repeat 1 --warmup 0
```

