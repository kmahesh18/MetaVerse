import { useUser } from "@clerk/clerk-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

interface Space {
  id: string;
  name: string;
  lastVisited: string;
  role: 'admin' | 'member';
}

export function Dashboard() {
  const { user, isLoaded } = useUser();
  const navigate = useNavigate();
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userData, setUserData] = useState<{ avatarId: string } | null>(null);

  useEffect(() => {
    if (!isLoaded || !user) return;

    const fetchUserData = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/users/${user.id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch user data');
        }
        const userData = await response.json();
        setUserData(userData);

        if (!userData?.avatarId) {
          navigate('/select-avatar');
          return;
        }

        // For now, just set loading to false since we don't have spaces API yet
        setLoading(false);
        
        // Mock spaces data for demonstration
        setSpaces([
          // Empty array for now - will be fetched from API in the future
        ]);
      } catch (err) {
        console.error("Error fetching user data:", err);
        setError((err as Error).message);
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user, isLoaded, navigate]);

  if (!isLoaded || loading) {
    return <div className="container-2d">Loading...</div>;
  }

  if (error) {
    return (
      <div className="container-2d">
        <p className="text-2d error">Error: {error}</p>
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
    <div className="container-2d">
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '30px' }}>
            <img 
                src={`/assets/${userData?.avatarId || 1}.png`} 
                alt="Your avatar" 
                style={{ width: '64px', border: '2px solid black', borderRadius: '50%' }} 
            />
            <div>
                <h2 className="title-2d">Welcome, {user?.firstName || 'User'}</h2>
                <p className="text-2d">Your Virtual Spaces</p>
            </div>
        </div>

        <div className="action-buttons" style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <button className="btn-2d" onClick={() => navigate('/create-space')}>
                Create New Space
            </button>
            <button className="btn-2d" onClick={() => navigate('/join-space')}>
                Join Space
            </button>
        </div>

        <div className="space-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            {spaces.map((space) => (
                <div 
                    key={space.id} 
                    className="space-card container-2d"
                    style={{ cursor: 'pointer', padding: '15px' }}
                    onClick={() => handleSpaceClick(space.id)}
                >
                    <h3 className="text-2d" style={{ marginBottom: '10px' }}>{space.name}</h3>
                    <p className="text-2d" style={{ fontSize: '0.8em', color: 'var(--accent)' }}>
                        Last visited: {new Date(space.lastVisited).toLocaleDateString()}
                    </p>
                    <span 
                        style={{ 
                            fontSize: '0.7em', 
                            padding: '2px 6px',
                            border: '1px solid var(--accent)',
                            borderRadius: '2px',
                            textTransform: 'capitalize'
                        }}
                    >
                        {space.role}
                    </span>
                </div>
            ))}
        </div>

        {spaces.length === 0 && (
            <div style={{ textAlign: 'center', margin: '40px 0' }}>
                <p className="text-2d">You haven't joined any spaces yet.</p>
                <p className="text-2d">Create or join one to get started!</p>
            </div>
        )}
    </div>
  );
}
