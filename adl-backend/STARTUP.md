# Backend Startup and Validation

## 1) Install dependencies

```powershell
pip install -r adl-backend/requirements.txt
```

## 2) Configure env

Copy `adl-backend/.env.example` to `adl-backend/.env` and set values.

Key switches:

- `LLM_MODE=mock|deepseek|disabled`
- `LLM_MOCK_SCENARIO=valid_json|invalid_json`
- `REASONING_V2_PROPOSER=mock|v1`
- `REASONING_PIPELINE=v1|v2`

## 3) Start backend

```powershell
python adl-backend/app.py --pipeline v2 --proposer mock --mode INSTRUCT --json --brief
```

Optional LLM switches from CLI:

```powershell
python adl-backend/app.py --pipeline v1 --llm-mode mock --llm-mock-scenario valid_json --json --brief
```

## 4) V1 LLM chain smoke test

```powershell
python adl-backend/v1_llm_smoke.py
```

Strict deepseek mode check:

```powershell
python adl-backend/v1_llm_smoke.py --strict-deepseek
```

## 5) Lightweight concurrency stress test

Run backend first, then:

```powershell
python adl-backend/tick_concurrency_stress.py --url http://127.0.0.1:8001 --concurrency 10 --rounds 2
```

