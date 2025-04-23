// src/App.tsx
import { Routes, Route, Link } from "react-router-dom";
import { SignedIn, SignedOut, UserButton, RedirectToSignIn } from "@clerk/clerk-react";
import { Homepage } from "./components/Homepage";
import { AvatarSelection } from "./components/AvatarSelection";
import { Dashboard } from "./components/Dashboard";
import "./App.css";
import "./styles/theme.css";

function App() {
  return (
    <>
      <nav className="container-2d">
        <Link to="/" className="btn-2d">Home</Link>
        <SignedIn>
          <UserButton afterSignOutUrl="/" />
        </SignedIn>
      </nav>

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
        <Route path="/create-space" element={<SignedIn><div>Coming Soon</div></SignedIn>} />
        <Route path="/join-space" element={<SignedIn><div>Coming Soon</div></SignedIn>} />
        <Route path="/space/:id" element={<SignedIn><div>Coming Soon</div></SignedIn>} />
      </Routes>
    </>
  );
}

export default App;