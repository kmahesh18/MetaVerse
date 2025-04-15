import { useEffect } from "react";

export function Receiver() {
	const socket = new WebSocket("ws://localhost:8080");
	useEffect(() => {
		socket.onopen = () => {
			socket.send(JSON.stringify({ type: "receiver" }));
		}; 
		socket.onmessage = async  (e)=>{
			const message = JSON.parse(e.data)
			if(message.type=='createOffer'){
				const pc = new RTCPeerConnection();
				await pc.setRemoteDescription(message.offer)
				const answer = await pc.createAnswer()//sdp
				await   pc.setLocalDescription(answer)
				socket?.send(JSON.stringify({type:"createAnswer",answer:pc.localDescription }))
			}
		}

	}, []);

	return (
		<>
			<h1>reciever here</h1>
		</>
	);
}
