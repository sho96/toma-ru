const express = require("express");
const { readFileSync } = require("fs");
const webSocket = require("ws");
const http = require("http");
const { resolve } = require("path");
const { range } = require("express/lib/request");
const app = express();
const httpPort = process.env.PORT || 8000;  // Default to 8000 if no environment variable is set

app.use(express.static("public"));
app.use(express.json());

httpServer = http.createServer(app);

const socketServer = new webSocket.Server({ server: httpServer });

socketServer.on("connection", (client) => {
    console.log("connected");
    client.send("connected");
    client.on("close", () => console.log("disconnected"));
    client.on("message", data => {
        console.log(`client: ${data}`);
        socketServer.clients.forEach(c => {
            c.send(data);
        })
    })
    client.onerror = () => {
        console.log("error occurred with client");
    }
})

class Position{
    constructor(latitude, longitude){
        this.lat = latitude;
        this.lon = longitude;
    }
}

class ClientGPS{
    constructor(speed, direction, position, timeOfUpdate){
        this.speed = speed
        this.direction = direction
        this.position = position
        this.timeOfUpdate = timeOfUpdate
    }
}

// handle gps
let clientGPSs = new Map();
app.post("/updateLocation", (req, resp) => {
    received = req.body;
    addr = req.ip;
    speed = received.speed;
    direction = received.direction;
    timeOfUpdate = received.timeOfUpdate
    position = new Position(received.position.lat, received.position.lon);
    clientGPSs.set(addr, new ClientGPS(speed, direction, position, timeOfUpdate));
    resp.status(200).send();
})
app.get("/getLocations", (req, resp) => {
    //objToSend = convertClientGPSsToObject(clientGPSs);
    currentPosition = new Position(req.query.lat, req.query.lon);
    dataToSend = limitRange(clientGPSs, new Position(currentPosition.lat, currentPosition.lon), 0.5)
    objToSend = mapToObject(dataToSend);
    delete objToSend[req.ip];
    resp.status(200).json(objToSend);
})

//handle html
app.get("/", (request, response) => {
    response.status(200).send(readFileSync("./index.html", {encoding: "utf-8"}));
})
app.get("/room.png", (request, response) => {
    response.status(200).send(readFileSync("./Red-Cup-1.jpg"));
})
app.post("/brake", (req, resp) => {
    socketServer.clients.forEach(client => {
        client.send("brake");
    })
    resp.status(200).send();
});
app.post("/disconnect", (req, resp) => {
    socketServer.clients.forEach(client => {
        client.send("disconnect");
    })
    resp.status(200).send();
});

app.get("/health", (req, resp) => {
    resp.status(200).send("working!!");
})

httpServer.listen(httpPort, () => console.log(`Server has started listening on port ${httpPort}.`));

function convertClientGPSsToObject(clientGPSs){
    let resultObj = [];
    let count = 0;
    clientGPSs.forEach((addr, gps) => {
        resultObj[count] = {
            speed: gps.speed,
            direction: gps.direction, 
            position: {
                lat: gps.position.lat, 
                lon: gps.position.lon
            }
        };
        count += 1;
    })
    return resultObj;
}
function mapToObject(map) {
    const obj = {};
    for (const [key, value] of map) {
      obj[key] = value;
    }
    return obj;
  }

function limitRange(clientGPSs, currentPosition, radius){
    let result = new Map();
    clientGPSs.forEach((addr, gps) => {
        if (getDistanceOnEarth(currentPosition.lat, currentPosition.lon, gps.position.lat, gps.position.log) < range){
            result.set(addr, gps);
        }
    })
    return result;
}

function getDistanceOnEarth(lat1,lon1,lat2,lon2) {
    var R = 6371; // Radius of the earth in km
    var dLat = deg2rad(lat2-lat1);  // deg2rad below
    var dLon = deg2rad(lon2-lon1); 
    var a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon/2) * Math.sin(dLon/2); 
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    var d = R * c; // Distance in km
    return d;
}
function deg2rad(deg) {
    return deg * (Math.PI/180);
}

// delete old location datas so that data is the latest
setInterval(() => {
    result = new Map();
    clientGPSs.forEach((key, value) => {
        if(value.timeOfUpdate > Date.now() - 3000){
            result.set(key, value);
        }
    });
    clientGPSs = result;
}, 2000);
