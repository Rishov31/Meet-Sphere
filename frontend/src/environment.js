let IS_PROD = true;
const server = IS_PROD ?
    "https://meet-spherebackend.onrender.com" : // => for prod

    "http://localhost:8000"  // => for dev


export default server;