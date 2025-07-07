import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";

export function JoinSpace() {
	const { user } = useUser();
	const navigate = useNavigate();
	const location = useLocation();
	const [spaceId, setSpaceId] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Check if there's a prefilled space ID from location state
	useEffect(() => {
		if (location.state?.prefillSpaceId) {
			setSpaceId(location.state.prefillSpaceId);
		}
	}, [location.state]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!user) {
			setError("You must be logged in to join a space");
			return;
		}

		if (!spaceId.trim()) {
			setError("Please enter a space ID");
			return;
		}

		setLoading(true);
		setError(null);

		try {
			const response = await fetch(
				`https://64.227.158.123:5001/api/spaces/${spaceId}/join`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						clerkId: user.id,
					}),
				}
			);

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(
					errorData.message || `Failed to join space: ${response.status}`
				);
			}

			const data = await response.json();
			console.log("Joined space successfully:", data);

			// Navigate to dashboard after successful join
			navigate("/dashboard", {
				state: {
					notification: "Successfully joined the space!",
					spaceId: spaceId,
				},
			});
		} catch (err) {
			console.error("Error joining space:", err);
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setLoading(false);
		}
	};

	return (
		<div
			className="container-2d"
			style={{ maxWidth: "600px", margin: "40px auto" }}>
			<h1 className="title-2d">Join a Space</h1>

			{error && (
				<div
					style={{
						background: "#3d0000",
						padding: "10px",
						marginBottom: "20px",
						border: "2px solid #ff0000",
					}}>
					<p className="text-2d">{error}</p>
				</div>
			)}

			<form onSubmit={handleSubmit}>
				<div className="form-group" style={{ marginBottom: "20px" }}>
					<label
						htmlFor="spaceId"
						className="text-2d"
						style={{ display: "block", marginBottom: "5px", fontSize: "20px" }}>
						Space ID:
					</label>
					<input
						type="text"
						id="spaceId"
						className="input-2d"
						style={{ width: "100%" }}
						value={spaceId}
						onChange={(e) => setSpaceId(e.target.value)}
						placeholder="Enter the space ID you want to join"
					/>
					<p
						className="text-2d"
						style={{
							fontSize: "12px",
							marginTop: "5px",
							color: "var(--highlight)",
						}}>
						Ask the space admin for the ID
					</p>
				</div>

				<div style={{ marginTop: "20px", textAlign: "center" }}>
					<button type="submit" className="btn-2d" disabled={loading}>
						{loading ? "Joining..." : "Join Space"}
					</button>
					<button
						type="button"
						className="btn-2d"
						onClick={() => navigate("/dashboard")}
						style={{ marginLeft: "10px" }}>
						Cancel
					</button>
				</div>
			</form>
		</div>
	);
}
