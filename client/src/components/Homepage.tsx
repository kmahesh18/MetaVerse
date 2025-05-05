import { useNavigate } from "react-router-dom";
import { useClerk, useUser } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import "../styles/theme.css";

export function Homepage() {
  const { isSignedIn, user } = useUser();
  const { openSignIn } = useClerk();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initUser = async () => {
      if (isSignedIn && user) {
        try {
          console.log("User ID:", user.id);
          // Check if user exists in our backend
          const response = await fetch(`http://localhost:${import.meta.env.VITE_BKPORT}/api/user/${user.id}`);
          
          if (!response.ok) {
            console.log("User not found, response status:", response.status);
            
            // User doesn't exist, create them in our backend
            const createResponse = await fetch(`http://localhost:${import.meta.env.VITE_BKPORT}/api/user`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                clerkId: user.id,
                avatarId:"",
                emailId: user.emailAddresses[0].emailAddress
              })
            });
            
            if (!createResponse.ok) {
              const errorData = await createResponse.json();
              console.error("Failed to create user:", errorData);
              throw new Error(`Failed to create user: ${errorData.error || createResponse.statusText}`);
            }
            
            const createdUser = await createResponse.json();
            console.log("Successfully created user:", createdUser);
            
            // Now redirect to avatar selection
            navigate("/select-avatar");
            return;
          }
          
          const userData = await response.json();
          console.log("Found existing user:", userData);

          if (!userData.avatarId) {
            navigate("/select-avatar");
          } else {
            navigate("/dashboard");
          }
        } catch (err) {
          console.error('Error initializing user:', err);
          setError((err as Error).message);
          // Still navigate to avatar selection as fallback
          navigate("/select-avatar");
        }
      }
    };

    initUser();
  }, [isSignedIn, user, navigate]);

  return (
    <div className="container-2d">
      <h1 className="title-2d">Welcome to MetaVerse</h1>
      
      {error && (
        <div className="error-message" style={{ color: 'red', marginBottom: '20px' }}>
          Error: {error}
        </div>
      )}
      
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