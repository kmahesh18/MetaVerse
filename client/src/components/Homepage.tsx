import { useNavigate } from "react-router-dom";
import { useClerk, useUser } from "@clerk/clerk-react";
import { useEffect, useState, useCallback } from "react";
import "../styles/theme.css";

export function Homepage() {
	const { isSignedIn, user } = useUser();
	const { openSignIn } = useClerk();
	const navigate = useNavigate();
	const [error, setError] = useState<string | null>(null);
	const [windowSize, setWindowSize] = useState({
		width: typeof window !== 'undefined' ? window.innerWidth : 1200,
		height: typeof window !== 'undefined' ? window.innerHeight : 800
	});

	// Handle window resize
	const handleResize = useCallback(() => {
		setWindowSize({
			width: window.innerWidth,
			height: window.innerHeight
		});
	}, []);

	useEffect(() => {
		// Set up resize listener
		window.addEventListener('resize', handleResize);
		// Initial call to set correct size
		handleResize();
		
		return () => window.removeEventListener('resize', handleResize);
	}, [handleResize]);

	useEffect(() => {
		const initUser = async () => {
			if (isSignedIn && user) {
				try {
					const response = await fetch(
						`${import.meta.env.VITE_BKPORT}/api/user/${user.id}`
					);
					if (!response.ok) {
						const createResponse = await fetch(
							`${import.meta.env.VITE_BKPORT}/api/user`,
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

	return (
		<div
			style={{
				minHeight: "100vh",
				background: `
				radial-gradient(circle at 20% 20%, var(--neon-blue)15 0%, transparent 50%),
				radial-gradient(circle at 80% 80%, var(--neon-cyan)10 0%, transparent 50%),
				var(--bg-primary)
			`,
				color: "var(--text-primary)",
				fontFamily: "var(--font-primary)",
				position: "relative",
				overflow: "hidden",
			}}
		>
			{/* Animated Background Grid */}
			<div
				style={{
					position: "fixed",
					top: 0,
					left: 0,
					right: 0,
					bottom: 0,
					backgroundImage: `
					linear-gradient(rgba(0, 212, 255, 0.1) 1px, transparent 1px),
					linear-gradient(90deg, rgba(0, 212, 255, 0.1) 1px, transparent 1px)
				`,
					backgroundSize: windowSize.width <= 768 ? "30px 30px" : "50px 50px",
					animation: "float 20s ease-in-out infinite",
					zIndex: 0,
				}}
			/>

			{/* Main Content */}
			<main
				style={{
					position: "relative",
					zIndex: 2,
					padding: windowSize.width <= 768 ? "1rem" : "2rem",
				}}
			>
				{/* Hero Section */}
				<section
					style={{
						textAlign: "center",
						minHeight: "100vh",
						display: "flex",
						flexDirection: "column",
						justifyContent: "center",
						alignItems: "center",
						maxWidth: "1200px",
						margin: "0 auto",
					}}
				>
					<div
						className="container-2d"
						style={{
							padding: windowSize.width <= 768 ? "2rem 1.5rem" : "4rem",
							background: "linear-gradient(135deg, var(--bg-surface)aa, var(--bg-elevated)aa)",
							backdropFilter: "blur(20px)",
							border: "1px solid var(--border-accent)",
							borderRadius: "var(--border-radius-xl)",
							boxShadow: "var(--shadow-xl), var(--shadow-neon)",
							animation: "fadeInUp 1s ease-out",
							width: "100%",
							maxWidth: windowSize.width <= 768 ? "100%" : "none"
						}}
					>
						{/* Logo and Title */}
						<div style={{ marginBottom: windowSize.width <= 768 ? "2rem" : "3rem" }}>
							<h1
								style={{
									fontSize: windowSize.width <= 480 ? "2.5rem" : windowSize.width <= 768 ? "3rem" : "4rem",
									fontFamily: "var(--font-display)",
									fontWeight: "800",
									lineHeight: "1.1",
									marginBottom: "1rem",
									background: "linear-gradient(135deg, var(--neon-blue), var(--neon-cyan))",
									WebkitBackgroundClip: "text",
									WebkitTextFillColor: "transparent",
									backgroundClip: "text",
									textTransform: "uppercase",
									letterSpacing: windowSize.width <= 768 ? "2px" : "3px",
									animation: "neonPulse 3s ease-in-out infinite",
								}}
							>
								MetaVerse
							</h1>

							<div
								style={{
									width: windowSize.width <= 768 ? "80px" : "120px",
									height: "3px",
									background: "linear-gradient(90deg, transparent, var(--neon-blue), transparent)",
									margin: "2rem auto",
									borderRadius: "2px",
									animation: "glow 2s ease-in-out infinite",
								}}
							/>

							<p
								style={{
									fontSize: windowSize.width <= 480 ? "1rem" : windowSize.width <= 768 ? "1.1rem" : "1.3rem",
									color: "var(--text-secondary)",
									maxWidth: windowSize.width <= 768 ? "100%" : "600px",
									margin: "0 auto",
									lineHeight: "1.6",
									fontWeight: "400",
									padding: windowSize.width <= 768 ? "0 1rem" : "0"
								}}
							>
								Experience the next generation of virtual collaboration
								in our professional
								<span
									style={{
										color: "var(--neon-blue)",
										fontWeight: "600",
										fontFamily: "var(--font-display)",
									}}
								>
									{" "}
									2D gaming environment
								</span>
								.
							</p>
						</div>

						{/* Error Display */}
						{error && (
							<div
								className="notification error"
								style={{
									position: "relative",
									top: "auto",
									right: "auto",
									marginBottom: "2rem",
									display: "inline-block",
									width: windowSize.width <= 768 ? "100%" : "auto",
									textAlign: "left"
								}}
							>
								<strong>System Error:</strong> {error}
							</div>
						)}

						{/* Call to Action */}
						<div
							style={{
								display: "flex",
								gap: windowSize.width <= 768 ? "1rem" : "1.5rem",
								justifyContent: "center",
								alignItems: "center",
								flexWrap: "wrap",
								marginBottom: windowSize.width <= 768 ? "2rem" : "3rem",
								flexDirection: windowSize.width <= 480 ? "column" : "row"
							}}
						>
							{!isSignedIn ? (
								<>
									<button
										className="btn-2d primary"
										style={{
											fontSize: windowSize.width <= 768 ? "1rem" : "1.1rem",
											padding: windowSize.width <= 768 ? "0.8rem 2rem" : "1rem 2.5rem",
											fontWeight: "600",
											width: windowSize.width <= 480 ? "100%" : "auto",
											maxWidth: windowSize.width <= 480 ? "300px" : "none"
										}}
										onClick={() => openSignIn()}
									>
										Start Your Journey
									</button>
									<span
										style={{
											color: "var(--text-muted)",
											fontFamily: "var(--font-mono)",
											fontSize: windowSize.width <= 768 ? "0.8rem" : "0.9rem",
											textAlign: "center"
										}}
									>
										Free to join • No setup required
									</span>
								</>
							) : (
								<button
									className="btn-2d primary"
									style={{
										fontSize: windowSize.width <= 768 ? "1rem" : "1.1rem",
										padding: windowSize.width <= 768 ? "0.8rem 2rem" : "1rem 2.5rem",
										fontWeight: "600",
										width: windowSize.width <= 480 ? "100%" : "auto",
										maxWidth: windowSize.width <= 480 ? "300px" : "none"
									}}
									onClick={() => navigate("/dashboard")}
								>
									Access Dashboard
								</button>
							)}
						</div>

						{/* Features Grid */}
						<div
							className="grid-container"
							style={{
								gridTemplateColumns: windowSize.width <= 768 
									? "1fr" 
									: "repeat(auto-fit, minmax(250px, 1fr))",
								gap: windowSize.width <= 768 ? "1rem" : "1.5rem",
							}}
						>
							{[
								{
									icon: "👥",
									title: "Multiplayer Spaces",
									description:
										"Connect with teams worldwide in real-time collaborative environments",
								},
								{
									icon: "🎮",
									title: "Gaming Interface",
									description:
										"Professional 2D interface designed for seamless interaction and navigation",
								},
								{
									icon: "🏢",
									title: "Virtual Offices",
									description:
										"Create custom workspaces tailored to your team's specific needs",
								},
								{
									icon: "⚡",
									title: "High Performance",
									description:
										"Optimized for speed with minimal latency and maximum reliability",
								},
							].map((feature, index) => (
								<div
									key={index}
									className="grid-item"
									style={{
										textAlign: "center",
										animation: `fadeInUp ${1 + index * 0.2}s ease-out`,
									}}
								>
									<div
										style={{
											fontSize: "2.5rem",
											marginBottom: "1rem",
											opacity: 0.8,
										}}
									>
										{feature.icon}
									</div>
									<h3
										className="subtitle-2d"
										style={{
											fontSize: "1rem",
											marginBottom: "0.75rem",
										}}
									>
										{feature.title}
									</h3>
									<p
										className="text-2d"
										style={{
											fontSize: "0.9rem",
											lineHeight: "1.5",
											margin: 0,
										}}
									>
										{feature.description}
									</p>
								</div>
							))}
						</div>
					</div>

					{/* Stats Section */}
					<div
						style={{
							marginTop: windowSize.width <= 768 ? "2rem" : "4rem",
							display: "grid",
							gridTemplateColumns: windowSize.width <= 480 
								? "1fr" 
								: windowSize.width <= 768 
									? "repeat(2, 1fr)" 
									: "repeat(auto-fit, minmax(200px, 1fr))",
							gap: windowSize.width <= 768 ? "1rem" : "2rem",
							maxWidth: "800px",
							width: "100%",
							padding: windowSize.width <= 768 ? "0 1rem" : "0"
						}}
					>
						{[
							{
								label: "Active Users",
								value: "1,247",
								color: "var(--neon-blue)",
							},
							{
								label: "Virtual Spaces",
								value: "89",
								color: "var(--neon-cyan)",
							},
							{
								label: "Uptime",
								value: "99.9%",
								color: "var(--neon-green)",
							},
						].map((stat, index) => (
							<div
								key={index}
								className="container-2d"
								style={{
									textAlign: "center",
									padding: "1.5rem",
									animation: `fadeInUp ${1.5 + index * 0.2}s ease-out`,
								}}
							>
								<div
									style={{
										fontSize: "2rem",
										fontFamily: "var(--font-display)",
										fontWeight: "700",
										color: stat.color,
										marginBottom: "0.5rem",
										animation: "neonPulse 2s ease-in-out infinite",
									}}
								>
									{stat.value}
								</div>
								<div
									style={{
										fontSize: "0.9rem",
										color: "var(--text-muted)",
										textTransform: "uppercase",
										letterSpacing: "0.5px",
										fontFamily: "var(--font-mono)",
									}}
								>
									{stat.label}
								</div>
							</div>
						))}
					</div>
				</section>
			</main>

			{/* Footer */}
			<footer
				style={{
					background: "linear-gradient(135deg, var(--bg-surface)cc, var(--bg-elevated)cc)",
					backdropFilter: "blur(20px)",
					borderTop: "1px solid var(--border-primary)",
					padding: windowSize.width <= 768 ? "1.5rem 1rem" : "2rem",
					textAlign: "center",
					position: "relative",
					zIndex: 2,
				}}
			>
				<div
					style={{
						maxWidth: "1200px",
						margin: "0 auto",
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						flexWrap: "wrap",
						gap: "1rem",
						flexDirection: windowSize.width <= 480 ? "column" : "row",
						textAlign: windowSize.width <= 480 ? "center" : "left"
					}}
				>
					<div
						style={{
							fontFamily: "var(--font-display)",
							fontWeight: "700",
							fontSize: windowSize.width <= 768 ? "1rem" : "1.2rem",
							background: "linear-gradient(135deg, var(--neon-blue), var(--neon-cyan))",
							WebkitBackgroundClip: "text",
							WebkitTextFillColor: "transparent",
							backgroundClip: "text",
						}}
					>
						MetaVerse
					</div>
					<div
						style={{
							fontSize: windowSize.width <= 768 ? "0.8rem" : "0.9rem",
							color: "var(--text-muted)",
							fontFamily: "var(--font-mono)",
						}}
					>
						© {new Date().getFullYear()} MetaVerse. Professional Virtual Collaboration Platform.
					</div>
				</div>
			</footer>
		</div>
	);
}
