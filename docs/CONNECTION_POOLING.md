# Connection Pooling Configuration

## Problem

During spike tests (1000+ concurrent users), PostgreSQL connection pool (PgBouncer) reached its limit, causing:
- **Error Rate**: 12% (connection timeouts)
- **CPU Spike**: 98% on analytics RPC calls
- **Connection Exhaustion**: New requests blocked waiting for available connections

## Solution: Supavisor Connection Pooler

Supabase provides **Supavisor**, a connection pooler that multiplexes connections to prevent exhaustion.

### Configuration Steps

#### 1. Enable Connection Pooler in Supabase Dashboard

1. Go to **Settings** → **Database** → **Connection Pooling**
2. Enable **Supavisor**
3. Configure pooler settings:
   - **Pool Mode**: `Transaction` (recommended for most apps)
   - **Pool Size**: 25 connections per user
   - **Max Client Connections**: 1000

#### 2. Update Environment Variables

Update `.env` to use pooler URL instead of direct connection:

```bash
# ❌ OLD: Direct database connection (port 5432)
# VITE_SUPABASE_DB_URL=postgresql://postgres:password@db.xxx.supabase.co:5432/postgres

# ✅ NEW: Connection pooler URL (port 6543)
VITE_SUPABASE_DB_URL=postgresql://postgres:password@pooler.supabase.co:6543/postgres?sslmode=require

# Supabase JS client URL (also use pooler)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

#### 3. Update Supabase Client Configuration

Update `src/services/supabase/client.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Create client with connection pooler awareness
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: {
    schema: 'public',
    // Use pooler URL if available
    url: import.meta.env.VITE_SUPABASE_DB_URL,
  },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    headers: {
      'x-client-info': 'edusync-lms@1.0.0',
    },
  },
  // Connection pooler settings
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})
```

### Pool Mode Selection

| Mode | Description | Use Case |
|------|-------------|----------|
| **Transaction** | Connection released after each transaction | ✅ **Recommended for EduSync** |
| **Session** | Connection held for entire session | Legacy apps, not recommended |
| **Statement** | Connection released after each statement | Read-only workloads |

**Why Transaction Mode?**
- Most efficient for mixed read/write workloads
- Prevents connection starvation during spikes
- Compatible with Supabase auth flows
- Works with prepared statements

### Connection Limits

#### Default Supabase Limits (Pro Plan)

| Resource | Limit | Current Usage | Notes |
|----------|-------|---------------|-------|
| Direct Connections | 200 | ~50-100 | Should avoid using direct |
| Pooler Connections | 1000 | ~200-400 | Use this for app traffic |
| Max DB Connections | 500 | ~150-300 | Pooler multiplexes to this |

#### Recommended Configuration

```
Pooler Settings:
- Pool Size: 25 connections per authenticated user
- Max Clients: 1000 concurrent connections
- Pool Mode: Transaction

Application:
- Max concurrent queries per user: 5
- Query timeout: 30 seconds
- Retry attempts: 3 with exponential backoff
```

### Monitoring Connection Usage

#### 1. Check Current Connections

Run in Supabase SQL Editor:

```sql
-- Active connections by state
SELECT 
  state,
  COUNT(*) as count
FROM pg_stat_activity
WHERE datname = current_database()
GROUP BY state;

-- Connection pooler stats
SELECT 
  pool_mode,
  max_client_conn,
  default_pool_size,
  current_clients
FROM pgbouncer.pgbouncer_config;
```

#### 2. Monitor in Production

Add to application monitoring:

```typescript
// src/utils/connectionMonitor.ts
import { supabase } from '@/services/supabase/client'

let connectionErrorCount = 0
let lastErrorTime: Date | null = null

export function monitorConnectionErrors(error: Error) {
  connectionErrorCount++
  lastErrorTime = new Date()

  // Alert if error rate is high
  if (connectionErrorCount > 10) {
    console.error('[ConnectionMonitor] High error rate detected:', {
      errorCount: connectionErrorCount,
      lastError: lastErrorTime,
      message: error.message,
    })

    // Could trigger:
    // - Sentry alert
    // - Admin notification
    // - Automatic retry with backoff
  }
}

