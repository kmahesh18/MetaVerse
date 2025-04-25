import { useUser } from "@clerk/clerk-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ISpace } from "../../../server/src/Models/SpaceType";
import { IUser } from "../../../server/src/Models/UserModel";

export function Dashboard() {
  const { user, isLoaded } = useUser();
  const navigate = useNavigate();
  const [spaces, setSpaces] = useState<ISpace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userData, setUserData] = useState<IUser | null>(null);

  useEffect(() => {
    if (!isLoaded || !user) return;

    const fetchUserDataAndSpaces = async () => {
      try {
        // Fetch user data
        const response = await fetch(`http://localhost:${import.meta.env.VITE_BKPORT}/api/user/${user.id}`);
        
        if (response.status === 404) {
          // If user not found, redirect to avatar selection
          navigate('/select-avatar');
          return;
        }
        
        if (!response.ok) {
          throw new Error(`Failed to fetch user data: ${response.status}`);
        }
        
        const userData = await response.json();
        setUserData(userData);

        if (!userData?.avatarId) {
          navigate('/select-avatar');
          return;
        }

        // Fetch spaces for the user
        try {
          // This endpoint should be implemented on the backend to return spaces for a user
          const spacesRes = await fetch(`http://localhost:${import.meta.env.VITE_BKPORT}/api/spaces?userId=${user.id}`);
          
          if (spacesRes.status === 501 || spacesRes.status === 404) {
            console.warn("Spaces API not fully implemented yet");
            setSpaces([]);
          } else if (!spacesRes.ok) {
            console.warn("Could not fetch spaces:", spacesRes.status);
            setSpaces([]);
          } else {
            const spacesData = await spacesRes.json();
            setSpaces(Array.isArray(spacesData) ? spacesData : []);
          }
        } catch (spaceErr) {
          console.error("Error fetching spaces:", spaceErr);
          setSpaces([]);
        }

        setLoading(false);
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setError((err as Error).message);
        setLoading(false);
      }
    };

    fetchUserDataAndSpaces();
  }, [user, isLoaded, navigate]);

  if (!isLoaded || loading) {
    return (
      <div 
        className="container-2d" 
        style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          background: 'var(--secondary)'
        }}
      >
        <p className="text-2d" style={{ fontSize: '18px' }}>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div 
        className="container-2d" 
        style={{ 
          maxWidth: '600px', 
          margin: '40px auto',
          background: 'var(--secondary)',
          borderColor: '#ff0000'
        }}
      >
        <p className="text-2d" style={{ color: '#ff0000', marginBottom: '20px' }}>Error: {error}</p>
        <button className="btn-2d" onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    );
  }

  const handleSpaceClick = (spaceId: string) => {
    navigate(`/space/${spaceId}`);
  };

  return (
    <div className="container-2d" style={{ 
      maxWidth: '1000px', 
      margin: '40px auto',
      background: 'var(--secondary)',
      padding: '30px'
    }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '20px', 
        marginBottom: '30px',
        borderBottom: '2px solid var(--accent)',
        paddingBottom: '20px'
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          overflow: 'hidden',
          border: '3px solid var(--text)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'var(--accent)'
        }}>
          {userData?.avatarId && (
            <img 
              src={`/assets/${userData.avatarId}.png`} 
              alt="Your avatar" 
              style={{ 
                width: '100%', 
                height: '100%',
                objectFit: 'cover' 
              }} 
            />
          )}
        </div>
        
        <div>
          <h1 className="title-2d" style={{ marginBottom: '5px', fontSize: '22px' }}>
            Welcome, {user?.firstName || 'User'}
          </h1>
          <p className="text-2d" style={{ color: 'var(--highlight)' }}>
            Manage Your Virtual Spaces
          </p>
        </div>
      </div>

      <div className="action-buttons" style={{ 
        display: 'flex', 
        gap: '15px', 
        marginBottom: '30px',
        justifyContent: 'flex-start' 
      }}>
        <button 
          className="btn-2d" 
          onClick={() => navigate('/create-space')}
          style={{ 
            fontSize: '14px',
            padding: '10px 20px',
            background: 'var(--highlight)',
            color:'var(--secondary)'
          }}
        >
          + Create New Space
        </button>
        <button 
          className="btn-2d" 
          onClick={() => navigate('/join-space')}
          style={{ 
            fontSize: '14px',
            padding: '10px 20px' 
          }}
        >
          Join Space
        </button>
      </div>

      <h2 className="title-2d" style={{ fontSize: '18px', marginBottom: '20px' }}>
        Your Spaces
      </h2>

      {spaces.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          margin: '60px 0',
          padding: '30px',
          border: '2px dashed var(--accent)',
          background: 'rgba(255, 255, 255, 0.05)'
        }}>
          <p className="text-2d" style={{ marginBottom: '10px' }}>
            You haven't joined any spaces yet.
          </p>
          <p className="text-2d" style={{ marginBottom: '20px', color: 'var(--highlight)' }}>
            Create or join one to get started!
          </p>
          <button 
            className="btn-2d" 
            onClick={() => navigate('/create-space')}
            style={{ background: 'var(--highlight)',color:'var(--secondary)' }}
          >
            Create Your First Space
          </button>
        </div>
      ) : (
        <div className="space-grid" style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
          gap: '20px'
        }}>
          {spaces.map((space) => (
            <div 
              key={space._id as string} 
              className="space-card"
              style={{ 
                cursor: 'pointer', 
                padding: '20px',
                background: 'var(--secondary)',
                border: '2px solid var(--text)',
                borderRadius: '4px'
              }}
              onClick={() => handleSpaceClick(space._id as string)}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '15px'
              }}>
                <h3 className="text-2d" style={{ 
                  fontSize: '18px',
                  fontWeight: 'bold'
                }}>
                  {space.name || "Untitled Space"}
                </h3>
                <span style={{ 
                  fontSize: '12px', 
                  padding: '4px 8px',
                  border: '1px solid var(--accent)',
                  borderRadius: '4px',
                  textTransform: 'capitalize',
                  background: 'var(--accent)'
                }}>
                  {space.adminid === user?.id ? "admin" : "member"}
                </span>
              </div>
              
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '5px'
              }}>
                <p className="text-2d" style={{ 
                  fontSize: '12px', 
                  color: 'var(--highlight)',
                  marginBottom: '5px'
                }}>
                  Rooms: {space.roomids?.length || 0}
                </p>
                <p className="text-2d" style={{ 
                  fontSize: '12px', 
                  color: 'var(--highlight)'
                }}>
                  Last visited: {space.lastVisited ? new Date(space.lastVisited).toLocaleDateString() : "Never"}
                </p>
              </div>
              
              <div style={{ 
                marginTop: '15px', 
                display: 'flex', 
                justifyContent: 'flex-end'
              }}>
                <button 
                  className="btn-2d"
                  style={{ 
                    fontSize: '12px',
                    padding: '6px 12px'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSpaceClick(space._id as string);
                  }}
                >
                  Enter Space →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
