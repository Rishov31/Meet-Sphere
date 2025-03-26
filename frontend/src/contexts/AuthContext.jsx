import axios from "axios";
import httpStatus from "http-status";
import { createContext, useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
// import server from "../environment";

export const AuthContext = createContext({}); //This creates a context (AuthContext) to provide authentication-related data globally.

const client = axios.create({
    // baseURL: `${server}/api/v1/users`
    baseURL: "https://localhost:8000/api/v1/users"
})


export const AuthProvider = ({ children }) => {  //This component will wrap other components to provide authentication data.
    const authContext = useContext(AuthContext);  //→ Gets current authentication data (if available).
    const [userData, setUserData] = useState(authContext); //Manages authentication state.
    const router = useNavigate(); //→ Enables navigation in React Router.

    const handleRegister = async (name, username, password) => {
        try {
            let request = await client.post("/register", {
                name: name,
                username: username,
                password: password
            })
            if (request.status === httpStatus.CREATED) {
                return request.data.message;
            }
        } catch (err) {
            throw err;
        }
    }

    const handleLogin = async (username, password) => {
        try {
            let request = await client.post("/login", {
                username: username,
                password: password
            });

            console.log(username, password)
            console.log(request.data)

            if (request.status === httpStatus.OK) { //If the response status is 200 (httpStatus.OK), it means login was successful.
                localStorage.setItem("token", request.data.token); //Stores the authentication token in localStorage //localStorage.setItem("token", request.data.token); saves the token so the user stays logged in across sessions.                
                router("/home"); //Navigates the user to the /home page using router("/home").
            }
        } catch (err) {
            throw err;
        }
    }

    const getHistoryOfUser = async () => { //The getHistoryOfUser function is an asynchronous function that retrieves the activity history of a user by making a GET request to the backend API. It sends the authentication token to ensure only authorized users can access their history.
        try {                                           //It does not take any parameters because the token (used for authentication) is stored in localStorage.
            let request = await client.get("/get_all_activity", {
                params: {
                    token: localStorage.getItem("token")  //The request includes the authentication token as a query parameter: GET /get_all_activity?token=your-auth-token
                }
            });     //Purpose of the Token: Ensures that only authenticated users can access their history.  The backend will validate the token before returning the history.
            
            return request.data
        } catch
         (err) {
            throw err;
        }
    }

    const addToUserHistory = async (meetingCode) => { //The addToUserHistory function adds a meeting to the user's history by sending a POST request to the server. This ensures that the meeting is saved in the database, allowing users to view their past meetings later. It takes one parameter: meetingCode: The unique code of the meeting the user participated in.
        try {
            let request = await client.post("/add_to_activity", {  //The request body contains: token: The authentication token from localStorage (used to verify the user). meeting_code: The meeting identifier to be stored in history.
                token: localStorage.getItem("token"),
                meeting_code: meetingCode
            });
            return request  //If the request is successful, it returns the server's response.
        } catch (e) {
            throw e;
        }
    }

    const data = {
        userData, setUserData, addToUserHistory, getHistoryOfUser, handleRegister, handleLogin
    }

    return (   //This code returns JSX that contains an AuthContext.Provider component. The AuthContext.Provider provides authentication-related data (userData, handleLogin, etc.) to all components inside it. this authProvider used in App.js
        <AuthContext.Provider value={data}>   
            {children}                        {/*AuthContext.Provider is a React Context Provider. It shares authentication-related data (data) with all child components. The value prop of the provider is set to data, which contains authentication functions (handleLogin, handleRegister) and user state (userData).*/}
        </AuthContext.Provider>            //{children} is a special React prop that represents whatever components are wrapped inside AuthProvider. 
    )

}



/* Explain new Context API in React
    ->Context API in React is used to share data across the components without passing the props manually through every level. It allows to create global state of data providing global access to all the components.

    What is Context API?
    -> Context API is used to pass global variables anywhere in the code without the prop drilling. 
    It helps when there is a need for sharing state between a lot of nested components. It is light in weight and easier to use, to create a context just need to call React.createContext().

    Why is Context API used?
    -> Context API solves the problem of prop drilling in React. Prop Drilling occurs when data is to be passed between multiple 
        layers before finally sending it to the required component. This makes the application slower. This problem is solved by Context API as
        it creates global variables to be used throughout the application without any middle components involved. It is also easier to use than React Redux

    Working
    To work with Context API we need React.createContext. It has two properties Provider and Consumer. The Provider acts as a parent it 
    passes the state to its children whereas the Consumer uses the state that has been passed.
    
    --------------------------------------------

    This code defines an authentication context (AuthContext) using React’s Context API and Axios to manage user authentication and activity history. 
    It includes registration, login, and history management for a web application.


    
 */