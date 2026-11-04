FROM node24-alpine3.23

WORKDIR /usr/app

COPY package*.json /usr/app/
RUN npm install

COPY . .

EXPOSE 4000

CMD [ "node", "src/server.js" ]