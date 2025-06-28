// src/App.tsx
import { Routes, Route, Link, useLocation } from "react-router-dom";
import {
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import GameComponent from "./Game/components/comp1";
import { Homepage } from "./components/Homepage";
import { AvatarSelection } from "./components/AvatarSelection";
import { Dashboard } from "./components/Dashboard";
import { CreateSpace } from "./components/CreateSpace";
import { JoinSpace } from "./components/JoinSpace";
import { InviteUser } from "./components/InviteUser";
import "./App.css";
import "./styles/theme.css";

function App() {
  const location = useLocation();
  const [isGameRoute, setIsGameRoute] = useState(false);

  useEffect(() => {
    // Update game route detection on location change
    const gameRoutePattern = /^\/space\/[^/]+\/room\/[^/]+/.test(location.pathname);
    setIsGameRoute(gameRoutePattern);
    console.log("Current path:", location.pathname, "Is game route:", gameRoutePattern);
  }, [location.pathname]);

  return (
    <>
      {!isGameRoute && (
        <nav style={{
          background: "var(--bg-surface)",
          borderBottom: "2px solid var(--highlight)",
          padding: "1rem 2rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "sticky",
          top: 0,
          zIndex: "var(--z-interface)",
          boxShadow: "var(--shadow-md)",
          backdropFilter: "blur(12px)",
          marginBottom: 0,
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "1.5rem",
          }}>
            <Link
              to="/"
              style={{
                fontSize: "1.5rem",
                fontFamily: "var(--font-display)",
                fontWeight: "900",
                color: "var(--highlight)",
                letterSpacing: "2px",
                textDecoration: "none",
                textTransform: "uppercase",
                transition: "all var(--transition-normal)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.textShadow = "0 0 10px var(--highlight)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.textShadow = "none";
              }}
            >
              MetaVerse
            </Link>
          </div>

          <SignedIn>
            <div style={{
              display: "flex",
              gap: "1rem",
              alignItems: "center",
            }}>
              <Link
                to="/dashboard"
                className="btn-2d"
                style={{
                  fontSize: "0.9rem",
                  padding: "0.6rem 1.2rem",
                  textDecoration: "none",
                  fontFamily: "var(--font-display)",
                  textTransform: "uppercase",
                }}
              >
                Dashboard
              </Link>
              <div>
                <UserButton
                  afterSignOutUrl="/"
                  appearance={{
                    elements: {
                      avatarBox: {
                        width: "32px",
                        height: "32px",
                      }
                    }
                  }}
                />
              </div>
            </div>
          </SignedIn>

          <SignedOut>
            <div style={{
              fontSize: "0.9rem",
              color: "var(--text-muted)",
              fontFamily: "var(--font-mono)",
              textTransform: "uppercase",
            }}>
              Ready to Connect
            </div>
          </SignedOut>
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
              <GameComponent />
            </SignedIn>
          }
        />
      </Routes>
    </>
  );
}

export default App;
