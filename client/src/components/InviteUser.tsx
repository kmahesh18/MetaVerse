import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import axios from "axios";
import "./InviteUser.css";

interface InvitedUser {
	email: string;
	status: "pending" | "error" | "success";
	message?: string;
	timestamp: Date;
}

const backendUrl = import.meta.env.VITE_BACKEND_URL;

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
				const response = await axios.get(`${backendUrl}/api/spaces/${spaceId}`);
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
				`${backendUrl}/api/spaces/${spaceId}/access`,
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
				`${backendUrl}/api/spaces/${spaceId}`
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
			<div className="invite-access-denied">
				<h1>Invite Users</h1>
				<div className="invite-alert invite-alert-error">
					<p>{error}</p>
					<p style={{ marginTop: "10px" }}>
						Redirecting to dashboard...
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="invite-user-page">
			<h1 className="invite-user-title">
				Invite Users to Your Space
			</h1>

			{error && (
				<div className="invite-alert invite-alert-error">
					<p>{error}</p>
				</div>
			)}

			{success && (
				<div className="invite-alert invite-alert-success">
					<p>{success}</p>
				</div>
			)}

			<div className="invite-content-grid">
				<div className="invite-form-section">
					<form onSubmit={handleSubmit}>
						<div className="invite-form-group">
							<label
								htmlFor="email"
								className="invite-form-label">
								User Email:
							</label>
							<input
								type="email"
								id="email"
								className="invite-form-input"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								placeholder="Enter the email of the user you want to invite"
							/>
							<p className="invite-form-hint">
								The user must have an account in the system
							</p>
						</div>

						<div className="invite-button-group">
							<button
								type="submit"
								className="invite-btn invite-btn-primary"
								disabled={loading || !isAdmin || !email}>
								{loading ? "Inviting..." : "Invite User"}
							</button>
							<button
								type="button"
								className="invite-btn invite-btn-secondary"
								onClick={() => navigate("/dashboard")}>
								Back to Dashboard
							</button>
						</div>
					</form>

					<div className="invite-space-info">
						<h3 className="invite-space-info-title">
							Space Information
						</h3>
						<p className="invite-space-info-item">
							<strong>Space ID:</strong> {spaceId}
						</p>
						{spaceDetails && (
							<div>
								<p className="invite-space-info-item">
									<strong>Admin:</strong> You
								</p>
								<p className="invite-space-info-item">
									<strong>Accessible Users:</strong>{" "}
									{spaceDetails.accessibleuserids?.length || 1}
								</p>
							</div>
						)}
					</div>
				</div>

				<div className="invite-list-section">
					<h3 className="invite-list-title">
						Recent Invites
					</h3>

					{invitedUsers.length === 0 ? (
						<div className="invite-list-empty">
							<p>No invites sent yet</p>
						</div>
					) : (
						<div className="invite-list-container">
							{invitedUsers.map((invite, index) => (
								<div
									key={`${invite.email}-${index}`}
									className={`invite-item invite-item-${invite.status}`}>
									<div className="invite-item-header">
										<p className="invite-item-email">
											{invite.email}
										</p>
										<p className="invite-item-time">
											{new Date(invite.timestamp).toLocaleTimeString()}
										</p>
									</div>
									<p className={`invite-item-message invite-item-message-${invite.status}`}>
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
