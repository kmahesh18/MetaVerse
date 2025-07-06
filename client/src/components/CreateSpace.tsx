import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { IRoomType } from "../../../server/src/Models/RoomType";
import axios from "axios";

interface RoomCountMap {
	[key: string]: number;
}
//random cooment
export function CreateSpace() {
	const { user } = useUser();
	const navigate = useNavigate();
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [roomCounts, setRoomCounts] = useState<RoomCountMap>({});
	const [roomTypes, setRoomTypes] = useState<IRoomType[]>([]);

	// Fetch room types from the API when component mounts
	useEffect(() => {
		const fetchRoomTypes = async () => {
			try {
				setLoading(true);
				// Update to use the backend port from environment variables
				const response = await axios.get(
					`http://localhost:${import.meta.env.VITE_BKPORT}/api/roomtypes`
				);

				// Make sure we're getting an array back
				if (Array.isArray(response.data)) {
					setRoomTypes(response.data);
				} else {
					// If not an array, check if there's a specific property that contains the array
					console.error("Unexpected data format:", response.data);
					setError("Received invalid room types data from server");
				}
			} catch (err) {
				console.error("Failed to fetch room types:", err);
				setError("Failed to load room types. Please try again later.");
			} finally {
				setLoading(false);
			}
		};

		fetchRoomTypes();
	}, []);

	const handleRoomCountChange = useCallback(
		(roomTypeId: string, count: number) => {
			setRoomCounts((prev) => ({
				...prev,
				[roomTypeId]: Math.max(0, count), // Prevent negative counts
			}));
		},
		[]
	);

	const handleCreateSpace = async () => {
		if (!user) {
			setError("Authentication required to create a space.");
			return;
		}

		const selectedRoomTypes = Object.entries(roomCounts)
			.filter(([_, count]) => count > 0)
			.map(([typeId, count]) => ({ typeId, count }));

		if (selectedRoomTypes.length === 0) {
			setError("Please select at least one room type and specify a count.");
			return;
		}

		setLoading(true);
		setError(null);

		try {
			const response = await axios.post(
				`http://localhost:${import.meta.env.VITE_BKPORT}/api/spaces`,
				{
					adminid: user.id,
					selectedRoomTypes: selectedRoomTypes,
				}
			);

			const newSpaceId = response.data.id;

			navigate("/dashboard", {
				state: {
					notification: "Space created successfully!",
					newSpaceId: newSpaceId,
				},
			});
		} catch (err) {
			console.error("Error creating space:", err);
			let errorMessage =
				"An unexpected error occurred while creating the space.";
			if (axios.isAxiosError(err)) {
				errorMessage =
					err.response?.data?.message || err.message || errorMessage;
			}
			setError(errorMessage);
		} finally {
			setLoading(false);
		}
	};

	const totalSelectedRooms = Object.values(roomCounts).reduce(
		(sum, count) => sum + count,
		0
	);

	if (loading) {
		return (
			<div className="container-2d centered-container">
				<p className="text-2d">Creating your space...</p>
			</div>
		);
	}

	return (
		<div
			className="container-2d"
			style={{
				maxWidth: "800px",
				margin: "40px auto",
				padding: "30px",
				borderRadius: "10px",
				boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
			}}>
			<h1
				className="title-2d"
				style={{
					fontSize: "28px",
					marginBottom: "20px",
					color: "var(--highlight)",
					borderBottom: "2px solid var(--accent)",
					paddingBottom: "10px",
				}}>
				Create Your Virtual Space
			</h1>

			{error && (
				<div
					style={{
						background: "rgba(255, 0, 0, 0.1)",
						border: "1px solid #ff0000",
						padding: "15px",
						marginBottom: "25px",
						borderRadius: "6px",
					}}>
					<p style={{ color: "#ff0000", margin: 0, fontWeight: "bold" }}>
						{error}
					</p>
				</div>
			)}

			<div className="room-selection" style={{ marginTop: "20px" }}>
				<h2 className="subtitle-2d">Select Room Types</h2>
				<p className="text-2d" style={{ marginBottom: "15px" }}>
					Choose which room types to include in your space and how many of each.
				</p>

				<div
					className="room-types-grid"
					style={{
						display: "grid",
						gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
						gap: "15px",
						marginBottom: "30px",
					}}>
					{roomTypes.map((roomType) => (
						<div
							key={roomType.id}
							className="room-type-card"
							style={{
								border: roomCounts[roomType.id]
									? "2px solid var(--highlight)"
									: "1px solid var(--accent)",
								borderRadius: "4px",
								padding: "15px",
								background: "var(--secondary)",
							}}>
							<div style={{ marginBottom: "12px" }}>
								<h3
									className="text-2d"
									style={{
										margin: 0,
										fontSize: "18px",
										color: roomCounts[roomType.id]
											? "var(--highlight)"
											: "var(--text)",
									}}>
									{roomType.name}
								</h3>
								<p
									className="text-2d"
									style={{
										fontSize: "14px",
										margin: "5px 0 0 0",
										color: "var(--text-muted)",
									}}>
									{roomType.description ||
										"A customizable room for your space."}
								</p>
							</div>

							<div
								className="room-count-controls"
								style={{
									display: "flex",
									alignItems: "center",
									justifyContent: "space-between",
									background: "var(--accent)",
									borderRadius: "4px",
									padding: "8px 12px",
								}}>
								<button
									className="btn-2d"
									style={{
										minWidth: "30px",
										height: "30px",
										padding: "0",
										fontSize: "16px",
										fontWeight: "bold",
										background: "var(--secondary)",
									}}
									onClick={() =>
										handleRoomCountChange(
											roomType.id,
											(roomCounts[roomType.id] || 0) - 1
										)
									}
									disabled={
										!roomCounts[roomType.id] || roomCounts[roomType.id] === 0
									}>
									−
								</button>

								<span
									style={{
										fontSize: "16px",
										fontWeight: "bold",
										width: "40px",
										textAlign: "center",
										color: roomCounts[roomType.id]
											? "var(--highlight)"
											: "var(--text)",
									}}>
									{roomCounts[roomType.id] || 0}
								</span>

								<button
									className="btn-2d"
									style={{
										minWidth: "30px",
										height: "30px",
										padding: "0",
										fontSize: "16px",
										fontWeight: "bold",
										background: "var(--highlight)",
										color: "var(--secondary)",
									}}
									onClick={() =>
										handleRoomCountChange(
											roomType.id,
											(roomCounts[roomType.id] || 0) + 1
										)
									}>
									+
								</button>
							</div>

							{roomCounts[roomType.id] > 0 && (
								<div
									style={{
										marginTop: "10px",
										textAlign: "center",
										fontSize: "14px",
										fontWeight: "bold",
										color: "var(--highlight)",
									}}>
									{roomCounts[roomType.id]}{" "}
									{roomCounts[roomType.id] === 1 ? "room" : "rooms"} selected
								</div>
							)}
						</div>
					))}
				</div>
			</div>

			{totalSelectedRooms > 0 && (
				<div
					style={{
						marginBottom: "20px",
						padding: "15px",
						background: "var(--secondary)",
						border: "1px solid var(--accent)",
						borderRadius: "4px",
					}}>
					<h3 className="text-2d">Summary</h3>
					<p>
						Total rooms: <strong>{totalSelectedRooms}</strong>
					</p>

					<div
						style={{
							display: "flex",
							flexWrap: "wrap",
							gap: "10px",
							marginTop: "10px",
						}}>
						{Object.entries(roomCounts)
							.filter(([_, count]) => count > 0)
							.map(([typeId, count]) => {
								const roomType = roomTypes.find((rt) => rt.id === typeId);
								return (
									<div
										key={typeId}
										style={{
											padding: "5px 10px",
											background: "var(--accent)",
											borderRadius: "4px",
											fontSize: "14px",
										}}>
										{roomType?.name || "Unknown"}: {count}
									</div>
								);
							})}
					</div>
				</div>
			)}

			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					gap: "20px",
					marginTop: "25px",
					borderTop: "1px solid var(--accent)",
					paddingTop: "25px",
				}}>
				<button
					className="btn-2d"
					onClick={() => navigate("/dashboard")}
					style={{
						padding: "12px 25px",
						fontSize: "16px",
						background: "var(--accent)",
						color: "var(--text)",
						borderRadius: "8px",
						border: "none",
						cursor: "pointer",
					}}>
					Cancel
				</button>

				<button
					className="btn-2d"
					onClick={handleCreateSpace}
					disabled={totalSelectedRooms === 0 || loading}
					style={{
						padding: "12px 25px",
						fontSize: "16px",
						fontWeight: "bold",
						background:
							totalSelectedRooms > 0 ? "var(--highlight)" : "var(--accent)",
						color: "var(--secondary)",
						opacity: totalSelectedRooms > 0 && !loading ? 1 : 0.6,
						position: "relative",
						minWidth: "220px",
						borderRadius: "8px",
						border: "none",
						cursor:
							totalSelectedRooms > 0 && !loading ? "pointer" : "not-allowed",
						boxShadow:
							totalSelectedRooms > 0
								? "0 4px 10px rgba(var(--highlight-rgb), 0.3)"
								: "none",
						transition: "all 0.2s ease",
					}}>
					{loading
						? "Creating Space..."
						: `Create Space (${totalSelectedRooms} rooms)`}
					{loading && (
						<span
							style={{
								display: "inline-block",
								marginLeft: "10px",
								animation: "spin 1s infinite linear",
							}}>
							↻
						</span>
					)}
				</button>
			</div>
		</div>
	);
}
