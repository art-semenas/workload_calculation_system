# How to Run & Test the Workload Calculation System

Everything runs inside Docker. No local Java, Maven, Node.js, or PostgreSQL installation is required.

## Prerequisites

| Tool           | Version | Notes                                    |
| -------------- | ------- | ---------------------------------------- |
| Docker         | 24+     | Must be running before any command below |
| Docker Compose | v2+     | Included with Docker Desktop             |

---

## 0. One-Time Setup — Create the `.env` File

Copy the template and fill in the two required secrets:

```bash
cp .env.example .env
```

Edit `.env`:

```dotenv
POSTGRES_PASSWORD=your_secure_password
JWT_SECRET=change-this-to-a-random-256-bit-secret-minimum-32-chars
```

All 19 workload-config keys already have sensible defaults in `docker-compose.poc.yml`. Override in `.env` only if you need non-default values.

---

## 1. Backend

### 1.1 Run Backend Tests

Tests use **Testcontainers** — Docker starts a disposable PostgreSQL 15 container automatically. No `.env` or database setup needed.

```bash
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  -v "$(pwd)/backend":/app -w /app \
  eclipse-temurin:21-jdk-alpine \
  sh -c "apk add --no-cache maven && mvn test"
```

PowerShell (Windows — use `${PWD}` instead of `$(pwd)`):

```powershell
docker run --rm -v //var/run/docker.sock:/var/run/docker.sock `
  -v "${PWD}/backend:/app" -w /app `
  eclipse-temurin:21-jdk-alpine `
  sh -c "apk add --no-cache maven && mvn test"
```

> **Note:** The Docker socket mount (`/var/run/docker.sock`) lets Testcontainers inside the container talk to the host Docker daemon.

### 1.2 Run Full Backend Verification (Tests + Code Quality)

```bash
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  -v "$(pwd)/backend":/app -w /app \
  eclipse-temurin:21-jdk-alpine \
  sh -c "apk add --no-cache maven && mvn spotless:apply && mvn verify"
```

This runs:

- Auto-format (Google Java Format via Spotless)
- Unit and integration tests
- Jacoco code coverage enforcement
- SpotBugs static analysis
- Spotless formatting check

### 1.3 Run Backend Only (with PostgreSQL)

Start just the backend and its database:

```bash
docker compose -f docker-compose.poc.yml up --build backend postgres
```

The backend starts on **port 8080** (accessible via the host). Liquibase applies migrations automatically.

**Verify:**

```bash
curl http://localhost:8080/actuator/health
```

**Stop:**

```bash
docker compose -f docker-compose.poc.yml down
```

---

## 2. Frontend

### 2.1 Run Frontend Tests

Frontend tests use Vitest + jsdom — no backend or database needed.

```bash
docker run --rm -v "$(pwd)/frontend":/app -w /app \
  node:20-alpine \
  sh -c "npm ci && npm test"
```

PowerShell:

```powershell
docker run --rm -v "${PWD}/frontend:/app" -w /app `
  node:20-alpine `
  sh -c "npm ci && npm test"
```

### 2.2 Run Full Frontend Quality Checks

```bash
docker run --rm -v "$(pwd)/frontend":/app -w /app \
  node:20-alpine \
  sh -c "npm ci && npm run format && npm run lint && npx tsc --noEmit && npm test"
