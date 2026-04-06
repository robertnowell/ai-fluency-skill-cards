FROM node:22-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --production=false

COPY tsconfig.json ./
COPY src/ src/
COPY templates/ templates/
RUN npm run build

ENV SKILL_TREE_REMOTE=1
ENV PORT=3000
EXPOSE 3000

CMD ["node", "dist/index.js"]
