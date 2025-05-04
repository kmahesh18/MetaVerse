import { useState, useEffect } from "react";
import axios from "axios";
import { IAsset } from "../../../server/src/Models/AssetModel";

export function AvatarSelector({ onSelect }: { onSelect: (avatarUrl: string) => void }) {
  const [avatars, setAvatars] = useState<IAsset[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);

  useEffect(() => {
    const fetchAvatars = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/assets/avatars');
        setAvatars(response.data);
        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch avatars:", err);
        setError("Failed to load avatars. Please try again later.");
        setLoading(false);
      }
    };

    fetchAvatars();
  }, []);

  const handleAvatarSelect = (avatar: IAsset) => {
    setSelectedAvatar(avatar.previewUrl);
    onSelect(avatar.previewUrl);
  };

  if (loading) return <div>Loading avatars...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="avatar-selector">
      <h2>Select Your Avatar</h2>
      <div className="avatar-grid">
        {avatars.map((avatar) => (
          <div 
            key={avatar.assetId}
            className={`avatar-item ${selectedAvatar === avatar.previewUrl ? 'selected' : ''}`}
            onClick={() => handleAvatarSelect(avatar)}
          >
            <img src={avatar.previewUrl} alt={avatar.name} />
          </div>
        ))}
      </div>
    </div>
  );
}
