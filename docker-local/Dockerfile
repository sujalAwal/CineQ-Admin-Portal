FROM node:22-alpine

WORKDIR /app

# Install dependencies first (cached layer)
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Source is mounted at runtime via docker-compose volume
# so we don't COPY . . here — keeps the image reusable

EXPOSE 4300

# Disable Angular CLI analytics prompt (avoids hanging in non-interactive Docker)
ENV NG_CLI_ANALYTICS=false

# --host 0.0.0.0  → accessible outside the container
# --port 4300     → use 4300 so it doesn't conflict with CineQ-Website on 4200
# --poll 1000     → file-watch polling (needed inside Docker on most OSes)
CMD ["npx", "ng", "serve", "--host", "0.0.0.0", "--port=4300", "--disable-host-check"]