```

This runs:

- Prettier auto-format
- ESLint (must exit 0)
- TypeScript type check (must exit 0)
- Vitest (all tests must pass)

### 2.3 Build Frontend Image

```bash
docker compose -f docker-compose.poc.yml build frontend
```

The multi-stage Dockerfile installs dependencies, builds the React app, and produces a lightweight Nginx image serving `dist/`.

---

## 3. Full Stack (Backend + Frontend + PostgreSQL + Nginx)

### 3.1 Build and Start Everything

```bash
docker compose -f docker-compose.poc.yml up --build
```

This starts four services:

| Service      | Description                                                           |
| ------------ | --------------------------------------------------------------------- |
| **postgres** | PostgreSQL 15 database                                                |
| **backend**  | Spring Boot API (port 8080 internally)                                |
| **frontend** | Built React app served by Nginx (port 80 internally)                  |
| **nginx**    | Reverse proxy — routes `/api/*` → backend, everything else → frontend |

### 3.2 Access the Application

| URL                              | What you get                                |
| -------------------------------- | ------------------------------------------- |
| http://localhost                 | Full application (frontend + API via Nginx) |
| http://localhost/api/\*          | Backend REST API                            |
| http://localhost/actuator/health | Backend health check                        |

### 3.3 View Logs

All services:

```bash
docker compose -f docker-compose.poc.yml logs -f
```

Single service:

```bash
docker compose -f docker-compose.poc.yml logs -f backend
```

### 3.4 Rebuild After Code Changes

```bash
docker compose -f docker-compose.poc.yml up --build
```

Or rebuild a single service:

```bash
docker compose -f docker-compose.poc.yml up --build backend
```

### 3.5 Stop

```bash
docker compose -f docker-compose.poc.yml down
```

Stop **and wipe the database** (removes the `pgdata` volume):

```bash
docker compose -f docker-compose.poc.yml down -v
```

---

## 4. Run All Tests (Backend + Frontend)

Run both test suites sequentially in Docker:

```bash
# Backend tests (Testcontainers → auto-starts PostgreSQL)
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  -v "$(pwd)/backend":/app -w /app \
  eclipse-temurin:21-jdk-alpine \
  sh -c "apk add --no-cache maven && mvn verify"

# Frontend tests (Vitest + jsdom)
docker run --rm -v "$(pwd)/frontend":/app -w /app \
  node:20-alpine \
  sh -c "npm ci && npm test"
```

---

## 5. Quick Reference

| Task                        | Command                                                                                                                                                                    |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend — run tests         | `docker run --rm -v /var/run/docker.sock:/var/run/docker.sock -v "$(pwd)/backend":/app -w /app eclipse-temurin:21-jdk-alpine sh -c "apk add --no-cache maven && mvn test"` |
| Backend — full verify       | Same as above but `mvn spotless:apply && mvn verify`                                                                                                                       |
| Backend — start with DB     | `docker compose -f docker-compose.poc.yml up --build backend postgres`                                                                                                     |
| Frontend — run tests        | `docker run --rm -v "$(pwd)/frontend":/app -w /app node:20-alpine sh -c "npm ci && npm test"`                                                                              |
| Frontend — full checks      | Same as above but `npm run format && npm run lint && npx tsc --noEmit && npm test`                                                                                         |
| Full stack — start all      | `docker compose -f docker-compose.poc.yml up --build`                                                                                                                      |
| Full stack — stop           | `docker compose -f docker-compose.poc.yml down`                                                                                                                            |
| Full stack — stop + wipe DB | `docker compose -f docker-compose.poc.yml down -v`                                                                                                                         |
| View logs                   | `docker compose -f docker-compose.poc.yml logs -f`                                                                                                                         |

---

## 6. Troubleshooting

### "Cannot connect to the Docker daemon"

Docker Desktop (or the Docker daemon) is not running. Start it and retry.

### Testcontainers fails inside the container

The Docker socket must be mounted. Make sure `-v /var/run/docker.sock:/var/run/docker.sock` is present in the `docker run` command. On **Docker Desktop for Windows** with WSL2, the socket path `/var/run/docker.sock` works inside WSL; if running from PowerShell with Hyper-V backend, you may need to enable "Expose daemon on tcp://localhost:2375" in Docker Desktop settings and set `DOCKER_HOST=tcp://host.docker.internal:2375` instead.

### Backend health check fails after `docker compose up`

The backend waits for PostgreSQL to be healthy before starting. If it exits, check logs:

```bash
docker compose -f docker-compose.poc.yml logs backend
```

Common causes:

- `POSTGRES_PASSWORD` not set in `.env`
- `JWT_SECRET` not set in `.env`

### Docker Compose build is slow

First build downloads base images and Maven/npm dependencies. Subsequent builds use Docker layer cache and are much faster. Ensure Docker has at least **4 GB RAM** allocated (Docker Desktop → Settings → Resources).

### Spotless formatting check fails during `mvn verify`

Run `mvn spotless:apply` first (included in the full verify command above), then re-run `mvn verify`.
