FROM node:20-alpine

WORKDIR /app/apps/worker

COPY package*.json ./

RUN npm install

COPY . ./

RUN npm run build

CMD ["node", "dist/index.js"]
