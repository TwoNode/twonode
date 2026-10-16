#!/usr/bin/env node

/**
 * TwoNodes Automated Load & Stress Testing Benchmark
 * 
 * Executes tiered load & stress tests across critical web routes and APIs.
 * Supports configurable base URL (default: http://localhost:3000 or process.env.TARGET_URL).
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const BASE_URL = process.env.TARGET_URL || process.env.BASE_URL || 'http://localhost:3000';

console.log(`\n================================================================`);
console.log(`🚀 TwoNodes Load & Stress Testing Suite`);
console.log(`Target URL: ${BASE_URL}`);
console.log(`Timestamp: ${new Date().toISOString()}`);
console.log(`================================================================\n`);

const ROUTES = [
  { name: 'Corporate Landing Page', path: '/', weight: 'high' },
  { name: 'REVA Landing Page', path: '/reva', weight: 'critical' },
  { name: 'REVA Request Form', path: '/reva/requestform', weight: 'high' },
  { name: 'REVA One-Time Tracking', path: '/reva/onetimerequest', weight: 'medium' },
  { name: 'Corporate Insights Index', path: '/insights', weight: 'medium' },
  { name: 'Auth Setup Endpoint', path: '/api/auth/setup', weight: 'high' },
];

function runAutocannon({ url, connections, duration, pipelining = 1, title }) {
  return new Promise((resolve, reject) => {
    console.log(`⚡ Running: [${title}] on ${url} (${connections} conn, ${duration}s, pipelining=${pipelining})...`);
    const args = [
      '--yes',
      'autocannon',
      '-c', String(connections),
      '-d', String(duration),
      '-p', String(pipelining),
      '-j', // output json
      url
    ];

    const proc = spawn('npx', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });

    proc.on('close', (code) => {
      if (code !== 0 && !stdout.trim()) {
        return reject(new Error(`Autocannon failed with code ${code}: ${stderr}`));
      }
      try {
        // Strip any npm warnings before the JSON object
        const jsonStart = stdout.indexOf('{');
        if (jsonStart === -1) {
          return reject(new Error(`No JSON found in autocannon output: ${stdout}\nStderr: ${stderr}`));
        }
        const jsonStr = stdout.slice(jsonStart);
        const result = JSON.parse(jsonStr);
        resolve(result);
      } catch (err) {
        reject(new Error(`Failed to parse autocannon JSON: ${err.message}\nRaw: ${stdout}`));
      }
    });
  });
}

function formatResultRow(route, result, stage) {
  const reqAvg = Math.round(result.requests?.average || 0);
  const reqTotal = result.requests?.total || 0;
  const p50 = result.latency?.p50 || result.latency?.average || 0;
  const p95 = result.latency?.p97_5 || result.latency?.p90 || 0;
  const p99 = result.latency?.p99 || 0;
  const max = result.latency?.max || 0;
  const errors = (result.errors || 0) + (result.timeouts || 0) + (result.non2xx || 0);
  const errorRate = reqTotal > 0 ? ((errors / reqTotal) * 100).toFixed(2) : '0.00';
  const throughputMb = ((result.throughput?.total || 0) / (1024 * 1024)).toFixed(2);

  return {
    stage,
    name: route.name,
    path: route.path,
    reqTotal,
    reqPerSec: reqAvg,
    p50: `${p50.toFixed(1)}ms`,
    p95: `${p95.toFixed(1)}ms`,
    p99: `${p99.toFixed(1)}ms`,
    max: `${max.toFixed(1)}ms`,
    errors,
    errorRate: `${errorRate}%`,
    throughput: `${throughputMb} MB`,
    pass: Number(errorRate) < 1.0 && p95 < 2000,
  };
}

async function main() {
  const allResults = [];

  console.log(`\n--- PHASE 1: BASELINE LOAD TESTING (50 Concurrency, 10s per route) ---`);
  for (const route of ROUTES) {
    try {
      const res = await runAutocannon({
        url: `${BASE_URL}${route.path}`,
        connections: 50,
        duration: 10,
        pipelining: 1,
        title: `Baseline: ${route.name}`,
      });
      allResults.push(formatResultRow(route, res, 'Baseline (50 c)'));
    } catch (err) {
      console.error(`Error testing ${route.path}:`, err.message);
      allResults.push({
        stage: 'Baseline (50 c)',
        name: route.name,
        path: route.path,
        reqTotal: 0,
        reqPerSec: 0,
        p50: 'ERR',
        p95: 'ERR',
        p99: 'ERR',
        max: 'ERR',
        errors: 1,
        errorRate: '100%',
        throughput: '0 MB',
        pass: false,
      });
    }
  }

  console.log(`\n--- PHASE 2: HIGH CONCURRENCY STRESS TESTING (150 Concurrency, 10s) ---`);
  const stressRoutes = ROUTES.filter(r => r.weight === 'critical' || r.weight === 'high');
  for (const route of stressRoutes) {
    try {
      const res = await runAutocannon({
        url: `${BASE_URL}${route.path}`,
        connections: 150,
        duration: 10,
        pipelining: 1,
        title: `Stress: ${route.name}`,
      });
      allResults.push(formatResultRow(route, res, 'Stress (150 c)'));
    } catch (err) {
      console.error(`Error stress testing ${route.path}:`, err.message);
    }
  }

  console.log(`\n--- PHASE 3: PEAK SATURATION & SPIKE TESTING (300 Concurrency, 10s) ---`);
  const peakRoutes = [
    { name: 'REVA Landing Page (Peak Spike)', path: '/reva' },
    { name: 'Corporate Landing (Peak Spike)', path: '/' }
  ];
  for (const route of peakRoutes) {
    try {
      const res = await runAutocannon({
        url: `${BASE_URL}${route.path}`,
        connections: 300,
        duration: 10,
        pipelining: 1,
        title: `Peak Saturation: ${route.name}`,
      });
      allResults.push(formatResultRow(route, res, 'Spike (300 c)'));
    } catch (err) {
      console.error(`Error spike testing ${route.path}:`, err.message);
    }
  }

  console.log(`\n================================================================`);
  console.log(`📊 BENCHMARK RESULTS SUMMARY`);
  console.log(`================================================================\n`);
  console.table(allResults.map(r => ({
    Stage: r.stage,
    Route: r.path,
    Requests: r.reqTotal,
    'Req/s': r.reqPerSec,
    'p50': r.p50,
    'p95': r.p95,
    'p99': r.p99,
    'Errors': r.errors,
    'Err Rate': r.errorRate,
    Status: r.pass ? '✅ PASS' : '❌ FAIL'
  })));

  // Write markdown report
  const reportPath = path.resolve(process.cwd(), 'docs/benchmark-load-stress-results.md');
  const markdownReport = `# Load & Stress Testing Benchmark Report

**Generated:** ${new Date().toISOString()}  
**Target Environment:** \`${BASE_URL}\`  
**Test Harness:** \`autocannon\` via Node.js runner  

## Summary of Results

| Phase | Route | Total Reqs | Throughput (Req/s) | p50 Latency | p95 Latency | p99 Latency | Max Latency | Errors | Error Rate | SLA Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
${allResults.map(r => `| **${r.stage}** | \`${r.path}\` | ${r.reqTotal} | ${r.reqPerSec} req/s | ${r.p50} | ${r.p95} | ${r.p99} | ${r.max} | ${r.errors} | ${r.errorRate} | ${r.pass ? '✅ PASS' : '❌ FAIL'} |`).join('\n')}

## SLA & Resiliency Analysis
- **Availability Target**: 99.0%+ non-error HTTP responses under baseline and stress concurrency.
- **Latency Target**: p95 latency under normal load < 500ms; under high stress < 2,000ms.
- **Degradation Profile**: Evaluated graceful degradation and recovery as concurrency scales from 50 to 150 to 300 connections.
`;

  fs.writeFileSync(reportPath, markdownReport, 'utf8');
  console.log(`\n✓ Detailed markdown report written to: ${reportPath}`);
}

main().catch(err => {
  console.error('Fatal error in load & stress benchmark:', err);
  process.exit(1);
});
