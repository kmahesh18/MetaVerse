import { useNavigate } from "react-router-dom";
import { useClerk, useUser } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import "../styles/theme.css";

function getRandomInt(min: number, max: number) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function FloatingShapes() {
	const shapes = Array.from({ length: 14 }).map((_, i) => {
		const size = getRandomInt(24, 60);
		const left = getRandomInt(0, 100);
		const top = getRandomInt(0, 100);
		const borderRadius = Math.random() > 0.5 ? "50%" : "0";
		const rotate = getRandomInt(0, 360);
		const opacity = Math.random() * 0.15 + 0.07;
		const border = Math.random() > 0.5 ? "2px solid #000" : "none";
		const background = border === "none" ? "#000" : "#fff";
		return (
			<div
				key={i}
				style={{
					position: "absolute",
					left: `${left}%`,
					top: `${top}%`,
					width: size,
					height: size,
					borderRadius,
					background,
					border,
					opacity,
					transform: `rotate(${rotate}deg)`,
					zIndex: 0,
					pointerEvents: "none",
				}}
			/>
		);
	});
	return <>{shapes}</>;
}

export function Homepage() {
	const { isSignedIn, user } = useUser();
	const { openSignIn } = useClerk();
	const navigate = useNavigate();
	const [error, setError] = useState<string | null>(null);
	const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });

	useEffect(() => {
		const initUser = async () => {
			if (isSignedIn && user) {
				try {
					const response = await fetch(
						`http://64.227.158.123:5001/api/user/${user.id}`
					);
					if (!response.ok) {
						const createResponse = await fetch(
							`http://64.227.158.123:5001/api/user`,
							{
								method: "POST",
								headers: { "Content-Type": "application/json" },
								body: JSON.stringify({
									clerkId: user.id,
									avatarId: "",
									emailId: user.emailAddresses[0].emailAddress,
								}),
							}
						);
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

	const handleMouseMove = (e: React.MouseEvent) => {
		setCursorPosition({ x: e.clientX, y: e.clientY });
	};

	// Animations: inject keyframes once
	useEffect(() => {
		const style = document.createElement("style");
		style.innerHTML = `
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(30px);}
            to { opacity: 1; transform: translateY(0);}
        }
        @keyframes underlineGrow {
            from { width: 0; }
            to { width: 60px; }
        }
        @keyframes cursorPulse {
            0% { box-shadow: 0 0 0 0 #0002;}
            50% { box-shadow: 0 0 12px 4px #0001;}
            100% { box-shadow: 0 0 0 0 #0002;}
        }
        `;
		document.head.appendChild(style);
		return () => {
			document.head.removeChild(style);
		};
	}, []);

	return (
		<>
			{/* Static background shapes in a fixed position container */}
			<div
				style={{
					position: "fixed",
					top: 0,
					left: 0,
					right: 0,
					bottom: 0,
					pointerEvents: "none",
					zIndex: 0,
				}}>
				<FloatingShapes />
			</div>

			{/* Interactive container with mouse tracking */}
			<div
				className="homepage-bw"
				style={{
					minHeight: "100vh",
					background: "transparent", // Change to transparent to see shapes
					color: "#000",
					fontFamily: "'Press Start 2P', monospace",
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
					position: "relative",
					overflow: "hidden",
				}}
				onMouseMove={handleMouseMove}>
				{/* Main content, full width */}
				<div
					style={{
						zIndex: 1,
						width: "100vw",
						maxWidth: "100vw",
						padding: "0",
						margin: "0",
						textAlign: "center",
						animation: "fadeIn 0.8s cubic-bezier(.4,2,.6,1)",
					}}>
					<h1
						style={{
							fontSize: "2.8rem",
							letterSpacing: "2px",
							margin: "48px 0 12px 0",
							color: "#000",
							textShadow: "2px 2px 0 #fff, 4px 4px 0 #000",
							animation: "fadeIn 1.2s cubic-bezier(.4,2,.6,1)",
						}}>
						MetaVerse
					</h1>
					<div
						style={{
							height: "4px",
							width: "60px",
							background: "#000",
							margin: "0 auto 32px auto",
							borderRadius: "2px",
							animation: "underlineGrow 1.2s cubic-bezier(.4,2,.6,1)",
						}}
					/>
					<p
						style={{
							fontSize: "1.3rem",
							marginBottom: "32px",
							color: "#222",
							opacity: 0.85,
							fontWeight: 500,
							animation: "fadeIn 1.5s cubic-bezier(.4,2,.6,1)",
						}}>
						Step into a{" "}
						<span style={{ color: "#000", fontWeight: 700 }}>
							black & white
						</span>{" "}
						2D world where connection meets creativity.
					</p>

					{error && (
						<div
							style={{
								background: "#000",
								color: "#fff",
								padding: "10px 16px",
								borderRadius: "6px",
								marginBottom: "18px",
								fontSize: "0.95rem",
								fontWeight: 600,
								letterSpacing: "1px",
								animation: "fadeIn 1.2s cubic-bezier(.4,2,.6,1)",
								display: "inline-block",
							}}>
							⚠️ {error}
						</div>
					)}

					<div
						style={{
							marginBottom: "30px",
							display: "flex",
							flexDirection: "column",
							gap: "16px",
							alignItems: "center",
							animation: "fadeIn 1.7s cubic-bezier(.4,2,.6,1)",
						}}>
						{!isSignedIn ? (
							<button
								className="btn-2d"
								style={{
									background: "#000",
									color: "#fff",
									border: "2px solid #000",
									fontSize: "1.1rem",
									padding: "14px 0",
									borderRadius: "8px",
									fontWeight: 700,
									letterSpacing: "1px",
									boxShadow: "0 2px 0 #000",
									transition: "all 0.2s",
									cursor: "pointer",
									width: 220,
									margin: "0 auto",
								}}
								onClick={() => openSignIn()}>
								Sign In to Begin
							</button>
						) : (
							<div
								style={{
									fontSize: "1.1rem",
									color: "#000",
									fontWeight: 600,
									padding: "10px 0",
								}}>
								Welcome back, explorer!
							</div>
						)}
					</div>

					{/* Features, full width */}
					<div
						style={{
							margin: "0 auto 0 auto",
							padding: "32px 0 24px 0",
							width: "100vw",
							maxWidth: "100vw",
							background: "rgba(255,255,255,0.92)",
							borderTop: "2px solid #000",
							borderBottom: "2px solid #000",
							boxShadow: "0 2px 0 #000",
							animation: "fadeIn 2.2s cubic-bezier(.4,2,.6,1)",
						}}>
						<div
							style={{
								fontWeight: 700,
								fontSize: "1.18rem",
								marginBottom: "18px",
								color: "#000",
								letterSpacing: "1px",
							}}>
							Features
						</div>
						<ul
							style={{
								listStyle: "none",
								padding: 0,
								margin: "0 auto",
								color: "#111",
								fontSize: "1.08rem",
								maxWidth: 600,
								display: "flex",
								justifyContent: "center",
								flexWrap: "wrap",
								gap: "28px",
							}}>
							<li>👥 Real-time multiplayer</li>
							<li>👤 Customizable 2D avatars</li>
							<li>🏢 Virtual meeting spaces</li>
							<li>🌍 Interactive environments</li>
							<li>⚡ Pure black & white aesthetic</li>
						</ul>
					</div>
				</div>

				{/* Cursor follower */}
				<div
					style={{
						position: "fixed",
						left: cursorPosition.x - 10,
						top: cursorPosition.y - 10,
						width: 20,
						height: 20,
						borderRadius: "50%",
						border: "2px solid #000",
						background: "#fff",
						pointerEvents: "none",
						zIndex: 100,
						opacity: 0.12,
						transition:
							"left 0.15s cubic-bezier(.4,2,.6,1), top 0.15s cubic-bezier(.4,2,.6,1)",
						animation: "cursorPulse 2s infinite",
					}}
				/>

				<footer
					style={{
						position: "fixed",
						bottom: 18,
						left: 0,
						width: "100%",
						textAlign: "center",
						color: "#000",
						fontSize: "0.95rem",
						letterSpacing: "1px",
						opacity: 0.7,
						zIndex: 2,
						animation: "fadeIn 2.2s cubic-bezier(.4,2,.6,1)",
					}}>
					<span style={{ fontWeight: 700 }}>MetaVerse</span> &copy;{" "}
					{new Date().getFullYear()} &mdash; Black & White Edition
				</footer>
			</div>
		</>
	);
}
