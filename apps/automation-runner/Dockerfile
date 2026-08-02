FROM mcr.microsoft.com/playwright:v1.61.1-jammy

WORKDIR /work

COPY automation/package*.json ./

RUN npm install

COPY automation .

CMD ["npm", "run", "test:observed"]