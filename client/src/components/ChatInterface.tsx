import React, { useState, useEffect, useRef } from "react";

interface ChatMessage {
	senderId: string;
	senderName: string;
	message: string;
	timestamp: number;
	type: "public" | "proximity";
	chatRadius?: number;
	senderPosition?: { posX: number; posY: number };
}

interface ChatInterfaceProps {
	ws: WebSocket;
	userId: string;
}

export function ChatInterface({ ws, userId }: ChatInterfaceProps) {
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [inputText, setInputText] = useState("");
	const [isVisible, setIsVisible] = useState(false);
	const [chatMode, setChatMode] = useState<"public" | "proximity">("public");
	const [proximityRadius, setProximityRadius] = useState(150);
	const messagesEndRef = useRef<HTMLDivElement>(null);

	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	};

	useEffect(scrollToBottom, [messages]);

	useEffect(() => {
		const handleMessage = (event: MessageEvent) => {
			try {
				const data = JSON.parse(event.data);

				if (data.type === "publicChat") {
					setMessages((prev) => [
						...prev,
						{
							...data.payload,
							type: "public",
						},
					]);
				} else if (data.type === "proximityChat") {
					setMessages((prev) => [
						...prev,
						{
							...data.payload,
							type: "proximity",
						},
					]);
				} else if (data.type === "proximityChatInfo") {
					console.log(
						`📡 Proximity message sent to ${data.payload.recipientCount} players within ${data.payload.radius}px`
					);
				}
			} catch (error) {
				console.error("Error parsing chat message:", error);
			}
		};

		ws.addEventListener("message", handleMessage);
		return () => ws.removeEventListener("message", handleMessage);
	}, [ws]);

	const sendMessage = (e: React.FormEvent) => {
		e.preventDefault();
		if (!inputText.trim()) return;

		const messageType = chatMode === "public" ? "publicChat" : "proximityChat";
		const payload =
			chatMode === "public"
				? { text: inputText.trim() }
				: { text: inputText.trim(), chatRadius: proximityRadius };

		ws.send(
			JSON.stringify({
				type: messageType,
				payload,
			})
		);

		setInputText("");
	};

	const formatTime = (timestamp: number) => {
		return new Date(timestamp).toLocaleTimeString([], {
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	if (!isVisible) {
		return (
			<div className="chat-toggle-container">
				<button
					className="chat-toggle-circle"
					onClick={() => setIsVisible(true)}
					title="Open Chat">
					💬
				</button>
			</div>
		);
	}

	return (
		<>
			{/* Chat Overlay Background */}
			<div className="chat-overlay" onClick={() => setIsVisible(false)} />

			{/* Chat Sidebar */}
			<div className="chat-sidebar">
				{/* Chat Header */}
				<div className="chat-header">
					<div className="chat-header-content">
						<div className="chat-mode-indicator">
							{chatMode === "public" ? (
								<>
									<span className="chat-icon">🌍</span>
									<span className="chat-title">Public Chat</span>
								</>
							) : (
								<>
									<span className="chat-icon">📡</span>
									<span className="chat-title">Proximity Chat</span>
									<span className="chat-radius">({proximityRadius}px)</span>
								</>
							)}
						</div>
						<button
							className="chat-close-btn"
							onClick={() => setIsVisible(false)}
							title="Close Chat">
							✕
						</button>
					</div>
				</div>

				{/* Chat Mode Toggle */}
				<div className="chat-mode-toggle">
					<button
						className={`chat-mode-btn ${chatMode === "public" ? "active" : ""}`}
						onClick={() => setChatMode("public")}>
						<span className="mode-icon">🌍</span>
						<span>Public</span>
					</button>
					<button
						className={`chat-mode-btn ${
							chatMode === "proximity" ? "active" : ""
						}`}
						onClick={() => setChatMode("proximity")}>
						<span className="mode-icon">📡</span>
						<span>Nearby</span>
					</button>
				</div>

				{/* Proximity Radius Control */}
				{chatMode === "proximity" && (
					<div className="proximity-controls">
						<div className="proximity-label">
							<span>Range: {proximityRadius}px</span>
						</div>
						<input
							type="range"
							min="50"
							max="300"
							value={proximityRadius}
							onChange={(e) => setProximityRadius(Number(e.target.value))}
							className="proximity-slider"
						/>
						<div className="proximity-markers">
							<span>50px</span>
							<span>300px</span>
						</div>
					</div>
				)}

				{/* Messages Container */}
				<div className="chat-messages-container">
					{messages.length === 0 ? (
						<div className="chat-empty-state">
							<div className="empty-icon">💭</div>
							<p>No messages yet</p>
							<p>Start a conversation!</p>
						</div>
					) : (
						messages.map((msg, index) => (
							<div
								key={index}
								className={`chat-message ${
									msg.senderId === userId ? "own-message" : "other-message"
								} ${
									msg.type === "proximity"
										? "proximity-message"
										: "public-message"
								}`}>
								<div className="message-header">
									<span className="sender-name">{msg.senderName}</span>
									<div className="message-meta">
										{msg.type === "proximity" && (
											<span className="proximity-badge">📡</span>
										)}
										<span className="message-time">
											{formatTime(msg.timestamp)}
										</span>
									</div>
								</div>
								<div className="message-content">{msg.message}</div>
							</div>
						))
					)}
					<div ref={messagesEndRef} />
				</div>

				{/* Chat Input */}
				<div className="chat-input-container">
					<form onSubmit={sendMessage} className="chat-input-form">
						<div className="input-wrapper">
							<input
								type="text"
								value={inputText}
								onChange={(e) => setInputText(e.target.value)}
								placeholder={
									chatMode === "public"
										? "Type a public message..."
										: "Type a proximity message..."
								}
								className="chat-input"
								maxLength={500}
							/>
							<button
								type="submit"
								className="send-button"
								disabled={!inputText.trim()}
								title="Send message">
								<span className="send-icon">➤</span>
							</button>
						</div>
					</form>
				</div>
			</div>
		</>
	);
}
