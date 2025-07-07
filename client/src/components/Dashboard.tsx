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
	const [userData, setUserData] = useState<IUser | null>(null);
	const [showNotification, setShowNotification] = useState<string | null>(
		location.state?.notification || null
	);
	// console.log(user)

	const fetchUserData = useCallback(async () => {
		if (!user) return null;
		try {
			const response = await fetch(
				`https://64.227.158.123:5001/api/user/${user.id}`
			);
			if (response.status === 404) {
				try {
					const primaryEmail = user.emailAddresses[0].emailAddress || "";
					// console.log("Creating user with email:", primaryEmail);
					const createUserResponse = await fetch(
						`https://64.227.158.123:5001/api/user`,
						{
							method: "POST",
							headers: {
								"Content-Type": "application/json",
							},
							body: JSON.stringify({
								clerkId: user.id,
								emailId: primaryEmail,
							}),
						}
					);
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
			const response = await fetch(
				`https://64.227.158.123:5001/api/user/${user.id}/spaces`
			);
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
						`https://64.227.158.123:5001/api/spaces/${spaceId}`
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
					`https://64.227.158.123:5001/api/spaces/${spaceId}`
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
				`https://64.227.158.123:5001/api/spaces/${spaceId}/join`,
				{
					clerkId: user.id,
				}
			);

			if (!response.data) {
				throw new Error("Failed to join space");
			}

			// Get the default room (first room) of the space
			const spaceResponse = await axios.get(
				`https://64.227.158.123:5001/api/spaces/${spaceId}`
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
				`https://64.227.158.123:5001/api/spaces/${spaceId}/leave`,
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
			<div
				className="container-2d"
				style={{
					display: "flex",
					justifyContent: "center",
					alignItems: "center",
					height: "100vh",
					background: "var(--secondary)",
				}}>
				<p className="text-2d" style={{ fontSize: "18px" }}>
					Loading...
				</p>
			</div>
		);
	}

	if (error) {
		return (
			<div
				className="container-2d"
				style={{
					maxWidth: "600px",
					margin: "40px auto",
					background: "var(--secondary)",
					borderColor: "#ff0000",
				}}>
				<p
					className="text-2d"
					style={{ color: "#ff0000", marginBottom: "20px" }}>
					Error: {error}
				</p>
				<button className="btn-2d" onClick={() => window.location.reload()}>
					Retry
				</button>
			</div>
		);
	}

	return (
		<div
			className="container-2d"
			style={{
				maxWidth: "1000px",
				margin: "40px auto",
				background: "var(--secondary)",
				padding: "30px",
				position: "relative",
			}}>
			{showNotification && (
				<div
					style={{
						position: "absolute",
						top: "10px",
						right: "10px",
						background: "var(--highlight)",
						color: "var(--secondary)",
						padding: "10px 15px",
						borderRadius: "4px",
						zIndex: 100,
						maxWidth: "300px",
					}}>
					<p>{showNotification}</p>
					<button
						style={{
							position: "absolute",
							top: "5px",
							right: "5px",
							background: "transparent",
							border: "none",
							color: "var(--secondary)",
							cursor: "pointer",
							fontSize: "12px",
						}}
						onClick={() => setShowNotification(null)}>
						✕
					</button>
				</div>
			)}

			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: "20px",
					marginBottom: "30px",
					borderBottom: "2px solid var(--accent)",
					paddingBottom: "20px",
				}}>
				<div
					style={{
						width: "80px",
						height: "80px",
						borderRadius: "50%",
						overflow: "hidden",
						border: "3px solid var(--text)",
						display: "flex",
						justifyContent: "center",
						alignItems: "center",
						background: "var(--accent)",
					}}>
					{userData?.avatarId && (
						<img
							src={`/assets/${userData.avatarId}.png`}
							alt="Your avatar"
							style={{
								width: "100%",
								height: "100%",
								objectFit: "cover",
							}}
						/>
					)}
				</div>

				<div>
					<h1
						className="title-2d"
						style={{ marginBottom: "5px", fontSize: "22px" }}>
						Welcome, {user?.firstName || "User"}
					</h1>
					<p className="text-2d" style={{ color: "var(--highlight)" }}>
						Manage Your Virtual Spaces
					</p>
				</div>
			</div>

			<div
				className="action-buttons"
				style={{
					display: "flex",
					gap: "15px",
					marginBottom: "30px",
					justifyContent: "flex-start",
				}}>
				<button
					className="btn-2d"
					onClick={() => navigate("/create-space")}
					style={{
						fontSize: "14px",
						padding: "10px 20px",
						background: "var(--highlight)",
						color: "var(--secondary)",
					}}>
					+ Create New Space
				</button>
				<button
					className="btn-2d"
					onClick={handleJoinSpace}
					style={{
						fontSize: "14px",
						padding: "10px 20px",
						opacity: 0.7,
					}}>
					Join Space (Coming Soon)
				</button>
			</div>

			<h2
				className="title-2d"
				style={{ fontSize: "18px", marginBottom: "20px" }}>
				Your Spaces
			</h2>

			{spaces.length === 0 ? (
				<div
					style={{
						textAlign: "center",
						margin: "60px 0",
						padding: "30px",
						border: "2px dashed var(--accent)",
						background: "rgba(255, 255, 255, 0.05)",
					}}>
					<p className="text-2d" style={{ marginBottom: "10px" }}>
						You haven't joined any spaces yet.
					</p>
					<p
						className="text-2d"
						style={{ marginBottom: "20px", color: "var(--highlight)" }}>
						Create or join one to get started!
					</p>
					<button
						className="btn-2d"
						onClick={() => navigate("/create-space")}
						style={{
							background: "var(--highlight)",
							color: "var(--secondary)",
						}}>
						Create Your First Space
					</button>
				</div>
			) : (
				<div
					className="space-grid"
					style={{
						display: "grid",
						gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
						gap: "20px",
					}}>
					{spaces.map((space) => {
						// console.log("Rendering space:", space); // Log each space being rendered
						// console.log("Admin check:", {
						//   spaceAdminId: space.adminid,
						//   userId: user?.id,
						//   isAdmin: space.adminid === user?.id
						// });

						return (
							<div
								key={space.id}
								className="space-card"
								style={{
									cursor: "pointer",
									padding: "20px",
									background: "var(--secondary)",
									border:
										space.adminid === user?.id
											? "2px solid var(--highlight)"
											: "2px solid var(--text)",
									borderRadius: "4px",
								}}>
								<div
									style={{
										display: "flex",
										justifyContent: "space-between",
										alignItems: "center",
										marginBottom: "15px",
									}}>
									<h3
										className="text-2d"
										style={{
											fontSize: "18px",
											fontWeight: "bold",
										}}>
										Space
									</h3>
									<span
										style={{
											fontSize: "12px",
											padding: "4px 8px",
											border:
												space.adminid === user?.id
													? "1px solid var(--highlight)"
													: "1px solid var(--accent)",
											borderRadius: "4px",
											textTransform: "capitalize",
											background:
												space.adminid === user?.id
													? "var(--highlight)"
													: "var(--accent)",
											color: "var(--secondary)",
										}}>
										{space.adminid === user?.id ? "Admin" : "Member"}
									</span>
								</div>

								<div
									style={{
										display: "flex",
										flexDirection: "column",
										gap: "5px",
									}}>
									<p
										className="text-2d"
										style={{
											fontSize: "12px",
											color: "var(--highlight)",
											marginBottom: "5px",
										}}>
										Rooms:{" "}
										{Array.isArray(space.roomids) ? space.roomids.length : 0}
									</p>
									<p
										className="text-2d"
										style={{
											fontSize: "12px",
											color: "var(--highlight)",
										}}>
										Active users:{" "}
										{Array.isArray(space.activeuserids)
											? space.activeuserids.length
											: 0}
									</p>
									<p
										className="text-2d"
										style={{
											fontSize: "12px",
											color:
												Array.isArray(space.activeuserids) &&
												space.activeuserids.includes(user?.id || "")
													? "#00ff00"
													: "#ffaa00",
											marginTop: "5px",
										}}>
										Status:{" "}
										{Array.isArray(space.activeuserids) &&
										space.activeuserids.includes(user?.id || "")
											? "Active"
											: "Accessible"}
									</p>
								</div>

								<div
									style={{
										marginTop: "15px",
										display: "flex",
										justifyContent: "space-between",
										flexWrap: "wrap",
										gap: "8px",
									}}>
									{/* Debug admin status */}
									<div
										style={{
											fontSize: "10px",
											color: "#999",
											marginBottom: "5px",
											width: "100%",
										}}>
										Admin ID: {space.adminid?.substring(0, 8)}... | Your ID:{" "}
										{user?.id?.substring(0, 8)}...
									</div>

									{space.adminid === user?.id && (
										<button
											className="btn-2d"
											style={{
												fontSize: "12px",
												padding: "6px 12px",
												background: "var(--highlight)",
												color: "var(--secondary)",
											}}
											onClick={(e) => {
												e.stopPropagation();
												handleInviteUser(space.id);
											}}>
											Invite Users
										</button>
									)}

									<div style={{ display: "flex", gap: "8px" }}>
										<button
											className="btn-2d"
											style={{
												fontSize: "12px",
												padding: "6px 12px",
												background: space.activeuserids?.includes(
													user?.id || ""
												)
													? "var(--highlight)"
													: "var(--accent)",
											}}
											onClick={(e) => {
												e.stopPropagation();
												handleEnterSpace(space.id);
											}}>
											{space.activeuserids?.includes(user?.id || "")
												? "Enter Space →"
												: "Join Space →"}
										</button>

										{space.activeuserids?.includes(user?.id || "") && (
											<button
												className="btn-2d"
												style={{
													fontSize: "12px",
													padding: "6px 12px",
													background: "var(--accent)",
												}}
												onClick={(e) => {
													e.stopPropagation();
													handleLeaveSpace(space.id);
												}}>
												Leave Space
											</button>
										)}
									</div>
								</div>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
