import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { IAsset } from "../../../server/src/Models/AssetModel";

export function AvatarSelection() {
  const [selectedAvatarId, setSelectedAvatarId] = useState<string>("");
  const [avatars, setAvatars] = useState<IAsset[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const navigate = useNavigate();
  const { user } = useUser();

  useEffect(() => {
    const fetchAvatars = async () => {
      try {
        // Change the endpoint to fetch only avatar assets
        const response = await fetch(`https://metaverse.onrender.com/api/assets/avatars`);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("Failed to fetch avatars:", errorData);
          throw new Error(errorData.error || `Failed to fetch avatars: ${response.status}`);
        }
        const data = await response.json();
        setAvatars(data);
      } catch (err) {
        console.error('Avatar fetch error:', err);
        setError(err instanceof Error ? err.message : String(err));
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

      // Use the PATCH endpoint to update the avatar
      const userResponse = await fetch(`https://metaverse.onrender.com/api/user/${user.id}/avatar`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          avatarId: selectedAvatarId
        })
      });

      if (!userResponse.ok) {
        const errorData = await userResponse.json().catch(() => ({}));
        console.error("Failed to save avatar selection:", errorData);
        throw new Error(errorData.message || `Failed to save avatar selection: ${userResponse.status}`);
      }

      // Success - navigate to dashboard
      navigate("/dashboard");
    } catch (err) {
      console.error("Avatar selection error:", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container-2d" style={{ 
        display: 'flex', 
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '300px'
      }}>
        Loading avatars...
      </div>
    );
  }

  if (avatars.length === 0 && !error) {
    return (
      <div className="container-2d" style={{ textAlign: 'center' }}>
        <p className="text-2d">No avatars available in the database.</p>
        <p className="text-2d">Please add some avatars to the assets collection first.</p>
      </div>
    );
  }

  return (
    <div className="container-2d">
      <h2 className="title-2d">Select Your Avatar</h2>
      
      {error && (
        <div className="error-message text-2d" style={{ 
          color: 'red', 
          marginBottom: '20px',
          background: '#3d0000',
          padding: '10px',
          border: '2px solid #ff0000'
        }}>
          {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "20px" }}>
        {avatars.map((avatar) => (
          <div
            key={avatar._id ? avatar._id.toString() : `avatar-${avatar.name}`}
            className="container-2d"
            style={{
              cursor: isUpdating ? "not-allowed" : "pointer",
              border: selectedAvatarId === (avatar._id?.toString() || "") ? "4px solid white" : undefined,
              opacity: isUpdating ? 0.7 : 1,
              background: "var(--secondary)"
            }}
            onClick={() => !isUpdating && avatar._id && setSelectedAvatarId(avatar._id.toString())}
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
        style={{ 
          opacity: isUpdating ? 0.7 : 1,
          marginTop: "20px"
        }}
      >
        {isUpdating ? "Saving..." : "Continue"}
      </button>
    </div>
  );
}
