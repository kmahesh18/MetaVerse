import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";

interface Avatar {
  _id: string;
  name: string;
  previewUrl: string;
}

export function AvatarSelection() {
  const [selectedAvatarId, setSelectedAvatarId] = useState("");
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const navigate = useNavigate();
  const { user } = useUser();

  useEffect(() => {
    const fetchAvatars = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/avatars');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch avatars');
        }
        const data = await response.json();
        console.log('Fetched avatars:', data);
        setAvatars(data);
      } catch (err) {
        console.error('Avatar fetch error:', err);
        setError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAvatars();
  }, []);

  const handleAvatarSelect = async () => {
    if (!selectedAvatarId || isUpdating || !user) return;

    try {
      setIsUpdating(true);
      setError(null);

      console.log("Submitting with:", {
        clerkId: user.id,
        avatarId: selectedAvatarId
      });

      const userResponse = await fetch(`http://localhost:5000/api/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          clerkId: user.id,
          avatarId: selectedAvatarId
        })
      });

      if (!userResponse.ok) {
        const errorData = await userResponse.json();
        throw new Error(errorData.error || 'Failed to save avatar selection');
      }

      navigate("/dashboard");
    } catch (err) {
      console.error("Avatar selection error:", err);
      setError((err as Error).message);
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return <div className="container-2d">Loading avatars...</div>;
  }

  return (
    <div className="container-2d">
      <h2 className="title-2d">Select Your Avatar</h2>
      
      {error && (
        <div className="error-message text-2d" style={{ color: 'red', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "20px" }}>
        {avatars.map((avatar) => (
          <div
            key={avatar._id}
            className="container-2d"
            style={{
              cursor: isUpdating ? "not-allowed" : "pointer",
              border: selectedAvatarId === avatar._id ? "4px solid black" : undefined,
              opacity: isUpdating ? 0.7 : 1,
            }}
            onClick={() => !isUpdating && setSelectedAvatarId(avatar._id)}
          >
            <img src={avatar.previewUrl} alt={avatar.name} style={{ width: "100px" }} />
            <p className="text-2d">{avatar.name}</p>
          </div>
        ))}
      </div>

      <button 
        className="btn-2d"
        onClick={handleAvatarSelect}
        disabled={!selectedAvatarId || isUpdating}
        style={{ opacity: isUpdating ? 0.7 : 1 }}
      >
        {isUpdating ? "Saving..." : "Continue"}
      </button>
    </div>
  );
}
