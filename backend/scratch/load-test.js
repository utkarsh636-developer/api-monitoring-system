import http from 'k6/http';
import { check, sleep } from 'k6';

// Define the load profile (ramping up and down concurrent users)
export const options = {
  stages: [
    { duration: '5s', target: 50 },  // Ramp-up to 50 concurrent virtual users (VUs)
    { duration: '10s', target: 100 }, // Hold at 100 VUs
    { duration: '5s', target: 0 },   // Ramp-down to 0 VUs
  ],
};

const API_URL = 'http://localhost:5000/api/hit';
// Replace this with a real API key (the keyValue field) from your database ApiKey table
const API_KEY = __ENV.API_KEY || 'your-api-key-here';

export default function () {
  const payload = JSON.stringify({
    serviceName: 'payment-service',
    endpoint: '/api/v1/charge',
    method: 'POST',
    statusCode: 200,
    latencyMs: 142,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
    },
  };

  const res = http.post(API_URL, payload, params);

  // Assert that our ingestion endpoint is replying 202 Accepted
  check(res, {
    'status is 202': (r) => r.status === 202,
  });

  sleep(0.1); // Wait 100ms between requests for each VU
}
