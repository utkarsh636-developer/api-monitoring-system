# API Hit Monitoring System

A high-performance, fault-tolerant, event-driven API logging and analytics monitoring system designed to ingest, queue, and process millions of API hit records in real-time.

---

## 🏗️ Architecture Overview

The system transitions from a traditional synchronous database-write architecture to a **decoupled, event-driven pipeline** to optimize client-facing response times and protect the database from connection exhaustion under peak traffic.

```mermaid
graph TD
    Client[API Client] -->|1. Incoming request| API[Express API Server]
    API -->|2. Key Validation & Rate Limit| Redis[(Redis Cache)]
    API -->|3. Queue hit log| RabbitMQ{RabbitMQ Broker}
    API -->|4. Respond 202 Accepted| Client
    
    subgraph Background Processing
        RabbitMQ -->|5. Consume events| Consumer[Worker / Consumer]
        Consumer -->|6. Check / Write| DB[(PostgreSQL Database)]
        Consumer -.->|If failure / max retries| DLQ[api_hits.dlq Queue]
    end
    
    Dashboard[Next.js Dashboard] -->|Query stats| API
```

### Ingestion Flow & Component Responsibilities:
1. **API Ingestion Server:** Receives hit metadata from clients. It performs key authorization and rate limiting against Redis, publishes the payload to RabbitMQ, and returns a `202 Accepted` response once delivery is acknowledged by the broker.
2. **Redis Cache:** Acts as a low-latency cache for API key validation and hosts distributed sliding-window/fixed-window rate limiters.
3. **RabbitMQ Broker:** Decouples ingestion from database writing. Implements a Confirm Channel to guarantee message delivery.
4. **Resilient Background Consumer:** A separate worker process that consumes hit logs, handles batch processing, runs retry strategies with exponential backoff and jitter for database errors, and routes unresolvable payloads to a **Dead-Letter Queue (DLQ)**.
5. **PostgreSQL & Prisma:** Stores persistent records. Prisma is configured with a custom PG Driver Adapter (`@prisma/adapter-pg` over `pg.Pool`) to reuse connections efficiently and eliminate TCP handshakes.

---

## ⚡ Performance Benchmarks

Below are the benchmark metrics collected under a concurrent load test using **k6** (150 concurrent virtual users, averaged across 10 runs) comparing the system's performance with and without Redis caching enabled for API Key validation:

### Comparison Summary (150 VUs, 10 Runs)

| Metric | With Redis (Cached) | Without Redis (Direct DB Queries) | Impact / Performance Gain |
| :--- | :--- | :--- | :--- |
| **Average Latency** | **~15.56 ms** | **70.88 ms** | **4.5x faster** response times |
| **95th Percentile (p95)** | **~25.25 ms** | **167.61 ms** | **6.6x lower** p95 tail latency |
| **Avg Throughput** | **~646 req/s** | **439.05 req/s** | **+47% higher** throughput |
| **Total Requests / Run** | **~25,890** | **~17,592** | More requests processed safely |
| **Error Rate** | **0.00%** | **0.00%** | Both maintain 100% request delivery |
| **SLA Threshold Status** | **PASS** (p(95) < 100ms) | **FAIL** (p(95) exceeded 100ms limit) | Redis keeps the system SLA-compliant |

### Key Insights
* **PostgreSQL Protection**: Without Redis caching, every request forces a connection to PostgreSQL, leading to connection pool queueing and a massive latency spike (p95 jumps from **25.25ms** to **167.61ms**).
* **SLA Compliance**: Under the 150 VU load profile, the system successfully maintains its strict SLA of **p(95) < 100ms** only when Redis is enabled.
* **Asynchronous Buffer**: Because the database write is decoupled via RabbitMQ, even when Postgres is under high query stress (without Redis), the error rate remains **0%** because incoming logs are safely queued rather than dropped.

---

## 🛠️ Tech Stack

* **Backend:** Node.js, Express, TypeScript
* **Database:** PostgreSQL (v15)
* **ORM:** Prisma
* **Caching & Limiters:** Redis (using `ioredis` & `rate-limit-redis`)
* **Message Broker:** RabbitMQ
* **Frontend:** Next.js (React)
* **Infrastructure:** Docker, Docker Compose

---

## 🚀 Getting Started

### Prerequisites
* [Node.js](https://nodejs.org/) (v20+ recommended)
* [Docker & Docker Desktop](https://www.docker.com/)

### 1. Set Up Environment Variables
Create a `.env` file in the `backend/` directory based on `backend/.env.example`.

For local development (Docker), set:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/api_monitoring?schema=public"
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/api_monitoring?schema=public"
REDIS_URL="redis://:utk_redis_password@localhost:6379"
RABBITMQ_URL="amqp://api_user:utk_rabbitmq_password@localhost:5672/api_monitoring"
```

### 2. Start Infrastructure and Services (Docker)
From the root directory, run:
```bash
# Starts Postgres, Redis, RabbitMQ, pgAdmin, Backend API, Worker, and Next.js Frontend
docker compose up -d
```

### 3. Initialize the Database
Ensure your PostgreSQL schema is up-to-date by pushing the Prisma schema:
```bash
cd backend
npx prisma db push
```

### 4. Port access
* **Next.js Dashboard:** [http://localhost:3000](http://localhost:3000)
* **Backend API Server:** [http://localhost:5000](http://localhost:5000)
* **RabbitMQ Management UI:** [http://localhost:15672](http://localhost:15672) (User: `api_user`, Pass: `utk_rabbitmq_password`)
* **pgAdmin Dashboard:** [http://localhost:8080](http://localhost:8080) (Email: `admin@example.com`, Pass: `admin`)

---

## 🧪 Running Load Tests & Benchmarks

We use **k6** to perform high-concurrency load testing against the API endpoints.

### Run Ingestion Load Test
1. Make sure your local or cloud servers are running.
2. Run the load test using the `k6` CLI, passing your API key as an environment variable:
   ```bash
   cd backend
   # Option A: Pass the API key dynamically (Recommended)
   k6 run -e API_KEY=your_actual_api_key scratch/load-test.js
   
   # Option B: Edit the 'your-api-key-here' placeholder directly in backend/scratch/load-test.js and run:
   k6 run scratch/load-test.js
   ```
