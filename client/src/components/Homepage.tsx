import { useEffect, useState, useRef } from "react";

export function Homepage() {
    const [spaceId, setSpaceId] = useState<string | null>(null);
    const socketRef = useRef<WebSocket |null>(null);

    useEffect(() => {
        const ws = new WebSocket("ws://localhost:8080");
        socketRef.current = ws;

        ws.onopen = () => {
            console.log("WebSocket connected");
        };

        ws.onmessage = ({ data }) => {
            const msg = JSON.parse(data);
            if (msg.type === "spaceCreated") {
                setSpaceId(msg.payload.spaceId);
            }
        };

        return () => {
            ws.close();
        };
    }, []);

    function createSpace() {
        const ws = socketRef.current;
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: "createSpace",
                payload: { numRooms: 3 }
            }));
        } else {
            console.warn("WebSocket not open yet");
        }
    }

    return (
        <div>
            <button onClick={createSpace}>Create Space</button>
            {spaceId && <p>Created space: {spaceId}</p>}
        </div>
    );
}