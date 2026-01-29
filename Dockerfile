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
# Install all dependencies (including devDependencies needed for the build)
RUN yarn install --frozen-lockfile

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
# This is the final, lean image for the 'api' (NestJS) application.
FROM node:20-alpine AS api
WORKDIR /app
ENV TZ=Asia/Taipei
# The NestJS build generates a dedicated package.json with only production dependencies.
COPY --from=builder /app/dist/apps/api/package.json ./package.json
COPY .yarnrc.yml ./
COPY .yarn ./.yarn
# Install only the production dependencies for the API.
RUN corepack enable && yarn install && yarn add pg typeorm webpack @as-integrations/express5
RUN echo "Checking API package.json:" && cat package.json
RUN echo "Checking API node_modules:" && ls -F node_modules/

# Copy the built application code from the builder stage.
COPY --from=builder /app/dist/apps/api .
EXPOSE 3000
# The entrypoint for the NestJS application.
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