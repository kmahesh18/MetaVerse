import { useEffect, useState } from "react";

export function Sender() {
	const [socket, setsocket] = useState<WebSocket | null>(null);

	useEffect(() => {
		const socket = new WebSocket("ws://localhost:8080");
		socket.onopen = () => {
			socket.send(JSON.stringify({ type: 'sender' }));
		};
		setsocket(socket);
	}, []);

	async function startVideo() {
		console.log("start video clicked");
		//create an instance of rtcpeerconnection obj => to get access to sdp,streaming data easily
		if (!socket) return;
		const pc = new RTCPeerConnection();
		const offer = await pc.createOffer(); //sdp;
		await pc.setLocalDescription(offer);
		socket?.send(
			JSON.stringify({ type: "createOffer", offer: pc.localDescription })
		);

		socket.onmessage = async (e) => {
			const message = JSON.parse(e.data);
			if (message.type === 'createAnswer') {
				pc.setRemoteDescription(message.sdp);
			}
		};
	}

	return (
		<div>
			<button onClick={startVideo}>send video</button>
		</div>
	);
}
