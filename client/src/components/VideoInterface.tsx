import React, { useRef, useEffect, useState } from "react";
import { IoVideocamOutline } from "react-icons/io5";
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
	recvTransport,
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

		const handleProduce = ({ rtpParameters, kind }, callback) => {
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
			const stream = await navigator.mediaDevices.getUserMedia({
				video: true,
				audio: false,
			});
			const videoTrack = stream.getTracks()[0];

			if (producerRef.current && !producerRef.current.closed) {
				await producerRef.current.replaceTrack({ track: videoTrack });
			} else {
				producerRef.current = await sendTransport?.produce({
					track: videoTrack,
					appData: { clientId: clientId },
				});
			}

			setLocalStream(stream);
			setShowVideo(true);
		}
	}

	return (
		<>
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
				className="interface-toggle-btn"
				style={{ left: 92, top: 24 }}
				onClick={handleToggle}
				title="Toggle Video">
				<IoVideocamOutline size={28} />
			</button>
		</>
	);
};

export default VideoInterface;
