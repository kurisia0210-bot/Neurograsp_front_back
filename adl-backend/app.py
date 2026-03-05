from __future__ import annotations

import argparse
import importlib
import os
from typing import Optional

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from schema.payload import AgentStepResponse, ObservationPayload

app = FastAPI()
_agent_module = None


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {"status": "COALA Agent System Online"}


def _load_agent_module():
    global _agent_module
    if _agent_module is None:
        _agent_module = importlib.import_module("core.agent")
    return _agent_module


@app.post("/api/tick", response_model=AgentStepResponse)
async def tick(obs: ObservationPayload):
    agent = _load_agent_module()
    return await agent.step(obs)


def _set_env_if_provided(name: str, value: Optional[str]) -> None:
    if value is not None:
        os.environ[name] = value


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run COALA backend server with CLI options.")
    parser.add_argument("--host", default="127.0.0.1", help="Server host (default: 127.0.0.1)")
    parser.add_argument("--port", type=int, default=8001, help="Server port (default: 8001)")

    parser.add_argument("--proposer", choices=["mock", "llm"], help="Reasoning proposer strategy")
    parser.add_argument("--mode", choices=["INSTRUCT", "ACT"], help="Reasoning execution mode")
    parser.add_argument("--mock-script", help="Path to mock script json")
    parser.add_argument("--llm-mode", choices=["mock", "deepseek", "disabled"], help="LLM runtime mode")
    parser.add_argument(
        "--llm-mock-scenario",
        choices=["valid_json", "invalid_json"],
        help="Mock LLM scenario when --llm-mode mock",
    )

    parser.add_argument(
        "--json",
        action="store_true",
        help="Enable one-line JSON step summary (STEP_SUMMARY_JSON=true).",
    )
    parser.add_argument(
        "--no-json",
        action="store_true",
        help="Disable one-line JSON step summary (STEP_SUMMARY_JSON=false).",
    )
    parser.add_argument(
        "--pretty",
        action="store_true",
        help="Enable pretty step summary output (STEP_SUMMARY_PRETTY=true).",
    )
    parser.add_argument(
        "--brief",
        action="store_true",
        help="Enable brief step summary output (STEP_SUMMARY_BRIEF=true).",
    )
    parser.add_argument(
        "--no-brief",
        action="store_true",
        help="Disable brief step summary output (STEP_SUMMARY_BRIEF=false).",
    )
    return parser.parse_args()


def _apply_cli_env(args: argparse.Namespace) -> None:
    _set_env_if_provided("REASONING_PROPOSER", args.proposer)
    _set_env_if_provided("REASONING_EXECUTION_MODE", args.mode)
    _set_env_if_provided("REASONING_MOCK_SCRIPT", args.mock_script)
    _set_env_if_provided("LLM_MODE", args.llm_mode)
    _set_env_if_provided("LLM_MOCK_SCENARIO", args.llm_mock_scenario)

    if args.json and args.no_json:
        raise ValueError("--json and --no-json cannot be used together.")
    if args.brief and args.no_brief:
        raise ValueError("--brief and --no-brief cannot be used together.")

    if args.json:
        os.environ["STEP_SUMMARY_JSON"] = "true"
    if args.no_json:
        os.environ["STEP_SUMMARY_JSON"] = "false"
    if args.pretty:
        os.environ["STEP_SUMMARY_PRETTY"] = "true"
    if args.brief:
        os.environ["STEP_SUMMARY_BRIEF"] = "true"
    if args.no_brief:
        os.environ["STEP_SUMMARY_BRIEF"] = "false"


if __name__ == "__main__":
    args = _parse_args()
    _apply_cli_env(args)
    print("COALA I/O Layer Starting with CLI options...")
    uvicorn.run(app, host=args.host, port=args.port)
