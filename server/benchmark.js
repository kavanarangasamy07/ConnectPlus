import autocannon from 'autocannon';

async function runBenchmark() {
  console.log('--- Starting ConnectPlus Performance Benchmarks ---');

  // Benchmark 1: Health route
  console.log('\n[1/3] Benchmarking GET /api/v1/health (Baseline latency)...');
  const healthResult = await autocannon({
    url: 'http://localhost:3001/api/v1/health',
    connections: 10,
    duration: 3,
    pipelining: 1
  });
  console.log(`Health mean: ${healthResult.latency.mean} ms | p97.5: ${healthResult.latency.p97_5} ms | p99: ${healthResult.latency.p99} ms | Req/sec: ${healthResult.requests.average}`);

  // Benchmark 2: Cached translation
  console.log('\n[2/3] Benchmarking POST /api/v1/translate (Cached latency)...');
  await fetch('http://localhost:3001/api/v1/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: 'Hello', target: 'ta' })
  });

  const translateResult = await autocannon({
    url: 'http://localhost:3001/api/v1/translate',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: 'Hello', target: 'ta' }),
    connections: 10,
    duration: 3,
    pipelining: 1
  });
  console.log(`Cached Translate mean: ${translateResult.latency.mean} ms | p97.5: ${translateResult.latency.p97_5} ms | p99: ${translateResult.latency.p99} ms | Req/sec: ${translateResult.requests.average}`);

  // Benchmark 3: Assistant FAQ
  console.log('\n[3/3] Benchmarking POST /api/v1/assistant (Fuzzy matching latency)...');
  const assistantResult = await autocannon({
    url: 'http://localhost:3001/api/v1/assistant',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'How do I use the board?' }),
    connections: 10,
    duration: 3,
    pipelining: 1
  });
  console.log(`Assistant FAQ mean: ${assistantResult.latency.mean} ms | p97.5: ${assistantResult.latency.p97_5} ms | p99: ${assistantResult.latency.p99} ms | Req/sec: ${assistantResult.requests.average}`);

  console.log('\n--- Benchmark Summary ---');
  console.log(`Target: p95/p97.5 latency < 100 ms for cached routes`);
  console.log(`Actual Cached Translate p97.5: ${translateResult.latency.p97_5} ms ${translateResult.latency.p97_5 < 100 ? '✅ PASSED (< 100ms)' : '❌ FAILED'}`);
  console.log(`Actual Assistant FAQ p97.5: ${assistantResult.latency.p97_5} ms ${assistantResult.latency.p97_5 < 100 ? '✅ PASSED (< 100ms)' : '❌ FAILED'}`);
}

runBenchmark().catch(console.error);
