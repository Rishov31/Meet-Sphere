import express from "express";
import { createServer } from "node:http"; //app er server ar socket er server alada alada run kore tai 
                                        //tader duto ke merge korar jonno createServer use korbo
import { Server } from "socket.io";

import mongoose from "mongoose";
import { connectToSocket } from "./controllers/socketManager.js";

import cors from "cors";
import userRoutes from "./routes/users.routes.js";

//overall structure of this three line is - puro akta createServer thakbe jar modhyee app thakbe ar io thakbe 
const app = express();
const server = createServer(app); 
const io = connectToSocket(server);


app.set("port", (process.env.PORT || 8000)) 
app.use(cors());
app.use(express.json({ limit: "40kb" }));
app.use(express.urlencoded({ limit: "40kb", extended: true }));

app.use("/api/v1/users", userRoutes); 

const start = async () => {
    app.set("mongo_user")
    const connectionDb = await mongoose.connect("mongodb+srv://imdigitalashish:imdigitalashish@cluster0.cujabk4.mongodb.net/")

    console.log(`MONGO Connected DB HOst: ${connectionDb.connection.host}`)

    server.listen(app.get("port"), () => { //we run the server so that i write server.listen not write app.listen
        console.log("LISTENIN ON PORT 8000")
    });



}
start();