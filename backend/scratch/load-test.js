import http from 'k6/http';
import { check, sleep } from 'k6';

// =========================================================================
// LOAD PROFILE CONFIGURATIONS (Choose one by uncommenting)
// =========================================================================

// PROFILE A: Standard Load Test (Smooth ramp-up/down) - Current Active
export const options = {
  stages: [
    { duration: '10s', target: 50 },  // Ramp-up to 50 concurrent virtual users (VUs)
    { duration: '20s', target: 150 }, // Hold at 150 VUs (sustained load)
    { duration: '10s', target: 0 },   // Ramp-down to 0 VUs
  ],
  thresholds: {
    http_req_duration: ['p(95)<100'],   // fail the test if p95 latency exceeds 100ms
    http_req_failed: ['rate<0.01'],   // fail the test if more than 1% of requests fail
  },
};


// PROFILE B: Spike Test (Sudden high surge of users)
// export const options = {
//   stages: [
//     { duration: '2s', target: 0 },
//     { duration: '3s', target: 300 },  // Immediate spike to 300 VUs
//     { duration: '15s', target: 300 }, // Hold at peak
//     { duration: '5s', target: 0 },    // Ramp-down
//   ],
// };


/*
// PROFILE C: Soak Test (Long-duration stability test to check leaks)
export const options = {
  stages: [
    { duration: '10s', target: 60 },
    { duration: '10m', target: 60 },  // Maintain 60 VUs for 10 minutes
    { duration: '10s', target: 0 },
  ],
};
*/

const API_URL = 'http://localhost:5000/api/hit';

// Single real API key. Rate limit raised to 100000 in .env so 150 VUs
// hitting this one key won't trip the limiter and pollute latency numbers.
const API_KEY = __ENV.API_KEY || 'REPLACE_WITH_REAL_API_KEY';

// Realistic route configurations with realistic methods and latency ranges.
// This is just payload metadata (simulating what a real client's endpoint
// would report) — it does not affect the actual HTTP call made to /api/hit,
// so it's safe to vary without corrupting timing measurements.
const routes = [
  { service: 'auth-service', endpoint: '/api/v1/login', method: 'POST', baseLatency: 120, jitter: 50 },
  { service: 'user-service', endpoint: '/api/v1/profile', method: 'GET', baseLatency: 20, jitter: 15 },
  { service: 'inventory-service', endpoint: '/api/v1/items', method: 'GET', baseLatency: 40, jitter: 30 },
  { service: 'inventory-service', endpoint: '/api/v1/items', method: 'POST', baseLatency: 90, jitter: 40 },
  { service: 'inventory-service', endpoint: '/api/v1/items', method: 'PUT', baseLatency: 80, jitter: 30 },
  { service: 'inventory-service', endpoint: '/api/v1/items', method: 'DELETE', baseLatency: 70, jitter: 25 },
  { service: 'payment-service', endpoint: '/api/v1/charge', method: 'POST', baseLatency: 250, jitter: 100 },
];

// Common User Agents to make metrics look realistic
const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3.1 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36',
  'curl/8.4.0'
];

// Helper to generate a random IP address
function getRandomIP() {
  return `${Math.floor(Math.random() * 255) + 1}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
}

// Helper to pick a status code with realistic probabilities.
// This is metadata describing the ORIGINAL client request being logged,
// not the HTTP status returned by our ingestion endpoint itself.
function getRealisticStatusCode() {
  const rand = Math.random();
  if (rand < 0.93) return 200;      // 93% success
  if (rand < 0.95) return 201;      // 2% created
  if (rand < 0.97) return 400;      // 2% bad request
  if (rand < 0.99) return 401;      // 2% unauthorized
  return 500;                       // 1% internal server error
}

export default function () {
  if (API_KEY === 'REPLACE_WITH_REAL_API_KEY') {
    throw new Error('Set API_KEY (env var or inline) to a real key before running this test.');
  }

  // 1. Pick a random route configuration
  const route = routes[Math.floor(Math.random() * routes.length)];

  // 2. Calculate latency with dynamic jitter (this is logged metadata only)
  const latencyMs = route.baseLatency + Math.floor(Math.random() * route.jitter);

  // 3. Pick a realistic logged status code (metadata only, not our HTTP response)
  const statusCode = getRealisticStatusCode();

  // 4. Construct payload
  const payload = JSON.stringify({
    serviceName: route.service,
    endpoint: route.endpoint,
    method: route.method,
    statusCode: statusCode,
    latencyMs: latencyMs,
  });

  // 5. Spoof client headers (IP and User-Agent) for realistic-looking data
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'X-Forwarded-For': getRandomIP(),
      'User-Agent': userAgents[Math.floor(Math.random() * userAgents.length)],
    },
  };

  // 6. Execute request
  const res = http.post(API_URL, payload, params);

  // 7. Strict check: only 202 counts as success.
  // A 429 here means the rate limiter is interfering with the latency
  // measurement — treat that as a real failure to investigate, not a pass.
  check(res, {
    'status is 202': (r) => r.status === 202,
  });

  // Sleep slightly (between 50ms and 150ms) to simulate user pacing
  sleep(Math.random() * 0.1 + 0.05);
}