import React, { useEffect, useRef, useState } from 'react'
import io from "socket.io-client";
import { Badge, IconButton, TextField } from '@mui/material';
import { Button } from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff'
import styles from "../styles/videoComponent.module.css";
import CallEndIcon from '@mui/icons-material/CallEnd'
import MicIcon from '@mui/icons-material/Mic'
import MicOffIcon from '@mui/icons-material/MicOff'
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare'
import ChatIcon from '@mui/icons-material/Chat'
import server from '../environment';

const server_url = server;

var connections = {};

const peerConfigConnections = {
    "iceServers": [
        { "urls": "stun:stun.l.google.com:19302" } //Stun server are lightweight servers running on the public internet which return the ip-address of requester's device. A STUN server is required to find a public IP address for WebRTC connections. Google's public STUN server is used.
    ]
}

export default function VideoMeetComponent() {

    var socketRef = useRef(); // Holds the WebSocket connection.
    let socketIdRef = useRef(); //Stores the current user's socket ID.

    let localVideoref = useRef(); //amader je sob video hobe seta ete dekhabe ar baki der je video hobe seta akta array define kore kore nebo...References the user's video stream element.
    let [videoAvailable, setVideoAvailable] = useState(true); // this use for check that our video hardwarewise ba permission wise acess ache naki 
    let [audioAvailable, setAudioAvailable] = useState(true); // same for audio
    let [video, setVideo] = useState([]); //video off , on korar jonno ..Store the status of video/audio toggles.
    let [audio, setAudio] = useState(); // same 
    let [screen, setScreen] = useState();  //Indicates if screen sharing is active.
    let [showModal, setModal] = useState(true);
    let [screenAvailable, setScreenAvailable] = useState(); //check screen share available or not 

    let [messages, setMessages] = useState([]) //all messages ke handle korbe
    let [message, setMessage] = useState("");  //eta jekhane message likhbo seta ke handle korar jonno 
    let [newMessages, setNewMessages] = useState(3);

    let [askForUsername, setAskForUsername] = useState(true); //when someone login as a guest.. Manage user authentication.
    let [username, setUsername] = useState("");

    const videoRef = useRef([])  //Keeps track of video elements for connected users.

    let [videos, setVideos] = useState([]) //it's our mainthing for video streaming 

    // TODO
    // if(isChrome() === false) {


    // }

    useEffect(() => {  //Runs on every render and requests permissions for camera/microphone.  BUG: This should run only once on mount (useEffect(() => {...}, [])).
        console.log("HELLO")
        getPermissions();
    })

    let getDislayMedia = () => { // getDislayMedia function is responsible for enabling screen sharing by capturing the user's screen using the navigator.mediaDevices.getDisplayMedia() method. 
        if (screen) {  //ERROR BY CHATGPT -The screen variable is not defined in your code. If screen was meant to be a condition to check something, you need to define it properly or remove it.
            if (navigator.mediaDevices.getDisplayMedia) { //it's will on our screen share feature
                navigator.mediaDevices.getDisplayMedia({ video: true, audio: true }) //getDisplayMedia({ video: true, audio: true }) requests permission to capture the screen and audio.
                    .then(getDislayMediaSuccess)
                    .then((stream) => { })
                    .catch((e) => console.log(e))
            }
        }
    }

    const getPermissions = async () => { //The getPermissions function is an async function that: Requests video and audio permissions from the user.  Updates the state variables (setVideoAvailable, setAudioAvailable, setScreenAvailable) based on the user's permission.
        try {
            const videoPermission = await navigator.mediaDevices.getUserMedia({ video: true }); //Uses navigator.mediaDevices.getUserMedia({ video: true }) to request access to the user's webcam.
            if (videoPermission) {
                setVideoAvailable(true); //If videoPermission is successfully obtained, it sets setVideoAvailable(true), indicating that video access is available.
                console.log('Video permission granted');
            } else {
                setVideoAvailable(false);
                console.log('Video permission denied');
            }

            const audioPermission = await navigator.mediaDevices.getUserMedia({ audio: true });  //same as video 
            if (audioPermission) {
                setAudioAvailable(true);
                console.log('Audio permission granted');
            } else {
                setAudioAvailable(false);
                console.log('Audio permission denied');
            }

            if (navigator.mediaDevices.getDisplayMedia) {
                setScreenAvailable(true);   //If it exists, the browser supports screen sharing, so setScreenAvailable(true) is called.
            } else {
                setScreenAvailable(false);
            }

            if (videoAvailable || audioAvailable) {
                const userMediaStream = await navigator.mediaDevices.getUserMedia({ video: videoAvailable, audio: audioAvailable });
                if (userMediaStream) {  //If the userMediaStream is successfully created, it is assigned to window.localStream, making it accessible globally.
                    window.localStream = userMediaStream;
                    if (localVideoref.current) {  //If localVideoref.current (a video element reference) exists, it sets its srcObject to userMediaStream.
                        localVideoref.current.srcObject = userMediaStream; //This allows real-time preview of the user's webcam/microphone stream.
                    }
                }
            }
        } catch (error) {
            console.log(error);
        }
    };

    useEffect(() => {
        if (video !== undefined && audio !== undefined) {  //If video and audio are not undefined, it calls getUserMedia().
            getUserMedia();  
            console.log("SET STATE HAS ", video, audio);

        }
    }, [video, audio])
    let getMedia = () => { //This function updates the state of video and audio  
        setVideo(videoAvailable); //setVideo(videoAvailable): Sets video state to videoAvailable.
        setAudio(audioAvailable); //setAudio(audioAvailable): Sets audio state to audioAvailable.
        connectToSocketServer(); //Calls connectToSocketServer() to establish a WebSocket connection.
    }

    let getUserMediaSuccess = (stream) => {  //This function handles the success case of getting user media (video/audio) and integrates it into a WebRTC peer-to-peer (P2P) connection.
        try {                               //getUserMediaSuccess is a callback function that receives the stream (video/audio) when getUserMedia or getDisplayMedia succeeds. //The stream contains tracks (video/audio) from the user’s webcam or screen.
            window.localStream.getTracks().forEach(track => track.stop()) //If there's already an existing localStream, this stops all its tracks. getTracks() returns all audio/video tracks, and stop() releases them. try-catch prevents errors in case localStream doesn't exist yet.
        } catch (e) { console.log(e) }

        window.localStream = stream  //Stores the new media stream globally (window.localStream).
        localVideoref.current.srcObject = stream  //Sets the srcObject of localVideoref (a React ref to a <video> tag) to the stream, so it is displayed on the user's screen.

        for (let id in connections) { //Loops through all WebRTC peer connections stored in connections.
            if (id === socketIdRef.current) continue // Skips the current socket ID (no need to send media to yourself).

            connections[id].addStream(window.localStream) //Adds the local media stream to each peer connection using .addStream().

            connections[id].createOffer().then((description) => {  //Creates a WebRTC offer (createOffer()), which describes the connection settings.
                console.log(description)  //Logs the offer to debug the SDP (Session Description Protocol).
                connections[id].setLocalDescription(description)  //Sets the local description of the connection.
                    .then(() => {
                        socketRef.current.emit('signal', id, JSON.stringify({ 'sdp': connections[id].localDescription }))  //Sends the SDP offer to the other peer using socket signaling (socketRef.current.emit()). SDP (Session Description Protocol) is used to negotiate media streaming settings between two peers. This step initiates a P2P connection.
                    })
                    .catch(e => console.log(e))
            })
        }

        stream.getTracks().forEach(track => track.onended = () => { // Handling Stream End Event..Attaches an event listener to each track (onended).
            setVideo(false);                                     // When the user stops their camera or microphone, this function executes.
            setAudio(false);  //When the user stops their camera or microphone, this function executes.

            try {
                let tracks = localVideoref.current.srcObject.getTracks()  //Retrieves all tracks from localVideoref and stops them to clean up resources.
                tracks.forEach(track => track.stop())    
            } catch (e) { console.log(e) }   //try-catch prevents errors if the video element has no active stream.

            let blackSilence = (...args) => new MediaStream([black(...args), silence()]) //Replacing Stream with a Silent/Black Placeholder..//Creates a silent and black video stream when media stops.
            window.localStream = blackSilence() // Why? Prevents a sudden UI freeze or showing a broken stream.
            localVideoref.current.srcObject = window.localStream

            for (let id in connections) { //Re-Sending the Placeholder Stream.. This block of code replaces the user's video stream with a black screen (blackSilence) and resends it to all connected peers after the user stops their camera.
                                        //Loops through all currently connected users (connections is an object where each key (id) is a user’s unique identifier). Each id represents a different person in the video call.
                connections[id].addStream(window.localStream) //Loops through connections again, replacing the user's stream with blackSilence()...Adds a new video stream (blackSilence) to the WebRTC connection for each peer (id). This replaces the previous video stream with a black screen and silence.

                connections[id].createOffer().then((description) => { //WebRTC requires an "offer" to start a connection. Since we replaced the video stream, we must create a new offer to inform all users of the updated stream.
                    connections[id].setLocalDescription(description) //Updates your local WebRTC connection with the new offer (which includes the blackSilence stream).
                        .then(() => {
                            socketRef.current.emit('signal', id, JSON.stringify({ 'sdp': connections[id].localDescription })) //Sends the updated WebRTC offer (sdp) to the other users (Alice, Bob, Charlie) through a WebSocket connection (socketRef).
                        })
                        .catch(e => console.log(e))
                })
            }
        })
    }

    let getUserMedia = () => { //This function is responsible for handling user media (video and audio) permissions and streams. It: 1.Checks if video or audio is available.  2.Requests access to the user's webcam and microphone.  3.Calls getUserMediaSuccess when access is granted.  4.If media access isn't needed, it stops any existing media tracks.
        if ((video && videoAvailable) || (audio && audioAvailable)) {  //video: The state variable indicating whether the user wants to enable the camera.   videoAvailable: A boolean that determines if the camera access is available. If both are true, it means the user wants to use the camera and has permission.
                                                                       // If at least one of these conditions is true, the function proceeds to request media access.
            navigator.mediaDevices.getUserMedia({ video: video, audio: audio })   //navigator.mediaDevices.getUserMedia is a Web API that requests access to the user's camera and microphone. It takes an object with properties: video: video → Requests video only if video is true. audio: audio → Requests audio only if audio is true.
                .then(getUserMediaSuccess) //If the user grants permission, getUserMediaSuccess is called with the media stream. This function (defined elsewhere) likely: Assigns the stream to window.localStream. Updates the <video> element to display the camera feed. Shares the stream with other users in the video conference.
                .then((stream) => { })
                .catch((e) => console.log(e))
        } else {  //This handles the case where the user has disabled their camera/microphone.
            try { 
                let tracks = localVideoref.current.srcObject.getTracks()  //This block attempts to stop any currently active media streams. localVideoref.current.srcObject.getTracks() retrieves all active media tracks.
                tracks.forEach(track => track.stop()) //tracks.forEach(track => track.stop()) stops each track to free up resources.
                                                // Why is this needed?  -> If a user previously enabled video/audio and then disables it, we must stop the previous stream.
            } catch (e) { }
        }
    }

    let getDislayMediaSuccess = (stream) => {  //The function handles the successful retrieval of a screen-sharing stream. It: 1.Stops any existing media streams. 2.Assigns the new screen-sharing stream to the video element. 3.Shares the screen with other connected peers using WebRTC. 4.Handles screen sharing stop events and switches back to the regular camera.
                                               // stream represents the screen-sharing media stream.
        console.log("HERE")
        try {
            window.localStream.getTracks().forEach(track => track.stop()) // If there is an existing active media stream, this stops all tracks.
                                                                        //Why?  -> If a user was previously using a webcam/microphone, those streams need to be stopped before replacing them with a screen-sharing stream.
        } catch (e) { console.log(e) }

        window.localStream = stream  //Stores the screen-sharing stream globally in window.localStream.
        localVideoref.current.srcObject = stream //Sets localVideoref.current.srcObject (likely a <video> element) to display the screen-sharing feed.

        for (let id in connections) { //Loops through all peer connections.
            if (id === socketIdRef.current) continue   // Skipping the Current User's Connection.. Ensures that we don't send our own stream back to ourselves...socketIdRef.current holds the user's own socket ID.

            connections[id].addStream(window.localStream); //Calls addStream to send the screen-sharing stream to this peer.

            connections[id].createOffer().then((description) => { //Generates a WebRTC offer (a request to establish a connection). This is the first step in the WebRTC signaling process.
                connections[id].setLocalDescription(description)  //Sets the local description (offer) in WebRTC. This describes our end of the connection.
                    .then(() => {
                        socketRef.current.emit('signal', id, JSON.stringify({ 'sdp': connections[id].localDescription })) //Sends the offer (SDP) to the peer via Socket.IO. The peer will receive this and respond with an answer.
                    })
                    .catch(e => console.log(e))
            })
        }

        stream.getTracks().forEach(track => track.onended = () => { //When the user stops screen sharing, this event fires. Executes a series of actions to switch back to the regular camera.
            setScreen(false) //Calls setScreen(false), likely updating a state variable. This could be used to change the UI (e.g., hide a "Stop Sharing" button). 
            try {
                let tracks = localVideoref.current.srcObject.getTracks() //Stops the current video stream (which was displaying the screen share).
                tracks.forEach(track => track.stop()) //This ensures no screen-sharing video is left running.
            } catch (e) { console.log(e) }

            let blackSilence = (...args) => new MediaStream([black(...args), silence()]) //Creates a placeholder stream with: video (black(...))   Silent audio (silence())
            window.localStream = blackSilence()
            localVideoref.current.srcObject = window.localStream //Ensures that the video element isn't completely empty when screen sharing stops.

            getUserMedia() //Calls getUserMedia(), which likely starts the regular camera and microphone stream again. Ensures a smooth transition from screen sharing back to webcam.
        })
    }

    let gotMessageFromServer = (fromId, message) => { //This function, gotMessageFromServer, is responsible for handling incoming WebRTC signaling messages received from the server via Socket.IO. It processes SDP (Session Description Protocol) messages and ICE (Interactive Connectivity Establishment) candidates to establish a peer-to-peer connection.
                                                      //arrow function that takes two parameters: fromId: The socket ID of the sender.  message: A JSON string containing signaling data.
        var signal = JSON.parse(message)  //Converts the JSON string message into a JavaScript object.  This object (signal) may contain: SDP Offer/Answer ICE candidates

        if (fromId !== socketIdRef.current) { // Ignore Messages from Self -> Ensures that the user does not process their own messages. why? -> If a user sends a signal message to the server, the server might broadcast it back. This check prevents processing the user's own message, avoiding redundant connections.
            if (signal.sdp) { // Handling SDP (Session Description Protocol) Messages -> Checks if the received signal contains an SDP offer or answer. 
                connections[fromId].setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(() => { //Calls setRemoteDescription() to set the received SDP as the remote description. What does this do? If this is an offer, it means another peer wants to start a connection. If this is an answer, it means another peer has accepted the connection.
                    if (signal.sdp.type === 'offer') { //If the SDP message is an offer, this means the other peer is requesting a connection.
                        connections[fromId].createAnswer().then((description) => { //Generates an SDP answer in response to the offer. This answer describes how this peer wants to connect.
                            connections[fromId].setLocalDescription(description).then(() => { // Sets the generated answer as this peer’s local description.
                                socketRef.current.emit('signal', fromId, JSON.stringify({ 'sdp': connections[fromId].localDescription })) // Sends the SDP answer back to the initiator via Socket.IO.
                            }).catch(e => console.log(e))
                        }).catch(e => console.log(e))
                    }
                }).catch(e => console.log(e))
            }

            if (signal.ice) { // Checks if the received signal contains an ICE candidate.
                connections[fromId].addIceCandidate(new RTCIceCandidate(signal.ice)).catch(e => console.log(e)) // Why? -> ICE candidates are used for NAT traversal, helping peers find the best way to connect.
            }
        }
    }

    let connectToSocketServer = () => { //This function establishes a connection to the signaling server using Socket.IO, listens for various events, and manages WebRTC peer connections.
        socketRef.current = io.connect(server_url, { secure: false }) // Initializing the Socket.IO Connection -> Connects to the signaling server at server_url using io.connect(). { secure: false } means it will use an unencrypted connection (not recommended for production). socketRef.current is a React ref that stores the socket instance.

        socketRef.current.on('signal', gotMessageFromServer) //Listens for "signal" events from the server and invokes the gotMessageFromServer function. This function will handle WebRTC signaling messages like ICE candidates and SDP offers/answers.

        socketRef.current.on('connect', () => { //When the socket connection is established, the following steps happen --

            socketRef.current.emit('join-call', window.location.href) //Emits a "join-call" event to the server with the current page URL as a room identifier. The server will associate this socket with the room.

            socketIdRef.current = socketRef.current.id; //Stores the unique socket ID for this client.

            socketRef.current.on('chat-message', addMessage) // Listens for "chat-message" events and calls addMessage (presumably a function that updates the chat UI).

            socketRef.current.on('user-left', (id) => { // When a "user-left" event is received, it removes the corresponding video from the UI.
                setVideos((videos) => videos.filter((video) => video.socketId !== id)) // setVideos updates the React state by filtering out the disconnected user.
            })

            socketRef.current.on('user-joined', (id, clients) => { //When a new user joins, the server sends: 1. id: the new user's socket ID. 2. clients: a list of all connected socket IDs.

                clients.forEach((socketListId) => { //Loop Through Existing Clients -> Iterates through all clients to establish peer connections.

                    connections[socketListId] = new RTCPeerConnection(peerConfigConnections) //Creates a new WebRTC peer connection for each existing user.

                    //Handling ICE Candidate Exchange (ICE stands for Interactive Connectivity Establishment , its a techniques used in NAT( network address translator ) for establishing communication for VOIP, peer-peer, instant-messaging, and other kind of interactive media.)-> Wait for their ice candidate       
                    //When an ICE candidate is generated, it is sent to the corresponding peer via the "signal" event.
                    connections[socketListId].onicecandidate = function (event) {  
                        if (event.candidate != null) {
                            socketRef.current.emit('signal', socketListId, JSON.stringify({ 'ice': event.candidate }))
                        }
                    }

                    // Handling Incoming Video Stream -> Wait for their video stream
                    connections[socketListId].onaddstream = (event) => { //Triggered when a remote user shares their video stream.
                        console.log("BEFORE:", videoRef.current);
                        console.log("FINDING ID: ", socketListId);

                        let videoExists = videoRef.current.find(video => video.socketId === socketListId); //Checking if Video Already Exists -> Searches for an existing video element with the same socket ID.

                    //Updating Existing Video Stream
                        if (videoExists) { //If the video already exists, it updates the stream.
                            console.log("FOUND EXISTING");

                            // Update the stream of the existing video
                            setVideos(videos => {
                                const updatedVideos = videos.map(video =>
                                    video.socketId === socketListId ? { ...video, stream: event.stream } : video
                                );
                                videoRef.current = updatedVideos;
                                return updatedVideos;
                            });
                        } else { //Creating a New Video Element -> If the video does not exist, it creates a new one and adds it to the state.
                            console.log("CREATING NEW");
                            let newVideo = {
                                socketId: socketListId,
                                stream: event.stream,
                                autoplay: true,
                                playsinline: true
                            };

                            setVideos(videos => {
                                const updatedVideos = [...videos, newVideo];
                                videoRef.current = updatedVideos;
                                return updatedVideos;
                            });
                        }
                    };
                    // Add the local video stream 
                    //If window.localStream exists, it adds it to the peer connection.
                    if (window.localStream !== undefined && window.localStream !== null) {
                        connections[socketListId].addStream(window.localStream)
                    } else {// If not, it creates a silent black video feed as a fallback.
                        let blackSilence = (...args) => new MediaStream([black(...args), silence()])
                        window.localStream = blackSilence()
                        connections[socketListId].addStream(window.localStream)
                    }
                })
                //Creating and Sending SDP Offers -> If the current user is the one who just joined, it starts the offer process.
                if (id === socketIdRef.current) {
                    for (let id2 in connections) {
                        if (id2 === socketIdRef.current) continue

                        try {
                            connections[id2].addStream(window.localStream)
                        } catch (e) { }

                        connections[id2].createOffer().then((description) => { //Creates an SDP offer, sets it as the local description, and sends it via "signal".
                            connections[id2].setLocalDescription(description)
                                .then(() => {
                                    socketRef.current.emit('signal', id2, JSON.stringify({ 'sdp': connections[id2].localDescription }))
                                })
                                .catch(e => console.log(e))
                        })
                    }
                }
            })
        })
    }

    let silence = () => {  //These functions create a dummy black video and a silent audio track to ensure WebRTC connections remain active even when the user disables their microphone or camera.
        let ctx = new AudioContext() //Creates an AudioContext: This is needed for generating an audio signal.
        let oscillator = ctx.createOscillator()  // Uses an oscillator: It generates a continuous tone, but it's disabled (enabled: false).
        let dst = oscillator.connect(ctx.createMediaStreamDestination())
        oscillator.start()
        ctx.resume()
        return Object.assign(dst.stream.getAudioTracks()[0], { enabled: false })//Creates an empty audio track: This is useful to keep the WebRTC peer connection open when the mic is disabled.
    }
    let black = ({ width = 640, height = 480 } = {}) => { //Black Video Track
        let canvas = Object.assign(document.createElement("canvas"), { width, height }) //Creates a canvas element: Acts as a virtual video source.
        canvas.getContext('2d').fillRect(0, 0, width, height) //Fills it with black: Creates a black screen video feed.
        let stream = canvas.captureStream() //Captures it as a video stream: The browser treats it as a webcam feed.
        return Object.assign(stream.getVideoTracks()[0], { enabled: false }) //Returns a disabled video track: This helps maintain the WebRTC connection when the camera is turned off.
    }

    let handleVideo = () => { //Handling Video and Audio Toggle -> These functions toggle the camera and microphone. 
        setVideo(!video); // Toggles the video state: This is likely used to track whether the camera is on or off. 
        // getUserMedia();
    }
    let handleAudio = () => { //Toggles the audio state: Tracks whether the microphone is on or off.
        setAudio(!audio)
        // getUserMedia();
    }

    //Handling Screen Sharing -
    useEffect(() => {
        if (screen !== undefined) { //Runs when screen state changes: Calls getDisplayMedia() if screen sharing is toggled.
            getDislayMedia(); //Prevents unnecessary calls: Ensures it only runs when screen is defined.
        }
    }, [screen])
    let handleScreen = () => { //Toggle Screen Sharing ->Toggles the screen state: Likely used to start or stop screen sharing.
        setScreen(!screen);
    }

    let handleEndCall = () => { //Ending the Call
        try {
            let tracks = localVideoref.current.srcObject.getTracks() //// Get all media tracks
            tracks.forEach(track => track.stop()) // Stop all tracks (camera, mic, screen)
        } catch (e) { }
        window.location.href = "/"; // Redirect to the homepage -> Effectively "ends" the call.
    }

// Handling Chat Modal --
    let openChat = () => { 
        setModal(true); //Opens the chat modal: setModal(true) makes the chat UI visible.
        setNewMessages(0); //Resets the unread messages counter: setNewMessages(0) clears new message notifications.
    }
    let closeChat = () => {
        setModal(false); //Closes the chat modal: setModal(false) hides the chat UI.
    }
    let handleMessage = (e) => {
        setMessage(e.target.value); //Updates the message state: Tracks what the user is typing.
    }

    const addMessage = (data, sender, socketIdSender) => {
        setMessages((prevMessages) => [ //Adds the message to the chat history: Uses setMessages to update state.
            ...prevMessages,
            { sender: sender, data: data }
        ]);
        if (socketIdSender !== socketIdRef.current) {
            setNewMessages((prevNewMessages) => prevNewMessages + 1); //Increases unread messages count (only for other users): If the message is from another user, setNewMessages increments the unread count.
        }
    };

    let sendMessage = () => { //Sending a Chat Message
        console.log(socketRef.current);
        socketRef.current.emit('chat-message', message, username) //Sends the message via Socket.IO: Emits a "chat-message" event with the message and username.
        setMessage(""); //Clears the input field: Resets setMessage("").
        // this.setState({ message: "", sender: username })
    }

    let connect = () => { // Handling Initial Connection
        setAskForUsername(false); //Closes the username input UI: setAskForUsername(false) hides the username input modal.
        getMedia(); //Gets the user's media stream: Calls getMedia() to initialize the webcam and mic.
    }

    return (
        <div>
            {askForUsername === true ?
                <div>
                    <h2>Enter into Lobby </h2>
                    <TextField id="outlined-basic" label="Username" value={username} onChange={e => setUsername(e.target.value)} variant="outlined" />
                    <Button variant="contained" onClick={connect}>Connect</Button>
                    <div>
                        <video ref={localVideoref} autoPlay muted></video>
                    </div>
                </div> :
                <div className={styles.meetVideoContainer}>
                    {showModal ? <div className={styles.chatRoom}>
                        <div className={styles.chatContainer}>
                            <h1>Chat</h1>
                            <div className={styles.chattingDisplay}>
                                {messages.length !== 0 ? messages.map((item, index) => {
                                    console.log(messages)
                                    return (
                                        <div style={{ marginBottom: "20px" }} key={index}>
                                            <p style={{ fontWeight: "bold" }}>{item.sender}</p>
                                            <p>{item.data}</p>
                                        </div>
                                    )
                                }) : <p>No Messages Yet</p>}
                            </div>

                            <div className={styles.chattingArea}>
                                <TextField value={message} onChange={(e) => setMessage(e.target.value)} id="outlined-basic" label="Enter Your chat" variant="outlined" />
                                <Button variant='contained' onClick={sendMessage}>Send</Button>
                            </div>
                        </div>
                    </div> : <></>}

                    <div className={styles.buttonContainers}>
                        <IconButton onClick={handleVideo} style={{ color: "white" }}>
                            {(video === true) ? <VideocamIcon /> : <VideocamOffIcon />}
                        </IconButton>
                        <IconButton onClick={handleEndCall} style={{ color: "red" }}>
                            <CallEndIcon  />
                        </IconButton>
                        <IconButton onClick={handleAudio} style={{ color: "white" }}>
                            {audio === true ? <MicIcon /> : <MicOffIcon />}
                        </IconButton>

                        {screenAvailable === true ?
                            <IconButton onClick={handleScreen} style={{ color: "white" }}>
                                {screen === true ? <ScreenShareIcon /> : <StopScreenShareIcon />}
                            </IconButton> : <></>}

                        <Badge badgeContent={newMessages} max={999} color='orange'>
                            <IconButton onClick={() => setModal(!showModal)} style={{ color: "white" }}>
                                <ChatIcon />                        </IconButton>
                        </Badge>
                    </div>

                    <video className={styles.meetUserVideo} ref={localVideoref} autoPlay muted></video>

                    <div className={styles.conferenceView}>
                        {videos.map((video) => (
                            <div key={video.socketId}>
                                <video
                                    data-socket={video.socketId}
                                    ref={ref => {
                                        if (ref && video.stream) {
                                            ref.srcObject = video.stream;
                                        }
                                    }}
                                    autoPlay
                                >
                                </video>
                            </div>
                        ))}
                    </div>
                </div>
            }
        </div>
    )
}


/* reading--

1. WebRTC STUN Server and Its Importance in Video Calling Applications
    What is a STUN Server?
        ->A STUN (Session Traversal Utilities for NAT) server is a network protocol used in WebRTC (Web Real-Time Communication) to help devices discover their public IP address 
        and determine how they are reachable over the internet, especially when they are behind NAT (Network Address Translation) or firewalls.
        In simple terms, a STUN server enables peer-to-peer (P2P) connections in WebRTC by allowing devices to find out their public IP address 
        and which network conditions (like NAT types) they are operating under.

2. 
📌 Why?
        If the user stops their camera, instead of freezing or cutting the call, we replace their video with an empty black screen to keep the connection stable.

        📌 What’s blackSilence()?
        blackSilence() is a function that creates a fake video and audio stream with:
        ✅ A black video frame
        ✅ Silent audio
        This is done to ensure the WebRTC connection doesn't drop due to a missing media track.

 */