FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src
COPY sql ./sql
COPY config ./config

RUN npm run build

EXPOSE 3000
CMD ["node", "dist/server.js"]

