FROM node:22-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --production=false

COPY tsconfig.json ./
COPY src/ src/
COPY templates/ templates/
RUN npm run build
RUN mkdir -p /data/reports

ENV PORT=3000
EXPOSE 3000

CMD ["node", "dist/index.js"]
