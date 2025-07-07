import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import axios from "axios";

interface InvitedUser {
	email: string;
	status: "pending" | "error" | "success";
	message?: string;
	timestamp: Date;
}

export function InviteUser() {
	const { user } = useUser();
	const navigate = useNavigate();
	const { spaceId } = useParams<{ spaceId: string }>();
	const [email, setEmail] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	const [isAdmin, setIsAdmin] = useState(false);
	const [spaceDetails, setSpaceDetails] = useState<{
		id: string;
		adminid: string;
		accessibleuserids?: string[];
	} | null>(null);
	const [invitedUsers, setInvitedUsers] = useState<InvitedUser[]>([]);

	useEffect(() => {
		// Check if the current user is the admin of the space
		const checkAdmin = async () => {
			if (!user || !spaceId) return;

			try {
				const response = await axios.get(
					`http://64.227.158.123:5001/api/spaces/${spaceId}`
				);
				const data = response.data;
				setSpaceDetails(data);

				if (data.adminid === user.id) {
					setIsAdmin(true);
				} else {
					setError("You don't have permission to invite users to this space.");
					setTimeout(() => {
						navigate("/dashboard");
					}, 3000);
				}
			} catch (err) {
				console.error("Error checking admin status:", err);
				setError("Error verifying admin status");
			}
		};

		checkAdmin();
	}, [spaceId, user, navigate]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!user) {
			setError("You must be logged in to invite users");
			return;
		}

		if (!spaceId) {
			setError("Space ID is missing");
			return;
		}

		if (!email.trim() || !email.includes("@")) {
			setError("Please enter a valid email address");
			return;
		}

		setLoading(true);
		setError(null);
		setSuccess(null);

		try {
			// Add to pending invites
			setInvitedUsers((prev) => [
				{ email, status: "pending", timestamp: new Date() },
				...prev,
			]);

			const response = await axios.post(
				`http://64.227.158.123:5001/api/spaces/${spaceId}/access`,
				{
					adminId: user.id,
					emailId: email,
				}
			);

			console.log("User invited successfully:", response.data);

			// Update invites list with success
			setInvitedUsers((prev) =>
				prev.map((invite) =>
					invite.email === email
						? {
								...invite,
								status: "success",
								message: "User invited successfully",
						  }
						: invite
				)
			);

			setSuccess(`Successfully invited ${email} to the space!`);
			setEmail("");

			// Fetch updated space details to show the new user
			const updatedSpace = await axios.get(
				`http://64.227.158.123:5001/api/spaces/${spaceId}`
			);
			setSpaceDetails(updatedSpace.data);
		} catch (err) {
			console.error("Error inviting user:", err);

			let errorMessage = "Failed to invite user";
			if (axios.isAxiosError(err)) {
				errorMessage =
					err.response?.data?.message ||
					`Failed to invite user: ${err.message}`;
			} else if (err instanceof Error) {
				errorMessage = err.message;
			}

			// Update invites list with error
			setInvitedUsers((prev) =>
				prev.map((invite) =>
					invite.email === email
						? { ...invite, status: "error", message: errorMessage }
						: invite
				)
			);

			setError(errorMessage);
		} finally {
			setLoading(false);
		}
	};

	if (!isAdmin && error) {
		return (
			<div
				className="container-2d"
				style={{ maxWidth: "600px", margin: "40px auto" }}>
				<h1 className="title-2d">Invite Users</h1>
				<div
					style={{
						background: "#3d0000",
						padding: "10px",
						marginBottom: "20px",
						border: "2px solid #ff0000",
					}}>
					<p className="text-2d">{error}</p>
					<p className="text-2d" style={{ marginTop: "10px" }}>
						Redirecting to dashboard...
					</p>
				</div>
			</div>
		);
	}

	return (
		<div
			className="container-2d"
			style={{ maxWidth: "800px", margin: "40px auto" }}>
			<h1 className="title-2d" style={{ marginBottom: "20px" }}>
				Invite Users to Your Space
			</h1>

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

			{success && (
				<div
					style={{
						background: "#003d00",
						padding: "10px",
						marginBottom: "20px",
						border: "2px solid #00ff00",
					}}>
					<p className="text-2d">{success}</p>
				</div>
			)}

			<div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
				<div style={{ flex: "1", minWidth: "300px" }}>
					<form onSubmit={handleSubmit}>
						<div className="form-group" style={{ marginBottom: "20px" }}>
							<label
								htmlFor="email"
								className="text-2d"
								style={{
									display: "block",
									marginBottom: "5px",
									fontSize: "16px",
								}}>
								User Email:
							</label>
							<input
								type="email"
								id="email"
								className="input-2d"
								style={{ width: "100%" }}
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								placeholder="Enter the email of the user you want to invite"
							/>
							<p
								className="text-2d"
								style={{
									fontSize: "12px",
									marginTop: "5px",
									color: "var(--highlight)",
								}}>
								The user must have an account in the system
							</p>
						</div>

						<div style={{ marginTop: "20px", display: "flex", gap: "10px" }}>
							<button
								type="submit"
								className="btn-2d"
								disabled={loading || !isAdmin || !email}
								style={{
									background: email ? "var(--highlight)" : "var(--accent)",
									color: "var(--secondary)",
									opacity: email ? 1 : 0.7,
									padding: "10px 20px",
								}}>
								{loading ? "Inviting..." : "Invite User"}
							</button>
							<button
								type="button"
								className="btn-2d"
								onClick={() => navigate("/dashboard")}
								style={{ padding: "10px 20px" }}>
								Back to Dashboard
							</button>
						</div>
					</form>

					<div
						style={{
							marginTop: "30px",
							padding: "15px",
							border: "1px solid var(--accent)",
						}}>
						<h3
							className="text-2d"
							style={{ marginBottom: "10px", fontSize: "16px" }}>
							Space Information
						</h3>
						<p
							className="text-2d"
							style={{ fontSize: "14px", marginBottom: "5px" }}>
							<strong>Space ID:</strong> {spaceId}
						</p>
						{spaceDetails && (
							<div>
								<p
									className="text-2d"
									style={{ fontSize: "14px", marginBottom: "5px" }}>
									<strong>Admin:</strong> You
								</p>
								<p
									className="text-2d"
									style={{ fontSize: "14px", marginBottom: "5px" }}>
									<strong>Accessible Users:</strong>{" "}
									{spaceDetails.accessibleuserids?.length || 1}
								</p>
							</div>
						)}
					</div>
				</div>

				<div style={{ flex: "1", minWidth: "300px" }}>
					<h3
						className="text-2d"
						style={{ marginBottom: "15px", fontSize: "18px" }}>
						Recent Invites
					</h3>

					{invitedUsers.length === 0 ? (
						<div
							style={{
								padding: "15px",
								border: "1px dashed var(--accent)",
								textAlign: "center",
							}}>
							<p className="text-2d" style={{ color: "var(--highlight)" }}>
								No invites sent yet
							</p>
						</div>
					) : (
						<div style={{ maxHeight: "300px", overflowY: "auto" }}>
							{invitedUsers.map((invite, index) => (
								<div
									key={`${invite.email}-${index}`}
									style={{
										padding: "10px",
										marginBottom: "10px",
										border: `1px solid ${
											invite.status === "success"
												? "#00aa00"
												: invite.status === "error"
												? "#aa0000"
												: "#aaaa00"
										}`,
										borderRadius: "4px",
										background:
											invite.status === "success"
												? "rgba(0,170,0,0.1)"
												: invite.status === "error"
												? "rgba(170,0,0,0.1)"
												: "rgba(170,170,0,0.1)",
									}}>
									<div
										style={{
											display: "flex",
											justifyContent: "space-between",
										}}>
										<p
											className="text-2d"
											style={{ fontSize: "14px", fontWeight: "bold" }}>
											{invite.email}
										</p>
										<p className="text-2d" style={{ fontSize: "12px" }}>
											{new Date(invite.timestamp).toLocaleTimeString()}
										</p>
									</div>
									<p
										className="text-2d"
										style={{
											fontSize: "12px",
											marginTop: "4px",
											color:
												invite.status === "success"
													? "#00aa00"
													: invite.status === "error"
													? "#ff0000"
													: "#aaaa00",
										}}>
										{invite.status === "pending"
											? "Sending invite..."
											: invite.message ||
											  (invite.status === "success"
													? "Invited successfully"
													: "Failed to invite")}
									</p>
								</div>
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
