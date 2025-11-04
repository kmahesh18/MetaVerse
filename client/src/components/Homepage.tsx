import { useNavigate } from "react-router-dom";
import { useClerk, useUser } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import "./Homepage.css";

export function Homepage() {
	const { isSignedIn, user } = useUser();
	const { openSignIn } = useClerk();
	const navigate = useNavigate();
	const [error, setError] = useState<string | null>(null);

	const backendUrl = import.meta.env.VITE_BACKEND_URL;

	useEffect(() => {
		const initUser = async () => {
			if (isSignedIn && user) {
				try {
					const response = await fetch(`${backendUrl}/api/user/${user.id}`);
					if (!response.ok) {
						const createResponse = await fetch(`${backendUrl}/api/user`, {
							method: "POST",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({
								clerkId: user.id,
								avatarId: "",
								emailId: user.emailAddresses[0].emailAddress,
							}),
						});
						if (!createResponse.ok) {
							const errorData = await createResponse.json();
							throw new Error(
								`Failed to create user: ${
									errorData.error || createResponse.statusText
								}`
							);
						}
						navigate("/select-avatar");
						return;
					}
					const userData = await response.json();
					if (!userData.avatarId) {
						navigate("/select-avatar");
					} else {
						navigate("/dashboard");
					}
				} catch (err) {
					setError((err as Error).message);
					navigate("/select-avatar");
				}
			}
		};
		initUser();
	}, [isSignedIn, user, navigate]);

	return (
		<div className="homepage-bw">
			{/* Pixel art corners */}
			<div className="corner-decoration corner-tl"></div>
			<div className="corner-decoration corner-tr"></div>
			<div className="corner-decoration corner-bl"></div>
			<div className="corner-decoration corner-br"></div>

			{/* Scanline effect */}
			<div className="scanlines"></div>

			<div className="homepage-container">
				{/* Header with game-like border */}
				<div className="game-header">
					<div className="pixel-border-top"></div>
					<div className="homepage-logo">
						<span className="logo-bracket">[</span>
						METAVERSE
						<span className="logo-bracket">]</span>
					</div>
					<div className="pixel-border-bottom"></div>
				</div>

				{/* Main content area */}
				<div className="game-content">
					<div className="tagline-box">
						<div className="blinking-cursor">▶</div>
						<p className="homepage-tagline">
							Step into a black & white 2D world where connection meets creativity
						</p>
					</div>

					{error && (
						<div className="error-message animate-slide-in">
							⚠️ {error}
						</div>
					)}

					{/* Game-style CTA */}
					<div className="homepage-cta">
						{!isSignedIn ? (
							<button className="btn-game-start" onClick={() => openSignIn()}>
								<span className="btn-text">PRESS START</span>
								<span className="btn-subtext">[SIGN IN TO BEGIN]</span>
							</button>
						) : (
							<div className="welcome-message">
								<span className="welcome-icon">★</span>
								<span>PLAYER DETECTED</span>
								<span className="welcome-icon">★</span>
							</div>
						)}
					</div>

					{/* Compact features grid */}
					<div className="features-compact">
						<div className="feature-pill">
							<span className="pill-icon">◆</span>
							<span>MULTIPLAYER</span>
						</div>
						<div className="feature-pill">
							<span className="pill-icon">◆</span>
							<span>AVATARS</span>
						</div>
						<div className="feature-pill">
							<span className="pill-icon">◆</span>
							<span>SPACES</span>
						</div>
						<div className="feature-pill">
							<span className="pill-icon">◆</span>
							<span>INTERACTIVE</span>
						</div>
					</div>
				</div>

				{/* Footer with retro style */}
				<div className="game-footer">
					<div className="footer-line"></div>
					<span className="footer-text">METAVERSE © {new Date().getFullYear()}</span>
				</div>
			</div>
		</div>
	);
}
