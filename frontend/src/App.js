import './App.css';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import LandingPage from './pages/landing';
import Authentication from './pages/authentication';
import { AuthProvider } from './contexts/AuthContext';
import VideoMeetComponent from './pages/VideoMeet';
import HomeComponent from './pages/home';
import History from './pages/history';

function App() {
  return (
    <div className="App">
      <Router>  {/*The Router component (assumed to be BrowserRouter from react-router-dom) enables routing in the application.*/}
        <AuthProvider>  {/*The AuthProvider component likely provides authentication-related context to the application. */}
          <Routes>
            <Route path='/' element={<LandingPage />} />
            <Route path='/auth' element={<Authentication />} />
            <Route path='/home's element={<HomeComponent />} />
            <Route path='/history' element={<History />} />
            <Route path='/:url' element={<VideoMeetComponent />} />
          </Routes>
        </AuthProvider>
      </Router>
    </div>
  );
}

export default App;


{/*  Read --

1. What is BrowserRouter in React Router?
  -> BrowserRouter is a component provided by the React Router to provide the client-side routing with the 
    support of the HTML5 history API. It facilitates you to navigate the process without page reload.
    Syntax --
      <BrowserRouter>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
            </Routes>
      </BrowserRouter>
      
  
  
  
  
  
  */}