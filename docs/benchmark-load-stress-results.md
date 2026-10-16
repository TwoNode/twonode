# Load & Stress Testing Benchmark Report

**Generated:** 2026-10-16T08:03:23.554Z  
**Target Environment:** `http://localhost:3005`  
**Test Harness:** `autocannon` via Node.js runner  

## Summary of Results

| Phase | Route | Total Reqs | Throughput (Req/s) | p50 Latency | p95 Latency | p99 Latency | Max Latency | Errors | Error Rate | SLA Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Baseline (50 c)** | `/` | 2090 | 209 req/s | 219.0ms | 407.0ms | 460.0ms | 561.0ms | 0 | 0.00% | ✅ PASS |
| **Baseline (50 c)** | `/reva` | 1523 | 152 req/s | 302.0ms | 451.0ms | 606.0ms | 821.0ms | 0 | 0.00% | ✅ PASS |
| **Baseline (50 c)** | `/reva/requestform` | 250 | 25 req/s | 1732.0ms | 2940.0ms | 2949.0ms | 2954.0ms | 250 | 100.00% | ❌ FAIL |
| **Baseline (50 c)** | `/reva/onetimerequest` | 328 | 33 req/s | 1275.0ms | 1997.0ms | 2014.0ms | 2026.0ms | 0 | 0.00% | ✅ PASS |
| **Baseline (50 c)** | `/insights` | 2725 | 273 req/s | 174.0ms | 249.0ms | 349.0ms | 453.0ms | 0 | 0.00% | ✅ PASS |
| **Baseline (50 c)** | `/api/auth/setup` | 2102 | 210 req/s | 228.0ms | 336.0ms | 353.0ms | 508.0ms | 0 | 0.00% | ✅ PASS |
| **Stress (150 c)** | `/` | 1944 | 194 req/s | 700.0ms | 1191.0ms | 1420.0ms | 1929.0ms | 0 | 0.00% | ✅ PASS |
| **Stress (150 c)** | `/reva` | 1422 | 142 req/s | 974.0ms | 1282.0ms | 1438.0ms | 2228.0ms | 0 | 0.00% | ✅ PASS |
| **Stress (150 c)** | `/reva/requestform` | 150 | 15 req/s | 6128.0ms | 6446.0ms | 6452.0ms | 6454.0ms | 150 | 100.00% | ❌ FAIL |
| **Stress (150 c)** | `/api/auth/setup` | 1811 | 181 req/s | 813.0ms | 1000.0ms | 1005.0ms | 1664.0ms | 0 | 0.00% | ✅ PASS |
| **Spike (300 c)** | `/reva` | 1506 | 151 req/s | 1764.0ms | 1978.0ms | 1985.0ms | 9191.0ms | 10 | 0.66% | ✅ PASS |
| **Spike (300 c)** | `/` | 2111 | 211 req/s | 1313.0ms | 1760.0ms | 1863.0ms | 3101.0ms | 0 | 0.00% | ✅ PASS |

## SLA & Resiliency Analysis
- **Availability Target**: 99.0%+ non-error HTTP responses under baseline and stress concurrency.
- **Latency Target**: p95 latency under normal load < 500ms; under high stress < 2,000ms.
- **Degradation Profile**: Evaluated graceful degradation and recovery as concurrency scales from 50 to 150 to 300 connections.
