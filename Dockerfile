FROM node:22-alpine AS BUILDER
WORKDIR /app

ENV NODE_ENV=production

# React security setting
ENV INLINE_RUNTIME_CHUNK=false

# Argon2 needs: g++ libc-dev make python3
RUN apk add --no-cache \
	g++ \
	libc-dev \
	make \
	python3

RUN npm config set update-notifier false

# Build node_modules first
COPY package*.json ./
RUN npm ci --include=dev
RUN npm rebuild argon2

# Build project
COPY . .
RUN rm -rf src/pages/dev/ src/pages/api/dev/
RUN npx next telemetry disable \
	&& npm run lint \
	&& npm run test \
	&& npm run build

# Next Standalone
RUN mkdir -p deployment/node_modules/
RUN cp -R .next/ deployment/
RUN cp -R .next/standalone/* deployment/
RUN rm -rf deployment/.next/standalone/
RUN cp -R public/ deployment/   || true
RUN cp next.config.js deployment/
RUN cp package*.json deployment/



FROM node:22-alpine as MIGRATION_RUNNER
WORKDIR /app

ENV NODE_ENV=production

RUN npm config set update-notifier false

COPY package*.json ./
RUN npm ci --omit=dev

# Scripts
COPY scripts/ scripts/
RUN chmod +x scripts/*.sh

# TypeORM
COPY src/typeorm/ src/typeorm/
COPY tsconfig.json ./



FROM node:22-alpine AS RUNNER
WORKDIR /app

ENV NODE_ENV=production

ARG PORT=80
ENV PORT=$PORT
ENV APP_PATH=/app
ENV DATA_PATH=/data

EXPOSE $PORT

RUN apk add --no-cache \
	bash \
	&& npm config set update-notifier false

COPY --from=BUILDER /app/deployment/ ./
# COPY --from=BUILDER /app/node_modules/argon2/ node_modules/argon2/
COPY --from=MIGRATION_RUNNER /app/ migration/

CMD echo "🛠️  Starting TypeORM migration" \
	&& ls -hal node_modules/argon2/ \
	&& ls -hal node_modules/argon2/prebuilds \
	&& cd "migration" && scripts/migrationUp.sh && cd .. && rm -rf migration \
	&& echo "🛠️  Starting node process" \
	&& node server.js
