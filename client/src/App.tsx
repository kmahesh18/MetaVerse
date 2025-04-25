// src/App.tsx
import { Routes, Route, Link } from "react-router-dom";
import { SignedIn, SignedOut, UserButton, RedirectToSignIn } from "@clerk/clerk-react";
import { Homepage } from "./components/Homepage";
import { AvatarSelection } from "./components/AvatarSelection";
import { Dashboard } from "./components/Dashboard";
import { CreateSpace } from "./components/CreateSpace";
import "./App.css";
import "./styles/theme.css";

function App() {
  return (
    <>
      <nav className="container-2d" style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        background: 'var(--secondary)',
        marginBottom: '20px'
      }}>
        <Link to="/" className="btn-2d">Home</Link>
        <SignedIn>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <Link to="/dashboard" className="btn-2d">Dashboard</Link>
            <UserButton afterSignOutUrl="/" />
          </div>
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
        <Route 
          path="/create-space" 
          element={
            <SignedIn>
              <CreateSpace />
            </SignedIn>
          } 
        />
        <Route path="/join-space" element={<SignedIn><div>Coming Soon</div></SignedIn>} />
        <Route path="/space/:id" element={<SignedIn><div>Coming Soon</div></SignedIn>} />
      </Routes>
    </>
  );
}

export default App;