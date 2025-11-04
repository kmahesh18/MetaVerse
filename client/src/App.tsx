// src/App.tsx
import { Routes, Route, Link, useLocation } from "react-router-dom";
import {
  SignedIn,
  UserButton,
} from "@clerk/clerk-react";
import { useEffect } from "react";
import GameComponent from "./Game/components/comp1";
import { Homepage } from "./components/Homepage";
import { AvatarSelection } from "./components/AvatarSelection";
import { Dashboard } from "./components/Dashboard";
import { CreateSpace } from "./components/CreateSpace";
import { JoinSpace } from "./components/JoinSpace";
import { InviteUser } from "./components/InviteUser";
import "./App.css";
import "./global.css";

function App() {
  const location = useLocation();
  const isGameRoute = /^\/space\/[^/]+\/room\/[^/]+/.test(location.pathname);
  const isHomepage = location.pathname === '/';
  const isSelectAvatar = location.pathname === '/select-avatar';
  
  // Show navbar only on specific pages (not on homepage, game, or avatar selection)
  const showNavbar = !isGameRoute && !isHomepage && !isSelectAvatar;
  
  // Add/remove game-mode class based on route
  useEffect(() => {
    if (isGameRoute) {
      document.body.classList.add('game-mode');
    } else {
      document.body.classList.remove('game-mode');
    }
    
    // Add has-navbar class when navbar is shown
    if (showNavbar) {
      document.body.classList.add('has-navbar');
    } else {
      document.body.classList.remove('has-navbar');
    }
  }, [isGameRoute, showNavbar]);
  
  console.log("Current route:", location.pathname, "Show navbar:", showNavbar);
  
  return (
    <>
      {showNavbar && (
        <nav className="navbar-slim">
          <Link to="/dashboard" className="nav-link">
            🏠 DASHBOARD
          </Link>
          <SignedIn>
            <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
              <UserButton afterSignOutUrl="/" />
            </div>
          </SignedIn>
        </nav>
      )}

      <Routes>
        <Route path="/" element={<Homepage />} />
        <Route
          path="/select-avatar"
          element={
            <SignedIn>
              <AvatarSelection />
            </SignedIn>
          }
        />
        <Route
          path="/dashboard"
          element={
            <SignedIn>
              <Dashboard />
            </SignedIn>
          }
        />
        <Route
          path="/create-space"
          element={
            <SignedIn>
              <CreateSpace />
            </SignedIn>
          }
        />
        <Route
          path="/join-space"
          element={
            <SignedIn>
              <JoinSpace />
            </SignedIn>
          }
        />
        <Route
          path="/invite-user/:spaceId"
          element={
            <SignedIn>
              <InviteUser />
            </SignedIn>
          }
        />
        <Route
          path="/space/:spaceId/room/:roomId"
          element={
            <SignedIn>
              <GameComponent></GameComponent>
            </SignedIn>
          }
        />
      </Routes>
    </>
  );
}

export default App;
