import { useUser } from "@clerk/clerk-react";
import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ISpace } from "../../../server/src/Models/SpaceType";
import { IUser } from "../../../server/src/Models/UserModel";
import axios from "axios";

export function Dashboard() {
  const { user, isLoaded } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [spaces, setSpaces] = useState<ISpace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNotification, setShowNotification] = useState<string | null>(
    location.state?.notification || null
  );

  const fetchUserData = useCallback(async () => {
    if (!user) return null;
    try {
      const response = await fetch(`${import.meta.env.VITE_BKPORT}/api/user/${user.id}`);
      if (response.status === 404) {
        try {
          const primaryEmail = user.emailAddresses[0].emailAddress || '';
          // console.log("Creating user with email:", primaryEmail);
          const createUserResponse = await fetch(`${import.meta.env.VITE_BKPORT}/api/user`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              clerkId: user.id,
              emailId: primaryEmail
            }),
          });
          if (!createUserResponse.ok) {
            throw new Error('Failed to create user');
          }
          const createdUser = await createUserResponse.json();
          return createdUser;
        } catch (createErr) {
          console.error("Error creating user:", createErr);
          navigate('/select-avatar');
          return null;
        }
      }
      if (!response.ok) {
        throw new Error(`Failed to fetch user data: ${response.status}`);
      }
      const userData = await response.json();
      return userData as IUser;
    } catch (err) {
      console.error("Error fetching user data:", err);
      throw err;
    }
  }, [user, navigate]);

  const fetchAccessibleSpaces = useCallback(async () => {
    if (!user) return [];
    try {
      const response = await fetch(`${import.meta.env.VITE_BKPORT}/api/user/${user.id}/spaces`);
      if (!response.ok) {
        console.warn("Could not fetch accessible spaces:", response.status);
        return [];
      }
      const accessibleSpaceIds = await response.json();
      // console.log("Accessible space IDs:", accessibleSpaceIds);
      if (!Array.isArray(accessibleSpaceIds) || accessibleSpaceIds.length === 0) {
        return [];
      }
      const spaceDetailsPromises = accessibleSpaceIds.map(async (spaceId) => {
        try {
          const spaceResponse = await fetch(`${import.meta.env.VITE_BKPORT}/api/spaces/${spaceId}`);
          if (!spaceResponse.ok) {
            console.warn(`Failed to fetch details for space ${spaceId}: ${spaceResponse.status}`);
            return null;
          }
          return await spaceResponse.json();
        } catch (err) {
          console.error(`Error fetching details for space ${spaceId}:`, err);
          return null;
        }
      });
      const spacesDetails = await Promise.all(spaceDetailsPromises);
      const validSpaces = spacesDetails.filter(space => space !== null) as ISpace[];
      // console.log("Fetched complete space details:", validSpaces);
      return validSpaces;
    } catch (err) {
      console.error("Error fetching spaces:", err);
      return [];
    }
  }, [user]);
  const refreshSpaces = useCallback(async () => {
    if (!user) return;
    try {
      const spacesData = await fetchAccessibleSpaces();
      setSpaces(spacesData);
    } catch (err) {
      console.error("Error refreshing spaces:", err);
    }
  }, [user, fetchAccessibleSpaces]);

  useEffect(() => {
    if (!isLoaded || !user) return;

    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const userDataResult = await fetchUserData();
        
        if (!userDataResult) {
          return;
        }
        if (!userDataResult.avatarId) {
          navigate('/select-avatar');
          return;
        }
        const spacesData = await fetchAccessibleSpaces();
        setSpaces(spacesData);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      }
    };
    fetchDashboardData();
    if (showNotification) {
      const timer = setTimeout(() => {
        setShowNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [user, isLoaded, navigate, fetchUserData, fetchAccessibleSpaces, showNotification]);
  useEffect(() => {
    if (location.state?.spaceId && isLoaded && user) {
      refreshSpaces();
    }
  }, [location.state, isLoaded, user, refreshSpaces]);

  const handleJoinSpace = () => {
    setShowNotification("Coming Soon! This feature is under development.");
  };

  // console.log(spaces)

  // Handle entering (activating) a space
  const handleEnterSpace = async (spaceId: string) => {
    if (!user) return;
    
    try {
      // console.log("Current user ID:", user.id); // Log user ID
      // console.log("Space details:", spaces.find(s => s.id === spaceId)); // Log space details
      
      // Check if user is already active in this space
      const isActive = spaces.find(space => 
        space.id === spaceId && space.activeuserids?.includes(user.id)
      );
      
      if (isActive) {
        // User is already active, navigate directly to the room
        const spaceResponse = await axios.get(`${import.meta.env.VITE_BKPORT}/api/spaces/${spaceId}`);
        const spaceData = spaceResponse.data;
        
        if (!spaceData.roomids || spaceData.roomids.length === 0) {
          throw new Error('No rooms available in this space');
        }

        const defaultRoomId = spaceData.roomids[0];
        navigate(`/space/${spaceId}/room/${defaultRoomId}`);
        return;
      }

      // Join the space (add user to active users)
      const response = await axios.post(`${import.meta.env.VITE_BKPORT}/api/spaces/${spaceId}/join`, {
          clerkId: user.id
      });
      
      if (!response.data) {
        throw new Error('Failed to join space');
      }

      // Get the default room (first room) of the space
      const spaceResponse = await axios.get(`${import.meta.env.VITE_BKPORT}/api/spaces/${spaceId}`);
      const spaceData = spaceResponse.data;
      
      if (!spaceData.roomids || spaceData.roomids.length === 0) {
        throw new Error('No rooms available in this space');
      }

      const defaultRoomId = spaceData.roomids[0];
      
      // Navigate to the default room in the space
      navigate(`/space/${spaceId}/room/${defaultRoomId}`);
    } catch (err) {
      console.error("Error entering space:", err);
      let errorMessage = "Failed to enter space";
      if (axios.isAxiosError(err) && err.response) {
        errorMessage = err.response.data.message || errorMessage;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      setError(errorMessage);
    }
  };

  // Add a function to handle leaving a space
  const handleLeaveSpace = async (spaceId: string) => {
    if (!user) return;
    
    try {
      setLoading(true);
      const response = await axios.post(`${import.meta.env.VITE_BKPORT}/api/spaces/${spaceId}/leave`, {
        clerkId: user.id
      });
      
      if (!response.data) {
        throw new Error('Failed to leave space');
      }

      // Refresh spaces list after leaving
      await refreshSpaces();
      setShowNotification("You have left the space successfully");
    } catch (err) {
      console.error("Error leaving space:", err);
      let errorMessage = "Failed to leave space";
      if (axios.isAxiosError(err) && err.response) {
        errorMessage = err.response.data.message || errorMessage;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Add debugging for admin status
  const handleInviteUser = (spaceId: string) => {
    try {
      // Check if user is admin of this space
      const space = spaces.find(s => s.id === spaceId);
      // console.log("Space admin check:", {
      //   spaceId,
      //   adminId: space?.adminid,
      //   userId: user?.id,
      //   isAdmin: space?.adminid === user?.id
      // });
      
      if (!space || space.adminid !== user?.id) {
        setError("You must be an admin to invite users to this space");
        return;
      }
      
      navigate(`/invite-user/${spaceId}`);
    } catch (err) {
      console.error("Error navigating to invite user page:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  if (!isLoaded || loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <div className="loading-text">Loading Dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "var(--bg-primary)"
      }}>
        <div className="container-2d" style={{
          textAlign: "center",
          maxWidth: "500px",
          border: "1px solid var(--error)",
          boxShadow: "0 0 20px var(--error)"
        }}>
          <h2 style={{ color: "var(--error)", marginBottom: "1rem" }}>System Error</h2>
          <p style={{ marginBottom: "2rem" }}>{error}</p>
          <button className="btn-2d primary" onClick={() => window.location.reload()}>
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: `
        radial-gradient(circle at 10% 20%, var(--neon-blue)08 0%, transparent 50%),
        radial-gradient(circle at 90% 80%, var(--neon-cyan)08 0%, transparent 50%),
        var(--bg-primary)
      `,
      position: "relative"
    }}>
      {/* Background Grid */}
      <div style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: `
          linear-gradient(rgba(0, 212, 255, 0.05) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0, 212, 255, 0.05) 1px, transparent 1px)
        `,
        backgroundSize: window.innerWidth <= 768 ? "25px 25px" : "40px 40px",
        zIndex: 0
      }} />

      {/* Notification */}
      {showNotification && (
        <div className="notification success" style={{
          position: "fixed",
          top: window.innerWidth <= 768 ? "1rem" : "2rem",
          right: window.innerWidth <= 768 ? "1rem" : "2rem",
          left: window.innerWidth <= 480 ? "1rem" : "auto",
          maxWidth: window.innerWidth <= 768 ? "calc(100% - 2rem)" : "350px",
          zIndex: 1000
        }}>
          {showNotification}
          <button
            style={{
              position: "absolute",
              top: "0.5rem",
              right: "0.5rem",
              background: "transparent",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              fontSize: "1.2rem",
              minWidth: "24px",
              minHeight: "24px"
            }}
            onClick={() => setShowNotification(null)}
          >
            ×
          </button>
        </div>
      )}

      <div style={{
        position: "relative",
        zIndex: 1,
        padding: window.innerWidth <= 768 ? "1rem" : "2rem",
        maxWidth: "1400px",
        margin: "0 auto"
      }}>
        {/* Welcome Section */}
        <div className="container-2d" style={{
          marginBottom: window.innerWidth <= 768 ? "2rem" : "3rem",
          display: "grid",
          gridTemplateColumns: window.innerWidth <= 768 ? "1fr" : "auto 1fr auto",
          alignItems: window.innerWidth <= 768 ? "stretch" : "center",
          gap: window.innerWidth <= 768 ? "1.5rem" : "2rem",
          animation: "fadeInUp 0.6s ease-out",
          textAlign: window.innerWidth <= 768 ? "center" : "left"
        }}>
          {/* Avatar */}
          <div style={{
            width: window.innerWidth <= 768 ? "80px" : "100px",
            height: window.innerWidth <= 768 ? "80px" : "100px",
            borderRadius: "var(--border-radius-lg)",
            overflow: "hidden",
            border: "2px solid var(--border-accent)",
            background: "var(--bg-elevated)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "var(--shadow-neon)",
            margin: window.innerWidth <= 768 ? "0 auto" : "0"
          }}>
            <div style={{ 
              fontSize: window.innerWidth <= 768 ? "2rem" : "2.5rem", 
              color: "var(--text-muted)" 
            }}>👤</div>
          </div>

          {/* Welcome Text */}
          <div style={{
            order: window.innerWidth <= 768 ? -1 : 0
          }}>
            <h1 className="title-2d" style={{
              fontSize: window.innerWidth <= 480 ? "1.8rem" : window.innerWidth <= 768 ? "2rem" : "2.5rem",
              marginBottom: "0.5rem"
            }}>
              Welcome back, {user?.firstName || 'User'}
            </h1>
            <p className="text-2d" style={{
              fontSize: window.innerWidth <= 768 ? "1rem" : "1.1rem",
              margin: 0,
              color: "var(--text-secondary)"
            }}>
              Manage your virtual spaces and collaborate with your team
            </p>
          </div>

          {/* Action Buttons */}
          <div style={{
            display: "flex",
            gap: "1rem",
            flexDirection: window.innerWidth <= 768 ? "row" : "column",
            justifyContent: window.innerWidth <= 768 ? "center" : "flex-start",
            flexWrap: "wrap"
          }}>
            <button
              className="btn-2d primary"
              onClick={() => navigate('/create-space')}
              style={{ 
                padding: "0.75rem 1.5rem",
                flex: window.innerWidth <= 480 ? "1" : "none",
                minWidth: window.innerWidth <= 480 ? "120px" : "auto"
              }}
            >
              Create Space
            </button>
            <button
              className="btn-2d"
              onClick={handleJoinSpace}
              style={{ 
                padding: "0.75rem 1.5rem", 
                opacity: 0.6,
                flex: window.innerWidth <= 480 ? "1" : "none",
                minWidth: window.innerWidth <= 480 ? "120px" : "auto"
              }}
            >
              Join Space
            </button>
          </div>
        </div>

        {/* Spaces Section */}
        <section>
          <h2 className="title-2d" style={{
            fontSize: window.innerWidth <= 768 ? "1.5rem" : "2rem",
            marginBottom: window.innerWidth <= 768 ? "1.5rem" : "2rem",
            textAlign: "center"
          }}>
            Your Virtual Spaces
          </h2>

          {spaces.length === 0 ? (
            <div className="container-2d" style={{
              textAlign: "center",
              padding: window.innerWidth <= 768 ? "2rem 1rem" : "4rem 2rem",
              animation: "fadeInUp 0.8s ease-out"
            }}>
              <div style={{ 
                fontSize: window.innerWidth <= 768 ? "3rem" : "4rem", 
                marginBottom: window.innerWidth <= 768 ? "1rem" : "2rem", 
                opacity: 0.6 
              }}>🏢</div>
              <h3 className="subtitle-2d" style={{ 
                marginBottom: "1rem",
                fontSize: window.innerWidth <= 768 ? "1.2rem" : "1.5rem"
              }}>
                No Spaces Yet
              </h3>
              <p className="text-2d" style={{
                marginBottom: "2rem",
                maxWidth: "400px",
                margin: "0 auto 2rem auto",
                fontSize: window.innerWidth <= 768 ? "0.9rem" : "1rem"
              }}>
                Create your first virtual space to start collaborating with your team.
              </p>
              <button
                className="btn-2d primary"
                onClick={() => navigate('/create-space')}
                style={{ 
                  padding: window.innerWidth <= 768 ? "0.8rem 1.5rem" : "1rem 2rem",
                  width: window.innerWidth <= 480 ? "100%" : "auto",
                  maxWidth: window.innerWidth <= 480 ? "300px" : "none"
                }}
              >
                Create Your First Space
              </button>
            </div>
          ) : (
            <div className="grid-container" style={{
              gridTemplateColumns: window.innerWidth <= 480 
                ? "1fr" 
                : window.innerWidth <= 768 
                  ? "repeat(auto-fit, minmax(280px, 1fr))" 
                  : "repeat(auto-fit, minmax(300px, 1fr))"
            }}>
              {spaces.map((space, index) => (
                <div
                  key={space.id}
                  className="grid-item"
                  style={{
                    cursor: "pointer",
                    border: space.adminid === user?.id ? "1px solid var(--neon-blue)" : "1px solid var(--border-primary)",
                    animation: `fadeInUp ${0.6 + index * 0.1}s ease-out`,
                    boxShadow: space.adminid === user?.id ? "var(--shadow-neon)" : "var(--shadow-md)",
                    padding: window.innerWidth <= 768 ? "1rem" : "1.5rem"
                  }}
                >
                  {/* Space Header */}
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "1.5rem",
                    flexWrap: window.innerWidth <= 480 ? "wrap" : "nowrap",
                    gap: window.innerWidth <= 480 ? "0.5rem" : "0"
                  }}>
                    <h3 className="subtitle-2d" style={{
                      margin: 0,
                      fontSize: window.innerWidth <= 768 ? "0.95rem" : "1.1rem",
                      flex: window.innerWidth <= 480 ? "1 1 100%" : "1"
                    }}>
                      Space #{space.id.substring(0, 8)}
                    </h3>
                    <span style={{
                      padding: "0.25rem 0.75rem",
                      borderRadius: "var(--border-radius-md)",
                      fontSize: window.innerWidth <= 768 ? "0.7rem" : "0.8rem",
                      fontWeight: "600",
                      background: space.adminid === user?.id ? "var(--neon-blue)" : "var(--accent)",
                      color: space.adminid === user?.id ? "var(--text-inverse)" : "var(--text-primary)",
                      fontFamily: "var(--font-display)",
                      textTransform: "uppercase",
                      whiteSpace: "nowrap"
                    }}>
                      {space.adminid === user?.id ? "Admin" : "Member"}
                    </span>
                  </div>

                  {/* Space Stats */}
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: window.innerWidth <= 768 ? "0.75rem" : "1rem",
                    marginBottom: "1.5rem"
                  }}>
                    <div style={{
                      background: "var(--bg-elevated)",
                      padding: window.innerWidth <= 768 ? "0.75rem" : "1rem",
                      borderRadius: "var(--border-radius-md)",
                      textAlign: "center",
                      border: "1px solid var(--border-primary)"
                    }}>
                      <div style={{
                        fontSize: window.innerWidth <= 768 ? "1.2rem" : "1.5rem",
                        fontWeight: "700",
                        color: "var(--neon-blue)",
                        fontFamily: "var(--font-display)"
                      }}>
                        {Array.isArray(space.roomids) ? space.roomids.length : 0}
                      </div>
                      <div style={{
                        fontSize: window.innerWidth <= 768 ? "0.7rem" : "0.8rem",
                        color: "var(--text-muted)",
                        textTransform: "uppercase"
                      }}>
                        Rooms
                      </div>
                    </div>
                    <div style={{
                      background: "var(--bg-elevated)",
                      padding: window.innerWidth <= 768 ? "0.75rem" : "1rem",
                      borderRadius: "var(--border-radius-md)",
                      textAlign: "center",
                      border: "1px solid var(--border-primary)"
                    }}>
                      <div style={{
                        fontSize: window.innerWidth <= 768 ? "1.2rem" : "1.5rem",
                        fontWeight: "700",
                        color: "var(--neon-green)",
                        fontFamily: "var(--font-display)"
                      }}>
                        {Array.isArray(space.activeuserids) ? space.activeuserids.length : 0}
                      </div>
                      <div style={{
                        fontSize: window.innerWidth <= 768 ? "0.7rem" : "0.8rem",
                        color: "var(--text-muted)",
                        textTransform: "uppercase"
                      }}>
                        Active
                      </div>
                    </div>
                  </div>

                  {/* Status */}
                  <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
                    <span style={{
                      padding: "0.5rem 1rem",
                      borderRadius: "var(--border-radius-lg)",
                      fontSize: window.innerWidth <= 768 ? "0.8rem" : "0.9rem",
                      fontWeight: "600",
                      background: space.activeuserids?.includes(user?.id || '') ? "var(--neon-green)" : "var(--warning)",
                      color: "var(--text-inverse)",
                      fontFamily: "var(--font-display)",
                      textTransform: "uppercase"
                    }}>
                      {space.activeuserids?.includes(user?.id || '') ? "Active" : "Available"}
                    </span>
                  </div>

                  {/* Actions */}
                  <div style={{
                    display: "flex",
                    gap: "0.5rem",
                    flexWrap: "wrap",
                    flexDirection: window.innerWidth <= 480 ? "column" : "row"
                  }}>
                    {space.adminid === user?.id && (
                      <button
                        className="btn-2d"
                        style={{ 
                          fontSize: window.innerWidth <= 768 ? "0.75rem" : "0.8rem", 
                          padding: window.innerWidth <= 768 ? "0.6rem 0.8rem" : "0.5rem 1rem",
                          flex: window.innerWidth <= 480 ? "1" : "none"
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleInviteUser(space.id);
                        }}
                      >
                        Invite Users
                      </button>
                    )}
                    
                    <button
                      className="btn-2d primary"
                      style={{
                        fontSize: window.innerWidth <= 768 ? "0.75rem" : "0.8rem",
                        padding: window.innerWidth <= 768 ? "0.6rem 0.8rem" : "0.5rem 1rem",
                        flex: "1"
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEnterSpace(space.id);
                      }}
                    >
                      {space.activeuserids?.includes(user?.id || '') ? "Enter →" : "Join →"}
                    </button>
                    
                    {space.activeuserids?.includes(user?.id || '') && (
                      <button
                        className="btn-2d"
                        style={{
                          fontSize: window.innerWidth <= 768 ? "0.75rem" : "0.8rem",
                          padding: window.innerWidth <= 768 ? "0.6rem 0.8rem" : "0.5rem 1rem",
                          borderColor: "var(--error)",
                          color: "var(--error)",
                          flex: window.innerWidth <= 480 ? "1" : "none"
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLeaveSpace(space.id);
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "var(--error)";
                          e.currentTarget.style.color = "var(--text-inverse)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                          e.currentTarget.style.color = "var(--error)";
                        }}
                      >
                        Leave
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
