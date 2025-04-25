import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { ISpace } from "../../../server/src/Models/SpaceType";

type RoomType = {
  id: string;
  name: string;
};

export function CreateSpace() {
  const { user } = useUser();
  const navigate = useNavigate();
  const [spaceName, setSpaceName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Room type counts
  const [roomCounts, setRoomCounts] = useState<Map<string, number>>(new Map());
  
  // Room types - in a real app these would be fetched from the backend
  const roomTypes: RoomType[] = [
    { id: "living", name: "Living Room" },
    { id: "gaming", name: "Gaming Room" },
    { id: "conference", name: "Conference Room" },
    { id: "office", name: "Office Space" },
  ];

  const handleRoomCountChange = (roomTypeId: string, count: number) => {
    setRoomCounts(prev => {
      const newMap = new Map(prev);
      newMap.set(roomTypeId, count);
      return newMap;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!spaceName.trim()) {
      setError("Please enter a space name");
      return;
    }
    
    // Convert Map to an object for the API
    const roomPref = Array.from(roomCounts.entries()).reduce((obj, [key, value]) => {
      if (value > 0) {
        obj[key] = value;
      }
      return obj;
    }, {} as Record<string, number>);
    
    // Check if at least one room is selected
    if (Object.keys(roomPref).length === 0) {
      setError("Please add at least one room to your space");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Check if the spacesRouter is registered in server.ts
      const response = await fetch(`http://localhost:${import.meta.env.VITE_BKPORT}/api/spaces`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: spaceName,
          RoomPref: roomPref,
          adminid: user?.id,
        }),
      });
      
      if (response.status === 404) {
        throw new Error("Spaces API endpoint not found. Make sure the spacesRouter is registered in server.ts");
      }
      
      if (response.status === 501) {
        console.warn("Spaces API not fully implemented yet");
        // In development, we'll navigate to the dashboard anyway
        navigate("/dashboard");
        return;
      }
      
      if (!response.ok) {
        throw new Error(`Failed to create space: ${response.status}`);
      }
      
      navigate("/dashboard");
    } catch (err) {
      console.error("Error creating space:", err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="container-2d" style={{ maxWidth: "600px", margin: "40px auto" }}>
      <h1 className="title-2d">Create New Space</h1>
      
      {error && (
        <div style={{ background: "#3d0000", padding: "10px", marginBottom: "20px", border: "2px solid #ff0000" }}>
          <p className="text-2d">{error}</p>
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="spaceName" className="text-2d" style={{ display: "block", marginBottom: "5px" ,fontSize:"20px"}}>
            Space Name:
          </label>
          <input
            type="text"
            id="spaceName"
            className="input-2d"
            style={{ width: "100%" }}
            value={spaceName}
            onChange={(e) => setSpaceName(e.target.value)}
            placeholder="Enter space name"
          />
        </div>
        
        <div className="form-group">
          <p className="text-2d" style={{ marginBottom: "10px" ,fontSize:"20px"}}>Select Rooms:</p>
          <div className="room-selector">
            {roomTypes.map((roomType) => (
              <div key={roomType.id} style={{ background: "var(--accent)", padding: "10px", marginBottom: "10px" }}>
                <label className="text-2d" style={{ display: "block", marginBottom: "5px",fontSize: "16px" }}>
                  {roomType.name}
                </label>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <button
                    type="button"
                    className="btn-2d"
                    onClick={() => {
                      const currentCount = roomCounts.get(roomType.id) || 0;
                      if (currentCount > 0) {
                        handleRoomCountChange(roomType.id, currentCount - 1);
                      }
                    }}
                  >
                    -
                  </button>
                  <span className="text-2d" style={{ margin: "0 10px" }}>
                    {roomCounts.get(roomType.id) || 0}
                  </span>
                  <button
                    type="button"
                    className="btn-2d"
                    onClick={() => {
                      const currentCount = roomCounts.get(roomType.id) || 0;
                      handleRoomCountChange(roomType.id, currentCount + 1);
                    }}
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div style={{ marginTop: "20px", textAlign: "center" }}>
          <button type="submit" className="btn-2d" disabled={loading}>
            {loading ? "Creating..." : "Create Space"}
          </button>
          <button
            type="button"
            className="btn-2d"
            onClick={() => navigate("/dashboard")}
            style={{ marginLeft: "10px" }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
} 