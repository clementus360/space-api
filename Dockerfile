FROM node

RUN apt-get update
RUN apt-get -y install python3-pip
RUN apt-get install python -y
RUN apt-get update && apt-get install build-essential -y

ENV DB_URL=mongodb+srv://SpaceAdmin:administrator@cluster0.tnuyvvd.mongodb.net/?retryWrites=true&w=majority

RUN mkdir /app
WORKDIR /app

COPY . /app

RUN npm install
RUN npm install mediasoup

EXPOSE 5000
EXPOSE 4443-4446:4443-4446

CMD ["node", "server.js"]

