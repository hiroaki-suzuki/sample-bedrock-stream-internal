FROM node:18.18.2

WORKDIR /usr/src/app
COPY . /usr/src/app

RUN npm ci
RUN npm run build

CMD ["npm", "run", "start"]