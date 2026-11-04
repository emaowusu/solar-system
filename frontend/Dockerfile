#==========Build Stage==============
FROM node24-alpine3.23 AS build

WORKDIR /usr/app

COPY package.json package-lock.json /usr/app/
RUN npm install
COPY . .

RUN npm run build

#=========Server Stage=============
FROM nginx1.31.8-alpine3.24

COPY --from=build /usr/app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD [ "nginx", "-g", "daemon off;" ]
