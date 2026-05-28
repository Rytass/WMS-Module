# --- Base Stage (Common setup for dependencies) ---
# This stage installs all dependencies required for the build process.
FROM node:20-alpine AS deps
WORKDIR /app
# Install git as some packages might be installed from git repositories
RUN apk add --no-cache git
# Enable Yarn Berry, the package manager used in this project
RUN corepack enable
# Copy dependency definition files
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn
# Install all dependencies (including devDependencies needed for the build).
# --immutable is the Yarn 4 canonical name for the deprecated --frozen-lockfile.
RUN yarn install --immutable

# --- Builder Stage (Builds all applications) ---
# This stage takes the source code and dependencies and builds all apps.
FROM node:20-alpine AS builder
WORKDIR /app
# Copy dependencies from the 'deps' stage
COPY --from=deps /app/node_modules ./node_modules
# Copy the entire source code
COPY . .
# Run GraphQL code generation first, as the client build depends on the generated files.
RUN npx nx run client:graphql
# Run the build command for all applications in the monorepo
RUN npx nx run-many -t build
# Debugging step: List the contents of the dist directory to verify build output paths.
# Debugging step: List the contents of the dist directory to verify build output paths.
RUN ls -R /app/dist

# --- Final Image for API ---
# Uses the root monorepo package.json + yarn.lock as the single source of truth
# for runtime deps. This is intentionally NOT the slim "only API's deps" image
# anymore — it ships the full root dep set (incl. client-side deps that the API
# runtime never imports) — in exchange for eliminating apps/api/package.json
# and the Nx generatePackageJson workaround that was needed to capture deps
# Nx's static analysis misses (pg via typeorm's dynamic driver require,
# @as-integrations/express5 via @nestjs/apollo's dynamic factory).
FROM node:20-alpine AS api
WORKDIR /app
ENV TZ=Asia/Taipei
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn
# --immutable is the Yarn 4 canonical name for the deprecated --frozen-lockfile.
RUN corepack enable && yarn install --immutable
# Copy the built application bundle from the builder stage (main.js + assets).
# This may also drop Nx's generated dist/apps/api/package.json into /app — it's
# harmless since node_modules is already populated and Node module resolution
# doesn't consult /app/package.json at runtime.
COPY --from=builder /app/dist/apps/api .
EXPOSE 3000
CMD ["node", "main.js"]

# --- Final Image for Client ---
# This is the final, lean image for the 'client' (Next.js) application.
FROM node:20-alpine AS client
WORKDIR /app
ENV TZ=Asia/Taipei
# The Next.js standalone build output is self-contained.
# Copy the standalone output from the builder stage.
COPY --from=builder /app/apps/client/.next/standalone .
COPY --from=builder /app/apps/client/public ./apps/client/public
COPY --from=builder /app/apps/client/.next/static ./apps/client/.next/static

RUN echo "Checking Client structure:" && ls -R /app

EXPOSE 3000
# In standalone mode, Next.js provides a server.js to run the application.
CMD ["node", "apps/client/server.js"]