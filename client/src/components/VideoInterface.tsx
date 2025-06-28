import React, { useRef, useEffect, useState } from "react";
import { types } from "mediasoup-client";

interface VideoInterfaceProps {
	sendTransport: types.Transport | null;
	recvTransport: types.Transport | null;
	ws: WebSocket | null;
	clientId: string | null;
	onClose?: () => void;
}

const VideoInterface: React.FC<VideoInterfaceProps> = ({
	sendTransport,
	recvTransport: _recvTransport, // Renamed to indicate it's intentionally unused
	ws,
	clientId,
}) => {
	const videoRef = useRef<HTMLVideoElement>(null);
	const [localStream, setLocalStream] = useState<MediaStream | null>(null);
	const [showVideo, setShowVideo] = useState(false);
	const produceCallbackRef = useRef<any | null>(null);
	const producerRef = useRef<types.Producer | null>(null);

	useEffect(() => {
		const videoEl = videoRef.current;

		if (showVideo && localStream && videoEl) {
			videoEl.srcObject = localStream;
			videoEl.play().catch((err) => console.warn("Play prevented:", err));
		}

		return () => {
			if (videoEl) {
				videoEl.srcObject = null;
			}
		};
	}, [showVideo, localStream]);

	useEffect(() => {
		if (!sendTransport || !ws) return;

		const handleProduce = ({ rtpParameters, kind }: { rtpParameters: types.RtpParameters, kind: string }, callback: (data: { id: string }) => void) => {
			console.log("reached handle produce");
			produceCallbackRef.current = callback;
			ws.send(
				JSON.stringify({
					type: "produceMedia",
					payload: {
						transportId: sendTransport.id,
						rtpParameters,
						kind,
					},
				})
			);
		};

		sendTransport.on("produce", handleProduce);

		return () => {
			sendTransport.off("produce", handleProduce);
		};
	}, [sendTransport, ws]);

	useEffect(() => {
		if (!ws) return;

		ws.onmessage = (e) => {
			const msg = JSON.parse(e.data);
			console.log(msg);
			if (msg.type === "mediaProducerCreated") {
				console.log("video interface reached", msg);
				if (produceCallbackRef.current) {
					produceCallbackRef.current({ id: msg.payload.producerId });
					produceCallbackRef.current = null;
				}
			} else if (msg.type === "mediaProducerExists") {
				console.log("video interface reached", msg);
				if (produceCallbackRef.current) {
					produceCallbackRef.current({ id: msg.payload.producerId });

					produceCallbackRef.current = null;
				}
			}
			else if(msg.type==="newMediaProducer"){
			  
			}
		};
	}, [ws]);

	useEffect(() => {
		return () => {
			if (producerRef.current && !producerRef.current.closed) {
				producerRef.current.close();
			}
			localStream?.getTracks().forEach((track) => track.stop());
		};
	}, []);

	async function handleToggle() {
		const videoEl = videoRef.current;

		if (showVideo) {
			if (producerRef.current && !producerRef.current.closed) {
				await producerRef.current.replaceTrack({ track: null });
			}

			localStream?.getTracks().forEach((track) => track.stop());

			if (videoEl) {
				videoEl.pause();
				videoEl.srcObject = null;
				videoEl.load();
			}

			setLocalStream(null);
			setShowVideo(false);
		} else {
			try {
				const stream = await navigator.mediaDevices.getUserMedia({
					video: true,
					audio: false,
				});
				const videoTrack = stream.getTracks()[0];

				if (producerRef.current && !producerRef.current.closed) {
					await producerRef.current.replaceTrack({ track: videoTrack });
				} else if (sendTransport) {
					producerRef.current = await sendTransport?.produce({
						track: videoTrack,
						appData: { clientId: clientId },
					});
				}

				setLocalStream(stream);
				setShowVideo(true);
			} catch (error) {
				console.error("Failed to get video stream:", error);
			}
		}
	}

	// Expose toggle function to parent component
	useEffect(() => {
		(window as any).toggleVideo = handleToggle;
		return () => {
			delete (window as any).toggleVideo;
		};
	}, []);

	return (
		<>
			{showVideo && (
				<div
					style={{
						position: "fixed",
						bottom: window.innerWidth <= 768 ? "1rem" : "1.5rem",
						right: window.innerWidth <= 768 ? "1rem" : "1.5rem",
						width: window.innerWidth <= 480 ? "140px" : window.innerWidth <= 768 ? "180px" : "240px",
						height: window.innerWidth <= 480 ? "105px" : window.innerWidth <= 768 ? "135px" : "180px",
						background: "var(--bg-surface)",
						border: "2px solid var(--border-accent)",
						borderRadius: "var(--border-radius-lg)",
						overflow: "hidden",
						zIndex: 1000,
						boxShadow: "var(--shadow-lg), var(--shadow-neon)",
						backdropFilter: "blur(10px)",
						transition: "all var(--transition-normal)"
					}}
					onMouseEnter={(e) => {
						e.currentTarget.style.transform = "scale(1.05)";
						e.currentTarget.style.boxShadow = "var(--shadow-xl), var(--shadow-neon-strong)";
					}}
					onMouseLeave={(e) => {
						e.currentTarget.style.transform = "scale(1)";
						e.currentTarget.style.boxShadow = "var(--shadow-lg), var(--shadow-neon)";
					}}
				>
					<video
						ref={videoRef}
						autoPlay
						muted
						playsInline
						style={{
							width: "100%",
							height: "100%",
							objectFit: "cover",
							background: "var(--bg-primary)"
						}}
					/>
					
					{/* Video control overlay */}
					<div style={{
						position: "absolute",
						bottom: "8px",
						right: "8px",
						background: "rgba(0, 0, 0, 0.7)",
						borderRadius: "50%",
						width: "32px",
						height: "32px",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						cursor: "pointer",
						transition: "all var(--transition-fast)",
						border: "1px solid var(--border-accent)"
					}}
					onClick={handleToggle}
					onMouseEnter={(e) => {
						e.currentTarget.style.background = "var(--error)";
						e.currentTarget.style.transform = "scale(1.1)";
					}}
					onMouseLeave={(e) => {
						e.currentTarget.style.background = "rgba(0, 0, 0, 0.7)";
						e.currentTarget.style.transform = "scale(1)";
					}}
					>
						<span style={{ 
							color: "white", 
							fontSize: "14px",
							fontWeight: "bold"
						}}>×</span>
					</div>
				</div>
			)}
		</>
	);
};

export default VideoInterface;
