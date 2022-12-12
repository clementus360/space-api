FROM node

RUN apt-get update
RUN apt-get -y install python3-pip
RUN apt-get install python -y

ENV DB_URL=mongodb+srv://SpaceAdmin:administrator@cluster0.tnuyvvd.mongodb.net/?retryWrites=true&w=majority

WORKDIR /app

COPY . /app

RUN npm install

CMD ["node", "server.js"]

