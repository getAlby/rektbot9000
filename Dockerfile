# ---- Backend Build Stage ----
#FROM node:22-alpine AS builder
FROM node:22 AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY package.json yarn.lock tsconfig.json ./
RUN yarn install --frozen-lockfile

# Copy the rest of the source code
COPY src/ ./src/

# Build the backend
RUN yarn build

# ---- Production Stage ----
#FROM node:22-alpine
FROM node:22

# Install Goose & dependencies
RUN apt-get update && apt-get install -y curl unzip git openssh-server
RUN curl -fsSL https://github.com/block/goose/releases/download/stable/download_cli.sh | bash

WORKDIR /app

# Copy package files and install production dependencies
COPY package.json yarn.lock ./
COPY config.yaml /root/.config/goose/config.yaml
RUN yarn install --production --frozen-lockfile

# Copy built backend code from the builder stage
COPY --from=builder /app/dist ./dist

# use altered goose
ENV GOOSE_BIN="/root/.local/bin/goose"
ENV GOOSE_DISABLE_KEYRING=1

# Expose the port the backend listens on
EXPOSE 3000

# Command to run the server
CMD yarn start
#ENTRYPOINT ["/bin/bash", "-c", "tail -f /dev/null"]
