import React from 'react'
import "../App.css"
import { Link, useNavigate } from 'react-router-dom'

export default function LandingPage() {
    const router = useNavigate();
    return (
        <div className='landingPageContainer'>
            <nav>
                <div className='navHeader'>
                    <h2>Apna Video Call</h2>
                </div>
                <div className='navlist'>
                    <p onClick={() => {
                        router("/aljk23")
                    }}>Join as Guest</p>

                    <p onClick={() => {
                        router("/auth")
                    }}>Register</p>

                    <div onClick={() => {
                        router("/auth")
                    }} role='button'>
                        <p>Login</p>
                    </div>
                </div>
            </nav>


            <div className="landingMainContainer">
                <div>
                    <h1><span style={{ color: "#FF9839" }}>Connect</span> with your loved Ones</h1>

                    <p>Cover a distance by Apna Video Call</p>
                    <div role='button'>
                        <Link to={"/auth"}>Get Started</Link>
                    </div>
                </div>
                <div>

                    <img src="/mobile.png" alt="" />

                </div>
            </div>



        </div>
    )
}

/*
1. ReactJS useNavigate() Hook
    -> The useNavigate() hook is introduced in the React Router v6.
    In the updated version, the React Router’s new navigation API provides a useNavigate() hook which is an imperative version to perform the navigation actions with better compatibility.

    Syntax:

        const navigate = useNavigate();

        // Navigate to specific path
        navigate('/targetpath')

        // Navigate and update history stack
        navigate('/path', { replace: true }); 


    The useNavigate() hook in ReactJS is beneficial for:

    a) Handling User Interactions: Redirect users after certain actions, such as form submissions or login.
    b) Programmatic Redirection: Navigate to different routes based on application state or conditions.
    c) Replacing Traditional Links: Achieve dynamic navigation without relying solely on <Link> or <NavLink> components.
    d) Managing Navigation Flow: Control the browsing history, such as navigating backward or forward in the history stack.

    
 */