// Reset counter periodically
setInterval(() => {
  connectionErrorCount = 0
}, 60000) // Reset every minute
```

### Retry Logic for Connection Failures

Add retry logic to critical operations:

```typescript
// src/utils/supabaseRetry.ts
import { supabase } from '@/services/supabase/client'

const MAX_RETRIES = 3
const BACKOFF_DELAYS = [1000, 3000, 10000] // 1s, 3s, 10s

export async function supabaseWithRetry<T>(
  operation: () => Promise<{ data: T | null; error: any }>,
  context: string = 'unknown'
): Promise<T> {
  let lastError: any

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const { data, error } = await operation()

      if (!error) {
        return data as T
      }

      // Check if error is connection-related
      if (isConnectionError(error)) {
        lastError = error
        
        if (attempt < MAX_RETRIES) {
          const delay = BACKOFF_DELAYS[attempt]
          console.warn(
            `[${context}] Connection error, retry ${attempt + 1}/${MAX_RETRIES} in ${delay}ms`
          )
          await sleep(delay)
        }
      } else {
        // Non-connection error, don't retry
        throw error
      }
    } catch (error) {
      if (isConnectionError(error)) {
        lastError = error
        
        if (attempt < MAX_RETRIES) {
          const delay = BACKOFF_DELAYS[attempt]
          await sleep(delay)
        }
      } else {
        throw error
      }
    }
  }

  throw new Error(
    `[${context}] Operation failed after ${MAX_RETRIES} retries: ${lastError?.message}`
  )
}

function isConnectionError(error: any): boolean {
  if (!error) return false
  
  const message = error.message?.toLowerCase() || ''
  return (
    message.includes('connection') ||
    message.includes('timeout') ||
    message.includes('pool') ||
    message.includes('pgbouncer') ||
    message.includes('supavisor')
  )
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
```

### Load Testing Validation

After configuring connection pooling, re-run load tests:

```bash
# Smoke test (100 users)
pnpm load:smoke

# Stress test (up to 2000 users)
k6 run tests/load/stress.js

# Spike test (0 → 1000 users in 30s)
k6 run tests/load/spike.js
```

**Expected Results:**
- ✅ Error rate < 1% (down from 12%)
- ✅ p95 response time < 800ms for analytics
- ✅ No connection timeout errors
- ✅ CPU utilization < 70% during spike

### Troubleshooting

#### Issue: "Connection pool exhausted"

**Solution:**
1. Increase pool size in Supabase dashboard
2. Reduce query concurrency in application
3. Add more aggressive caching
4. Check for connection leaks (unclosed transactions)

#### Issue: "Too many connections"

**Solution:**
1. Ensure all queries complete (no hanging transactions)
2. Use connection pooler URL (not direct)
3. Implement query queuing for batch operations
4. Add query timeout:

```sql
-- Set statement timeout to 30 seconds
SET statement_timeout = '30s';
```

#### Issue: High latency with pooler

**Solution:**
1. Check pooler mode (should be `Transaction`)
2. Verify SSL is enabled (adds ~10ms overhead but required)
3. Use prepared statements for repeated queries
4. Enable query result caching (React Query config above)

### Migration Checklist

- [ ] Enable Supavisor in Supabase dashboard
- [ ] Update `.env` with pooler URL
- [ ] Update Supabase client configuration
- [ ] Add retry logic to critical operations
- [ ] Add connection monitoring
- [ ] Run load tests to validate improvement
- [ ] Update deployment documentation
- [ ] Monitor production connection metrics

### References

- [Supabase Connection Pooling Docs](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooling)
- [PgBouncer Documentation](https://www.pgbouncer.org/)
- [Supavisor Architecture](https://supabase.com/blog/supavisor)
