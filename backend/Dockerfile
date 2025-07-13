FROM node:22.17.0-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 5033

CMD ["npm", "start"]