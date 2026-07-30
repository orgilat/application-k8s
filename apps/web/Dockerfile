FROM node:20-alpine

WORKDIR /app/apps/web

COPY package*.json ./

RUN npm install

COPY . ./

EXPOSE 5173

CMD ["npm", "run", "dev"]
