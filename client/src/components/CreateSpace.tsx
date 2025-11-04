import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { IRoomType } from "../../../shared/types";
import axios from "axios";
import "./CreateSpace.css";

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

	const backendUrl = import.meta.env.VITE_BACKEND_URL;

	// Fetch room types from the API when component mounts
	useEffect(() => {
		const fetchRoomTypes = async () => {
			try {
				setLoading(true);
				// Update to use the backend port from environment variables
				const response = await axios.get(`${backendUrl}/api/roomtypes`);

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
			const response = await axios.post(`${backendUrl}/api/spaces`, {
				adminid: user.id,
				selectedRoomTypes: selectedRoomTypes,
			});

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
			<div className="create-space-loading">
				<p>Creating your space...</p>
			</div>
		);
	}

	return (
		<div className="create-space-page">
			<h1 className="create-space-title">
				Create Your Virtual Space
			</h1>

			{error && (
				<div className="create-space-error">
					{error}
				</div>
			)}

			<div className="create-space-section">
				<h2 className="create-space-subtitle">Select Room Types</h2>
				<p className="create-space-description">
					Choose which room types to include in your space and how many of each.
				</p>

				<div className="room-types-grid">
					{roomTypes.map((roomType) => (
						<div
							key={roomType.id}
							className={`room-type-card ${
								roomCounts[roomType.id] ? "room-type-card-selected" : ""
							}`}>
							<div className="room-type-header">
								<h3
									className={`room-type-name ${
										roomCounts[roomType.id] ? "room-type-name-selected" : ""
									}`}>
									{roomType.name}
								</h3>
								<p className="room-type-description">
									{roomType.description ||
										"A customizable room for your space."}
								</p>
							</div>

							<div className="room-count-controls">
								<button
									className="room-count-btn"
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
									className={`room-count-display ${
										roomCounts[roomType.id] ? "room-count-selected" : ""
									}`}>
									{roomCounts[roomType.id] || 0}
								</span>

								<button
									className="room-count-btn room-count-btn-add"
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
								<div className="room-count-status">
									{roomCounts[roomType.id]}{" "}
									{roomCounts[roomType.id] === 1 ? "room" : "rooms"} selected
								</div>
							)}
						</div>
					))}
				</div>
			</div>

			{totalSelectedRooms > 0 && (
				<div className="create-space-summary">
					<h3 className="create-space-summary-title">Summary</h3>
					<p className="create-space-summary-total">
						Total rooms: <strong>{totalSelectedRooms}</strong>
					</p>

					<div className="summary-tags-container">
						{Object.entries(roomCounts)
							.filter(([_, count]) => count > 0)
							.map(([typeId, count]) => {
								const roomType = roomTypes.find((rt) => rt.id === typeId);
								return (
									<div key={typeId} className="summary-tag">
										{roomType?.name || "Unknown"}: {count}
									</div>
								);
							})}
					</div>
				</div>
			)}

			<div className="create-space-actions">
				<button
					className="create-space-btn create-space-btn-cancel"
					onClick={() => navigate("/dashboard")}>
					Cancel
				</button>

				<button
					className="create-space-btn create-space-btn-submit"
					onClick={handleCreateSpace}
					disabled={totalSelectedRooms === 0 || loading}>
					{loading
						? "Creating Space..."
						: `Create Space (${totalSelectedRooms} rooms)`}
					{loading && (
						<span className="create-space-loading-spinner">
							↻
						</span>
					)}
				</button>
			</div>
		</div>
	);
}
