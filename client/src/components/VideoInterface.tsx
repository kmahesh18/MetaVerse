import React, { useRef, useEffect, useState } from "react";
import { IoVideocamOutline, IoVideocamOffOutline } from "react-icons/io5";
import { types } from "mediasoup-client";
import "./VideoInterface.css";

interface VideoInterfaceProps {
	sendTransport: types.Transport | null;
	recvTransport: types.Transport | null;
	device: types.Device;
	ws: WebSocket | null;
	clientId: string | null;
	onClose?: () => void;
}

const VideoInterface: React.FC<VideoInterfaceProps> = ({
	sendTransport,
	device,
	recvTransport,
	ws,
	clientId,
}) => {
	const videoRef = useRef<HTMLVideoElement>(null);
	const [localStream, setLocalStream] = useState<MediaStream | null>(null);
	const [showVideo, setShowVideo] = useState(false);
	const produceCallbackRef = useRef<any | null>(null);
	const producerRef = useRef<types.Producer | null>(null);
	const [consumerStreams, setConsumerStreams] = useState<MediaStream[]>([]);
	const streamMap = new Map();

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

		const handleProduce = (
			{ rtpParameters, kind }: { rtpParameters: any; kind: string },
			callback: (data: any) => void
		) => {
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
		(async () => {
			ws.onmessage = async (e) => {
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
				} else if (msg.type === "newMediaProducer") {
					console.log(msg);
					const { userId, avatarName, producerId } = msg.payload;
					console.log(userId, producerId, avatarName);
					const newmsg = {
						type: "consumeMedia",
						payload: {
							producerId: producerId,
							userId: userId,
							avatarName: avatarName,
							transportId: recvTransport?.id,
							rtpCapabilities: device.rtpCapabilities,
						},
					};
					ws.send(JSON.stringify(newmsg));
				} else if (msg.type === "mediaConsumerCreated") {
					console.log(msg);
					await addMediaConsumer(msg);
				} else {
					console.log("new not configured mssg", msg);
				}
			};
		})();
	}, [ws]);

	async function addMediaConsumer(msg: any) {
		console.log("addMediaConsumer reached");
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const {
			id,
			producerId,
			rtpParameters,
			appData,
			kind,
			userId /*,avatarName*/,
		} = msg.payload;
		const consumer = await recvTransport!.consume({
			id: id,
			producerId: producerId,
			rtpParameters: rtpParameters,
			appData: appData,
			kind: kind,
		});
		consumer.resume();
		const stream = new MediaStream([consumer.track]);
		console.log(stream);
		setConsumerStreams((old) => [...old, stream]);
		streamMap.set(userId, stream.id);
	}

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
		console.log("handletoggle", showVideo);
		if (showVideo) {
			// === Pause sending ===
			if (producerRef.current && !producerRef.current.closed) {
				producerRef.current.pause();
			}
			if (videoEl) {
				videoEl.pause();
			}

			setShowVideo(false);
		} else {
			// === Resume / start sending ===
			let stream = localStream;
			
			if (!stream || stream.getTracks().length === 0) {
				// grab camera if we don't have a stream
				stream = await navigator.mediaDevices.getUserMedia({
					video: true,
					audio: false,
				});
				setLocalStream(stream);
			}
			
			const videoTrack = stream.getVideoTracks()[0];

			if (producerRef.current && !producerRef.current.closed) {
				producerRef.current.resume();
			} else if (sendTransport) {
				// create producer on sendTransport
				producerRef.current = await sendTransport.produce({
					track: videoTrack,
					appData: { clientId },
				});
			}

			// restart local preview
			if (videoEl && stream) {
				videoEl.srcObject = stream;
				await videoEl.play().catch((err) => console.warn("Play error:", err));
			}

			setShowVideo(true);
		}
	}	// async function handleToggle() {
	// 	const videoEl = videoRef.current;

	// 	if (showVideo) {
	// 		if (producerRef.current && !producerRef.current.closed) {
	// 			await producerRef.current.replaceTrack({ track: null });
	// 		}

	// 		localStream?.getTracks().forEach((track) => track.stop());

	// 		if (videoEl) {
	// 			videoEl.pause();
	// 			videoEl.srcObject = null;
	// 			videoEl.load();
	// 		}

	// 		setLocalStream(null);
	// 		setShowVideo(false);
	// 	} else {
	// 		const stream = await navigator.mediaDevices.getUserMedia({
	// 			video: true,
	// 			audio: false,
	// 		});
	// 		const videoTrack = stream.getTracks()[0];

	// 		if (producerRef.current && !producerRef.current.closed) {
	// 			await producerRef.current.replaceTrack({ track: videoTrack });
	// 		} else {
	// 			producerRef.current = await sendTransport?.produce({
	// 				track: videoTrack,
	// 				appData: { clientId: clientId },
	// 			});
	// 		}

	// 		setLocalStream(stream);
	// 		setShowVideo(true);
	// 	}
	// }

	return (
		<>
			{/* ============ Local Video ============ */}
			<div className="video-simple-container">
				{showVideo && (
					<video
						ref={videoRef}
						autoPlay
						muted
						playsInline
						className="video-simple"
					/>
				)}
			</div>

			<button
				className={`interface-toggle-btn ${!showVideo ? 'video-off' : ''}`}
				style={{ left: 92, top: 24 }}
				onClick={handleToggle}
				title={showVideo ? "Turn Video Off" : "Turn Video On"}>
				{showVideo ? <IoVideocamOutline size={28} /> : <IoVideocamOffOutline size={28} />}
			</button>

			{/* ============ Remote Video Grid ============ */}
			<div className="remote-videos-grid">
				{consumerStreams.map((stream, idx) => (
					<div key={idx} className="video-tile">
						<video
							autoPlay
							playsInline
							ref={(el) => {
								if (el && el.srcObject !== stream) {
									el.srcObject = stream;
									el.play().catch(() => {});
								}
							}}
							className="video-element"
						/>
					</div>
				))}
			</div>
		</>
	);
};

export default VideoInterface;
