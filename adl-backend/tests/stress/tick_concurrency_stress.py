from __future__ import annotations

import argparse
import asyncio
import statistics
import time
from dataclasses import dataclass
from typing import List

import httpx


@dataclass
class RequestResult:
    ok: bool
    status_code: int
    latency_ms: float
    detail: str


def _make_payload(step_id: int) -> dict:
    return {
        "session_id": f"stress-session-{step_id}",
        "episode_id": 1,
        "step_id": step_id,
        "timestamp": time.time(),
        "agent": {"location": "table_center", "holding": None},
        "nearby_objects": [
            {"id": "red_cube", "state": "on_table", "relation": "on table_surface"},
            {"id": "fridge_door", "state": "closed", "relation": "front"},
            {"id": "fridge_main", "state": "installed", "relation": "storage"},
            {"id": "table_surface", "state": "installed", "relation": "surface"},
            {"id": "stove", "state": "installed", "relation": "appliance"},
        ],
        "global_task": "Put red cube in fridge",
        "last_action": None,
        "last_result": None,
    }


async def _send_tick(client: httpx.AsyncClient, url: str, step_id: int) -> RequestResult:
    payload = _make_payload(step_id)
    started = time.perf_counter()
    try:
        resp = await client.post(url, json=payload)
        latency_ms = (time.perf_counter() - started) * 1000.0
        if resp.status_code != 200:
            return RequestResult(False, resp.status_code, latency_ms, resp.text[:200])
        return RequestResult(True, resp.status_code, latency_ms, "OK")
    except Exception as exc:
        latency_ms = (time.perf_counter() - started) * 1000.0
        return RequestResult(False, 0, latency_ms, str(exc))


def _p95(values: List[float]) -> float:
    if not values:
        return 0.0
    if len(values) == 1:
        return values[0]
    return statistics.quantiles(values, n=100, method="inclusive")[94]


async def _main_async(args: argparse.Namespace) -> int:
    url = args.url.rstrip("/") + "/api/tick"
    timeout = httpx.Timeout(args.timeout_seconds)
    all_results: List[RequestResult] = []

    async with httpx.AsyncClient(timeout=timeout) as client:
        step_seed = 1
        for _ in range(args.rounds):
            tasks = [
                _send_tick(client, url, step_seed + i)
                for i in range(args.concurrency)
            ]
            round_results = await asyncio.gather(*tasks)
            all_results.extend(round_results)
            step_seed += args.concurrency

    ok_results = [r for r in all_results if r.ok]
    fail_results = [r for r in all_results if not r.ok]
    latencies = [r.latency_ms for r in ok_results]

    print("[TickConcurrencyStress]")
    print(
        f"total={len(all_results)} ok={len(ok_results)} fail={len(fail_results)} "
        f"concurrency={args.concurrency} rounds={args.rounds}"
    )
    if latencies:
        print(
            "latency_ms "
            f"min={min(latencies):.2f} "
            f"p50={statistics.median(latencies):.2f} "
            f"p95={_p95(latencies):.2f} "
            f"max={max(latencies):.2f}"
        )

    if fail_results:
        for idx, item in enumerate(fail_results[:5], start=1):
            print(
                f"FAIL[{idx}] status={item.status_code} latency_ms={item.latency_ms:.2f} detail={item.detail!r}"
            )
        return 1
    return 0


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Lightweight concurrent /api/tick stress test.")
    parser.add_argument("--url", default="http://127.0.0.1:8001", help="Backend base URL")
    parser.add_argument("--concurrency", type=int, default=10, help="Concurrent requests per round")
    parser.add_argument("--rounds", type=int, default=2, help="How many rounds to run")
    parser.add_argument("--timeout-seconds", type=float, default=20.0, help="HTTP timeout per request")
    return parser.parse_args()


def main() -> int:
    args = _parse_args()
    return asyncio.run(_main_async(args))


if __name__ == "__main__":
    raise SystemExit(main())

