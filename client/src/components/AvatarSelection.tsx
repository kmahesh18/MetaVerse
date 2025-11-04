import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { IAsset } from "../../../server/src/Models/AssetModel";
import "./AvatarSelection.css";

const backendUrl = import.meta.env.VITE_BACKEND_URL;

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
				const response = await fetch(`${backendUrl}/api/assets/avatars`);
				if (!response.ok) {
					const errorData = await response.json().catch(() => ({}));
					console.error("Failed to fetch avatars:", errorData);
					throw new Error(
						errorData.error || `Failed to fetch avatars: ${response.status}`
					);
				}
				const data = await response.json();
				setAvatars(data);
			} catch (err) {
				console.error("Avatar fetch error:", err);
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
			const userResponse = await fetch(
				`${backendUrl}/api/user/${user.id}/avatar`,
				{
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						avatarId: selectedAvatarId,
					}),
				}
			);

			if (!userResponse.ok) {
				const errorData = await userResponse.json().catch(() => ({}));
				console.error("Failed to save avatar selection:", errorData);
				throw new Error(
					errorData.message ||
						`Failed to save avatar selection: ${userResponse.status}`
				);
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
			<div className="avatar-loading">
				<div className="avatar-loading-spinner"></div>
				<p className="avatar-loading-text">Loading avatars...</p>
			</div>
		);
	}

	if (avatars.length === 0 && !error) {
		return (
			<div className="avatar-selection-container">
				<h1 className="avatar-selection-title">Select Your Avatar</h1>
				<p className="avatar-error">No avatars available in the database.</p>
				<p className="avatar-error">
					Please add some avatars to the assets collection first.
				</p>
			</div>
		);
	}

	return (
		<div className="avatar-selection-container">
			<h1 className="avatar-selection-title">Select Your Avatar</h1>

			{error && (
				<div className="avatar-error">
					{error}
				</div>
			)}

			<div className="avatar-grid">
				{avatars.map((avatar) => (
					<div
						key={avatar._id ? avatar._id.toString() : `avatar-${avatar.name}`}
						className={`avatar-card ${
							selectedAvatarId === (avatar._id?.toString() || "")
								? "avatar-card-selected"
								: ""
						} ${isUpdating ? "avatar-card-disabled" : ""}`}
						onClick={() =>
							!isUpdating &&
							avatar._id &&
							setSelectedAvatarId(avatar._id.toString())
						}>
						<div className="avatar-image-container">
							<img
								src={avatar.previewUrl}
								alt={avatar.name}
								className="avatar-image"
							/>
						</div>
						<p className="avatar-name">{avatar.name}</p>
					</div>
				))}
			</div>

			<button
				className="avatar-continue-btn"
				onClick={handleAvatarSelect}
				disabled={!selectedAvatarId || isUpdating}>
				{isUpdating ? "Saving..." : "Continue"}
			</button>
		</div>
	);
}
