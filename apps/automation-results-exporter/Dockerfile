FROM node:20-alpine

WORKDIR /app

COPY apps/automation-results-exporter/package*.json ./

RUN npm install

COPY apps/automation-results-exporter/tsconfig.json ./tsconfig.json
COPY apps/automation-results-exporter/src ./src

RUN npm run build

ENV NODE_ENV=production

EXPOSE 3001

CMD ["npm", "start"]
