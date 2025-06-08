import React, { useRef, useEffect, useState } from "react";
import { IoVideocamOutline } from "react-icons/io5";
import { types } from "mediasoup-client";

interface VideoInterfaceProps {
  sendTransport: types.Transport | null;
  recvTransport: types.Transport | null;
  ws: WebSocket | null;
  clientId:  string|null
  onClose?: () => void;
}

const VideoInterface: React.FC<VideoInterfaceProps> = ({
  sendTransport,
  recvTransport,
  ws,
  clientId
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [showVideo, setShowVideo] = useState(false);
  const produceCallbackRef = useRef<any |null>(null);

  useEffect(() => {
    const videoEl = videoRef.current;

    if (showVideo && localStream && videoEl) {
      videoEl.srcObject = localStream;
      videoEl
        .play()
        .catch((err) => console.warn("Play prevented:", err));
    }

    // Cleanup if component unmounts or showVideo flips false
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
      ws.send(JSON.stringify({
        type: "produceMedia",
        payload: {
          transportId: sendTransport.id,
          rtpParameters,
          kind,
        },
      }));
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
      if (msg.type === "producerCreated") {
        console.log("video interface reached",msg)
        if (produceCallbackRef.current) {
          produceCallbackRef.current({ id: msg.payload.producerId });
          produceCallbackRef.current = null;
        }
      }
    };
  }, [ws]);


  async function handleToggle() {
    const videoEl = videoRef.current;
  
    if (showVideo) {
      // 1. Stop all tracks
      localStream?.getTracks().forEach((track) => track.stop());
      console.log("Stopped tracks:", localStream?.getTracks());
      
  
      // 2. Pause & unload the <video>
      if (videoEl) {
        videoEl.pause();
        // clear the stream so the element can't hold onto it
        videoEl.srcObject = null;
        // force the element to unload any internal buffers
        videoEl.load();
      }
      setLocalStream(null);
      setShowVideo(false);
    } else {
      // Acquire new camera stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
      const videotrack = stream?.getTracks()[0];
      const producer = await sendTransport?.produce({ track: videotrack ,appData:{clientId:clientId}});
      console.log(producer);
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
        title="Toggle Video"
      >
        <IoVideocamOutline size={28} />
      </button>
    </>
  );
};

export default VideoInterface;
