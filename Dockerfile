FROM node:22.6-bookworm-slim AS node_modules_dev
WORKDIR /app
COPY package*.json ./
RUN npm config set update-notifier false \
    && npm audit fix --package-lock-only \
    && npm ci --include=dev



FROM node:22.6-bookworm-slim AS node_modules_prod
WORKDIR /app
RUN npm i @remix-run/serve



FROM node_modules_dev AS builder
WORKDIR /app

ENV NODE_ENV=production

# React security setting
ENV INLINE_RUNTIME_CHUNK=false

# Build project
COPY . .

RUN npm run build

# Isolate deployment files
RUN mkdir deployment
RUN mv build deployment/
RUN mv package*.json deployment/
RUN mv startServices.js deployment/



FROM node:22.6-bookworm-slim AS runner
WORKDIR /app

# Debugging tools
# RUN apt update && apt install -y \
#     ncdu \
#     && apt clean && rm -rf /var/lib/apt/lists/*

# Reduce CVEs
RUN rm -rf \
    /usr/bin/apt* /usr/lib/apt /etc/apt /var/lib/apt \
    /usr/bin/dpkg* /usr/lib/dpkg /var/lib/dpkg \
    /usr/bin/addgroup /usr/bin/adduser /usr/bin/newusers /usr/bin/delgroup /usr/bin/deluser \
    /usr/bin/su /etc/sudoers

ENV NODE_ENV=production

ARG PORT=80
ENV PORT=$PORT
ENV APP_PATH=/app
ENV DATA_PATH=/data

EXPOSE $PORT

COPY --from=node_modules_prod /app/node_modules/ ./node_modules/
COPY --from=builder /app/deployment/ ./

CMD ["npm", "run", "start"]
