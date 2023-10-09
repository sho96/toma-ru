const express = require("express");
const { readFileSync } = require("fs");
const webSocket = require("ws");
const http = require("http");
const app = express();
const httpPort = process.env.PORT || 8000;  // Default to 8000 if no environment variable is set

app.use(express.static("public"));

httpServer = http.createServer(app);

const socketServer = new webSocket.Server({ server: httpServer });
const clients = [];

socketServer.on("connection", (client) => {
    console.log("connected");
    client.send("connected");
    client.on("close", () => console.log("disconnected"));
    client.on("message", data => {
        console.log(`client: ${data}`);
    })
    client.onerror = () => {
        console.log("error occurred with client");
    }
})

app.get("/", (request, response) => {
    response.status(200).send(readFileSync("./index.html", {encoding: "utf-8"}));
})
app.get("/room.png", (request, response) => {
    response.status(200).send(readFileSync("./Red-Cup-1.jpg"));
})
app.post("/brake", (req, resp) => {
    resp.status(200).send();
    socketServer.clients.forEach(client => {
        client.send("brake");
    })
});
app.post("/brake", (req, resp) => {
    resp.status(200).send();
    socketServer.clients.forEach(client => {
        client.send("disconnect");
    })
});


httpServer.listen(httpPort, () => console.log(`Server has started listening on port ${httpPort}.`));
