import { useUser } from "@clerk/clerk-react";
import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ISpace } from "../../../server/src/Models/SpaceType";
import { IUser } from "../../../server/src/Models/UserModel";
import axios from "axios";
import "./Dashboard.css";

const backendUrl = import.meta.env.VITE_BACKEND_URL;

export function Dashboard() {
	const { user, isLoaded } = useUser();
	const navigate = useNavigate();
	const location = useLocation();
	const [spaces, setSpaces] = useState<ISpace[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [userData, setUserData] = useState<IUser | null>(null);
	const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
	const [showNotification, setShowNotification] = useState<string | null>(
		location.state?.notification || null
	);
	// console.log(user)

	const fetchUserData = useCallback(async () => {
		if (!user) return null;
		try {
			const response = await fetch(`${backendUrl}/api/user/${user.id}`);
			if (response.status === 404) {
				try {
					const primaryEmail = user.emailAddresses[0].emailAddress || "";
					// console.log("Creating user with email:", primaryEmail);
					const createUserResponse = await fetch(`${backendUrl}/api/user`, {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
						},
						body: JSON.stringify({
							clerkId: user.id,
							emailId: primaryEmail,
						}),
					});
					if (!createUserResponse.ok) {
						throw new Error("Failed to create user");
					}
					const createdUser = await createUserResponse.json();
					return createdUser;
				} catch (createErr) {
					console.error("Error creating user:", createErr);
					navigate("/select-avatar");
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
			const response = await fetch(`${backendUrl}/api/user/${user.id}/spaces`);
			if (!response.ok) {
				console.warn("Could not fetch accessible spaces:", response.status);
				return [];
			}
			const accessibleSpaceIds = await response.json();
			// console.log("Accessible space IDs:", accessibleSpaceIds);
			if (
				!Array.isArray(accessibleSpaceIds) ||
				accessibleSpaceIds.length === 0
			) {
				return [];
			}
			const spaceDetailsPromises = accessibleSpaceIds.map(async (spaceId) => {
				try {
					const spaceResponse = await fetch(
						`${backendUrl}/api/spaces/${spaceId}`
					);
					if (!spaceResponse.ok) {
						console.warn(
							`Failed to fetch details for space ${spaceId}: ${spaceResponse.status}`
						);
						return null;
					}
					return await spaceResponse.json();
				} catch (err) {
					console.error(`Error fetching details for space ${spaceId}:`, err);
					return null;
				}
			});
			const spacesDetails = await Promise.all(spaceDetailsPromises);
			const validSpaces = spacesDetails.filter(
				(space) => space !== null
			) as ISpace[];
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
				setUserData(userDataResult);
				if (!userDataResult.avatarId) {
					navigate("/select-avatar");
					return;
				}

				// Fetch avatar details
				if (userDataResult.avatarId) {
					try {
						const avatarResponse = await fetch(
							`${backendUrl}/api/assets/${userDataResult.avatarId}`
						);
						if (avatarResponse.ok) {
							const avatarData = await avatarResponse.json();
							setAvatarUrl(avatarData.previewUrl);
						}
					} catch (err) {
						console.error("Error fetching avatar:", err);
					}
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
	}, [
		user,
		isLoaded,
		navigate,
		fetchUserData,
		fetchAccessibleSpaces,
		showNotification,
	]);
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
			const isActive = spaces.find(
				(space) =>
					space.id === spaceId && space.activeuserids?.includes(user.id)
			);

			if (isActive) {
				// User is already active, navigate directly to the room
				const spaceResponse = await axios.get(
					`${backendUrl}/api/spaces/${spaceId}`
				);
				const spaceData = spaceResponse.data;

				if (!spaceData.roomids || spaceData.roomids.length === 0) {
					throw new Error("No rooms available in this space");
				}

				const defaultRoomId = spaceData.roomids[0];
				navigate(`/space/${spaceId}/room/${defaultRoomId}`);
				return;
			}

			// Join the space (add user to active users)
			const response = await axios.post(
				`${backendUrl}/api/spaces/${spaceId}/join`,
				{
					clerkId: user.id,
				}
			);

			if (!response.data) {
				throw new Error("Failed to join space");
			}

			// Get the default room (first room) of the space
			const spaceResponse = await axios.get(
				`${backendUrl}/api/spaces/${spaceId}`
			);
			const spaceData = spaceResponse.data;

			if (!spaceData.roomids || spaceData.roomids.length === 0) {
				throw new Error("No rooms available in this space");
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
			const response = await axios.post(
				`${backendUrl}/api/spaces/${spaceId}/leave`,
				{
					clerkId: user.id,
				}
			);

			if (!response.data) {
				throw new Error("Failed to leave space");
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
			const space = spaces.find((s) => s.id === spaceId);
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
			<div className="centered-container">
				<div className="loading-2d"></div>
				<p className="text-2d" style={{ marginTop: "20px" }}>
					Loading your dashboard...
				</p>
			</div>
		);
	}

	if (error) {
		return (
			<div className="centered-container">
				<div className="card-2d" style={{ maxWidth: "600px" }}>
					<div className="error-message">
						Error: {error}
					</div>
					<button className="btn-2d" onClick={() => window.location.reload()}>
						Retry
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="dashboard-container">
			{showNotification && (
				<div className="notification-toast">
					<span>{showNotification}</span>
					<button
						className="notification-close"
						onClick={() => setShowNotification(null)}>
						✕
					</button>
				</div>
			)}

			<div className="dashboard-header">
				<div className="dashboard-welcome">
					<div className="dashboard-avatar">
						{avatarUrl ? (
							<img
								src={avatarUrl}
								alt="Your avatar"
								style={{
									width: "100%",
									height: "100%",
									objectFit: "cover",
								}}
							/>
						) : (
							<span>👤</span>
						)}
					</div>
					<div className="dashboard-user-info">
						<h1>Welcome, {user?.firstName || "User"}</h1>
						<p>Manage Your Virtual Spaces</p>
					</div>
				</div>

				<div className="dashboard-actions">
					<button
						className="btn-2d"
						onClick={() => navigate("/create-space")}>
						+ Create New Space
					</button>
					<button
						className="btn-secondary"
						onClick={handleJoinSpace}
						style={{ opacity: 0.7 }}>
						Join Space (Coming Soon)
					</button>
				</div>
			</div>

			<div className="dashboard-section">
				<h2>Your Spaces</h2>

				{spaces.length === 0 ? (
					<div
						className="card-2d"
						style={{
							textAlign: "center",
							padding: "60px 30px",
							background: "var(--bg-primary)",
						}}>
						<p className="text-2d" style={{ marginBottom: "10px", fontSize: "1.2rem" }}>
							You haven't joined any spaces yet.
						</p>
						<p className="subtitle-2d" style={{ marginBottom: "30px" }}>
							Create or join one to get started!
						</p>
						<button
							className="btn-2d"
							onClick={() => navigate("/create-space")}>
							Create Your First Space
						</button>
					</div>
				) : (
					<div className="space-grid">
						{spaces.map((space) => {
							const isAdmin = space.adminid === user?.id;
							const isActive = space.activeuserids?.includes(user?.id || "");

							return (
								<div
									key={space.id}
									className="space-card">
									<div
										style={{
											display: "flex",
											justifyContent: "space-between",
											alignItems: "center",
											marginBottom: "15px",
										}}>
										<h3 className="subtitle-2d" style={{ fontSize: "1.2rem" }}>
											Space
										</h3>
										<span className={`badge-2d ${isAdmin ? 'badge-admin' : ''}`}>
											{isAdmin ? "👑 Admin" : "Member"}
										</span>
									</div>

									<div style={{ marginBottom: "20px" }}>
										<p className="text-2d" style={{ marginBottom: "8px" }}>
											🚪 Rooms: {Array.isArray(space.roomids) ? space.roomids.length : 0}
										</p>
										<p className="text-2d" style={{ marginBottom: "8px" }}>
											👥 Active users: {Array.isArray(space.activeuserids) ? space.activeuserids.length : 0}
										</p>
										<p>
											<span className={`badge-2d ${isActive ? 'badge-active' : 'badge-error'}`}>
												{isActive ? "⚡ Active" : "💤 Accessible"}
											</span>
										</p>
									</div>

									<div className="action-buttons" style={{ marginTop: "20px" }}>
										{isAdmin && (
											<button
												className="btn-small btn-outline"
												onClick={(e) => {
													e.stopPropagation();
													handleInviteUser(space.id);
												}}>
												📨 Invite Users
											</button>
										)}

										<button
											className="btn-small"
											onClick={(e) => {
												e.stopPropagation();
												handleEnterSpace(space.id);
											}}>
											{isActive ? "🎮 Enter Space" : "🚀 Join Space"}
										</button>

										{isActive && (
											<button
												className="btn-small btn-secondary"
												onClick={(e) => {
													e.stopPropagation();
													handleLeaveSpace(space.id);
												}}>
												👋 Leave
											</button>
										)}
									</div>
								</div>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
}
