import { useNavigate } from "react-router-dom";
import { useClerk, useUser } from "@clerk/clerk-react";
import { useEffect } from "react";
import "../styles/theme.css";

export function Homepage() {
  const { isSignedIn, user } = useUser();
  const { openSignIn } = useClerk();
  const navigate = useNavigate();

  useEffect(() => {
    const initUser = async () => {
      if (isSignedIn && user) {
        try {
          // Check if user exists in our backend
          const response = await fetch(`http://localhost:5000/api/users/${user.id}`);
          const userData = await response.json();

          if (!userData || !userData.avatarId) {
            navigate("/select-avatar");
          } else {
            navigate("/dashboard");
          }
        } catch (error) {
          console.error('Error initializing user:', error);
          navigate("/select-avatar");
        }
      }
    };

    initUser();
  }, [isSignedIn, user, navigate]);

  return (
    <div className="container-2d">
      <h1 className="title-2d">Welcome to MetaVerse</h1>
      
      <div className="text-2d">
        <p>Step into a 2D world where connection meets creativity.</p>
        <p>Features:</p>
        <ul>
          <li>Real-time interaction with other players</li>
          <li>Customizable 2D avatars</li>
          <li>Virtual meeting spaces</li>
          <li>Interactive environments</li>
        </ul>
      </div>

      {!isSignedIn && (
        <button className="btn-2d" onClick={() => openSignIn()}>
          Sign In to Begin
        </button>
      )}
    </div>
  );
}