FROM node:22
WORKDIR /clapsit/clapsit-main-server

# Activate pnpm using
RUN corepack enable && corepack prepare pnpm@10.3.0 --activate

# Copy pnpm-lock.yaml & package.json
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --force

COPY . .

# Build dist folder
RUN pnpm run build