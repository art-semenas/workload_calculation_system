# Running Integration Tests with Testcontainers on Windows (Docker Desktop + WSL2)

## Problem

Docker Desktop 4.54+ on Windows uses a **routing shim** (`npipe:////./pipe/docker_engine`) that
rejects all unauthenticated connections from Java's `docker-java` library with **HTTP 400**.
Every Testcontainers discovery strategy fails with _"Could not find a valid Docker environment"_:

- `EnvironmentAndSystemPropertyClientProviderStrategy` → 400
- `NpipeSocketClientProviderStrategy` → 400
- `TestcontainersHostPropertyClientProviderStrategy` → 400 / NPE

**This only affects Java/Maven tests.** Node.js (`testcontainers` npm package) auto-detects
Docker Desktop correctly and is unaffected.

---

## Fix: Python TCP Proxy through WSL2

Route Testcontainers through the real Docker Unix socket inside WSL2, exposed to Windows via an
IPv6 TCP listener on `[::1]:2375`.

### Proxy script

The script lives at the repo root: `docker-proxy.py`

It bridges `tcp://[::1]:2375` on the Windows side to `/var/run/docker.sock` inside WSL2.

### Step 1 — Start the proxy (once per Windows session)

Run this from PowerShell before executing any Maven tests:

```powershell
Start-Job { wsl bash -c "python3 '/mnt/c/Work/Study/Projects/workload_calculation_system/docker-proxy.py'" }
Start-Sleep -Seconds 4
```

Verify it is listening:

```powershell
netstat -an | Select-String "2375"
# Expected:  TCP    [::1]:2375    [::]:0    LISTENING
```

### Step 2 — Set `DOCKER_HOST` in the shell session

```powershell
$env:DOCKER_HOST = "tcp://[::1]:2375"
```

Or export it permanently in your user environment:

```powershell
[System.Environment]::SetEnvironmentVariable("DOCKER_HOST", "tcp://[::1]:2375", "User")
```

### Step 3 — Configure `~/.testcontainers.properties` (one-time)

Create or update `C:\Users\<you>\.testcontainers.properties`:

```properties
docker.host=tcp://[::1]:2375
```

> This file already exists with the correct value on the machine where the fix was first applied.

---

## Running the tests

```powershell
# From the backend directory, with DOCKER_HOST set and proxy running:
cd backend
mvn test -Dtest=WorkloadApplicationTest
# Expected: Tests run: 1, Failures: 0, Errors: 0, Skipped: 0
```

Full build (all tests):

```powershell
mvn verify
```

---

## What NOT to do

| Approach                                             | Why it fails                                                                        |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `npipe:////./pipe/dockerDesktopLinuxEngine`          | Docker Desktop routing shim → HTTP 400                                              |
| `npipe:////./pipe/docker_engine`                     | Same routing shim                                                                   |
| `tcp://127.0.0.1:2375`                               | WSL2 proxy only binds IPv6 `[::1]`, not IPv4                                        |
| `tcp://localhost:2375`                               | Resolves to IPv4 on Windows → not bound                                             |
| Port `61021` (Testcontainers Desktop)                | Its `/info` endpoint returns HTTP 400 for docker-java                               |
| `testcontainers.properties` in `src/test/resources/` | Overrides `~/.testcontainers.properties` in broken order — **do not add this file** |

---

## Troubleshooting

**Proxy not starting / port not open:**

```powershell
# Check WSL2 is running
wsl bash -c "echo ok"

# Check Python3 is available in WSL2
wsl bash -c "python3 --version"

# Check Docker socket exists in WSL2
wsl bash -c "ls /var/run/docker.sock"
```

**Test still fails after proxy is running:**

1. Confirm `$env:DOCKER_HOST` is set in the current shell:
   ```powershell
   $env:DOCKER_HOST   # must print tcp://[::1]:2375
   ```
2. Confirm `~/.testcontainers.properties` has `docker.host=tcp://[::1]:2375` (no spaces around `=`).
3. Confirm no `testcontainers.properties` file exists under `backend/src/test/resources/`.
