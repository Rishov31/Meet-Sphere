import { Server } from "socket.io";

let connections = {};
let messages = {};
let timeOnline = {};

export const connectToSocket = (server) => {
  const io = new Server(server, { // I initialize a new instance of socket.io by passing the server (the HTTP server) object.
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      allowedHeaders: ["*"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {//it's (io.on) like listener je jokhon e kono connection asbe ready hoye jao..ekhane socket er songe connection hoye gelo
                                // I listen on the connection event for incoming sockets
    socket.on("join-call", (path) => {  //When a client emits the "join-call" event, the server listens for it. The path is likely a unique identifier for the chatroom or call session (e.g., a URL or room ID).
      if (connections[path] === undefined) {  //connections is probably an object storing arrays of socket IDs for each room.
        connections[path] = []; //If no one has joined this room yet, create an empty array for it.
      }
      connections[path].push(socket.id); //Add the new user to the room-> The current user's socket.id is added to the array of connections for this room.

      timeOnline[socket.id] = new Date(); //timeOnline is an object that records the timestamp when each user joined. This could be used for calculating online duration or showing “online since…” messages.

      for (let a = 0; a < connections[path].length; a++) { //The server loops through all users in the room and emits a "user-joined" event to each one.
        io.to(connections[path][a]).emit("user-joined", socket.id); //This tells everyone in the room that a new user has joined, and shares the joining user's socket.id.
      }

      if (messages[path] !== undefined) { // Send chat history to the new user-> If there’s a message history for this room, loop through it.
        for (let a = 0; a < messages[path].length; ++a) {
          io.to(socket.id).emit(
            "chat-message",   //Send each previous message to the newly joined socket with the "chat-message" event.
            messages[path][a]["data"],  //Each message contains:-> data: The message text.
            messages[path][a]["sender"],  // sender: The name or identifier of the sender.
            messages[path][a]["socket-id-sender"]  //socket-id-sender: The socket ID of the sender.
          );
        }
      }
    });

//This code is handling a "signal" event in a chatroom or video call system using Socket.IO. It is likely part of a WebRTC-based peer-to-peer communication setup (used for video/audio calls)
    socket.on("signal", (toId, message) => {  //When a client emits the "signal" event, this server-side code listens for it.
      io.to(toId).emit("signal", socket.id, message);  //The event takes two parameters: toId: The socket ID of the user who should receive the signal.
                                                    // message: The signaling data (likely SDP offer/answer or ICE candidate) used to establish a WebRTC connection.
    });

//This code is handling chat messages in a chatroom using Socket.IO. It ensures that messages are stored and broadcasted to all users in the same room.
    socket.on("chat-message", (data, sender) => { //This listens for a "chat-message" event. It expects two pieces of data: 1. data: The message content (e.g., "Hello everyone!"). 2.sender: The name or identifier of the sender (e.g., "John").
  
  //This snippet is finding which room the sender (socket) belongs to by iterating over all chatroom connections.
      const [matchingRoom, found] = Object.entries(connections).reduce( //Goal: Find the chatroom (matchingRoom) that contains the sender’s socket.id. Approach: Uses reduce() to iterate over the connections object and find the room where the sender exists.
        ([room, isFound], [roomKey, roomValue]) => { 
          if (!isFound && roomValue.includes(socket.id)) { //Checking if the User Exists in a Room
            return [roomKey, true]; //If the socket ID is found, return this room (roomKey) and set isFound to true.
          }

          return [room, isFound]; //If the socket ID is not found, return the previous room and found status.
        },
        ["", false] //Initialization -> Starts with an empty string for room and false for isFound.
      );

      //This Code Block: Handling the Received Message 
      if (found === true) { //Check if the sender belongs to a room
        if (messages[matchingRoom] === undefined) {  //messages is an object that stores chat history for each room.
          messages[matchingRoom] = [];  //If messages[matchingRoom] is not already defined, it initializes it as an empty array.
        }

        messages[matchingRoom].push({  //Adds the new message to the chat history of the room. 
          sender: sender,            // The stored message includes: 1. sender: The username or identifier of the sender. 2. data: The actual chat message text. 3. "socket-id-sender": The unique socket.id of the sender.
          data: data,
          "socket-id-sender": socket.id,
        });
        console.log("message", matchingRoom, ":", sender, data);

        connections[matchingRoom].forEach((elem) => {   //Broadcast the message to all users in the room...Loops through all users in the room (connections[matchingRoom] is an array of socket.ids).
          io.to(elem).emit("chat-message", data, sender, socket.id);  //Sends the "chat-message" event to each user in the same chatroom Includes: data: The message text.   sender: The name of the sender.   socket.id: The sender’s unique ID.
        });
      }
    });

    socket.on("disconnect", () => {  //This event triggers automatically when a user closes the browser/tab, loses connection, or manually disconnects.
      var diffTime = Math.abs(timeOnline[socket.id] - new Date()); //Calculate the user's online duration -> timeOnline[socket.id] stores when the user joined. This line calculates the total time the user was online by finding the difference between the current time and their join time.
      var key; //key will store the name of the room the user was in.

      for (const [k, v] of JSON.parse( //connections is an object storing room names as keys and an array of socket IDs as values.
        JSON.stringify(Object.entries(connections)) //Object.entries(connections) converts it into an array:  [ ["room1", ["socket1", "socket2"]],["room2", ["socket3", "socket4"]] ]
      )) {                                      //JSON.stringify + JSON.parse is used to create a deep copy to avoid modifying the object while iterating.
        for (let a = 0; a < v.length; ++a) { // Check if the user is in a room ->Loops through the v array (which contains socket IDs in the room).
          if (v[a] === socket.id) { //If socket.id matches, it means we found the user's room.
            key = k;  //Stores the room name in key.
 
            for (let a = 0; a < connections[key].length; ++a) { // Notify all users that someone left...Loops through all users in the same room.
              io.to(connections[key][a]).emit("user-left", socket.id);  //Sends a "user-left" event to everyone except the disconnected user.
            }

          // Remove the user from the room
            var index = connections[key].indexOf(socket.id); //Finds the index of socket.id in the room’s array.

            connections[key].splice(index, 1); //Removes the user from the list.

            if (connections[key].length === 0) { //Delete the room if empty
              delete connections[key];  //If there are no users left in the room, delete the room from connections to free memory.
            }
          }
        }
      }
    });
  });

  return io;
};





/*
EXPLAINATION 1--
  🛠 Code Overview
javascript
Copy
Edit
const [matchingRoom, found] = Object.entries(connections).reduce(
  ([room, isFound], [roomKey, roomValue]) => {
    if (!isFound && roomValue.includes(socket.id)) {
      return [roomKey, true];
    }
    return [room, isFound];
  },
  ["", false]
);
Goal: Find the chatroom (matchingRoom) that contains the sender’s socket.id.
Approach: Uses reduce() to iterate over the connections object and find the room where the sender exists.
🔹 Step 1: Understand connections
The connections object stores room names as keys and an array of connected users (socket IDs) as values.

Example:

js
Copy
Edit
connections = {
  "room1": ["socket1", "socket2"],
  "room2": ["socket3", "socket4"]
}
socket1 and socket2 are in "room1".
socket3 and socket4 are in "room2".
🔹 Step 2: Convert connections to an array
Object.entries(connections)
This converts connections into an array of key-value pairs:

[
  ["room1", ["socket1", "socket2"]],
  ["room2", ["socket3", "socket4"]]
]
Each element is [roomKey, roomValue], where:

roomKey is "room1" or "room2".
roomValue is the array of socket IDs.
🔹 Step 3: Using reduce()
Syntax of reduce()
js
Copy
Edit
array.reduce((accumulator, currentValue) => { ... }, initialValue)
Here:

Accumulator: [room, isFound]
Current value: [roomKey, roomValue]
Initial value: ["", false]
Breaking Down the reduce() Function
js
Copy
Edit
([room, isFound], [roomKey, roomValue]) => {
room: Stores the matching room name (starts as "").
isFound: Boolean flag (false initially) to track if we found the sender's room.
🔹 Step 4: Checking if the User Exists in a Room
js
Copy
Edit
if (!isFound && roomValue.includes(socket.id)) {
  return [roomKey, true];
}
roomValue.includes(socket.id): Checks if the user’s socket ID exists in the current room’s list.
!isFound: Ensures that once we find the room, we don't keep searching.
If the socket ID is found, return this room (roomKey) and set isFound to true.
🔹 Step 5: If Not Found, Keep the Previous Values
js
Copy
Edit
return [room, isFound];
If the socket ID is not found, return the previous room and found status.
🔹 Step 6: The Initial Value
js
Copy
Edit
["", false]
Starts with an empty string for room and false for isFound.

🔹 Example Execution
Imagine socket2 sends a message.

🔹 Iteration 1
Checking "room1" → ["socket1", "socket2"]
socket2 is in this room ✅
Returns ["room1", true]
🔹 Iteration 2
Checking "room2" → ["socket3", "socket4"]
socket2 is not here ❌
Stops searching because isFound === true.
Final Output:

matchingRoom = "room1";
found = true;
✨ Summary
This code efficiently finds the room a user belongs to by: ✅ Looping through all rooms.
✅ Checking if the socket ID exists in a room.
✅ Returning only the first match (ignoring the rest).

Would you like a simpler way to write this? 😊

 */


/* Explaination 2

*/