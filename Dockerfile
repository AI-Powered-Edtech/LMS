# ============================================================
# EduSync LMS — Multi-Stage Dockerfile
# ============================================================
# Stage 1: deps     — install only production dependencies
# Stage 2: builder  — build the Vite/React app
# Stage 3: runner   — serve with nginx (no Node.js in prod)
# ============================================================

# ---- Stage 1: deps ----
FROM node:22-alpine AS deps

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy only manifests first (better layer caching)
COPY package.json pnpm-lock.yaml* package-lock.json* ./

# Install all dependencies (including dev — needed for build)
RUN if [ -f pnpm-lock.yaml ]; then \
      pnpm install --frozen-lockfile; \
    else \
      npm ci; \
    fi


# ---- Stage 2: builder ----
FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy deps from previous stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build args — must be provided at build time (not runtime)
# These are injected into the static bundle by Vite
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

RUN if [ -f pnpm-lock.yaml ]; then \
      pnpm build; \
    else \
      npm run build; \
    fi


# ---- Stage 3: runner ----
FROM nginx:1.27-alpine AS runner

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# EduSync nginx config — SPA with hash routing
# Hash routing means all requests can be served from index.html
# (the /#/ prefix is handled entirely client-side)
COPY docker/nginx.conf /etc/nginx/conf.d/edusync.conf

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Non-root user for security
RUN addgroup -g 1001 -S edusync && \
    adduser -S edusync -u 1001 -G edusync && \
    chown -R edusync:edusync /usr/share/nginx/html && \
    chown -R edusync:edusync /var/cache/nginx && \
    chown -R edusync:edusync /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown edusync:edusync /var/run/nginx.pid

USER edusync

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
