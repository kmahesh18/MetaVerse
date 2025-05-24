import * as mediasoup from "mediasoup";
export let mediasoupWorker: mediasoup.types.Worker;
export let mediasoupRouter: mediasoup.types.Router;

//function to setup mediasoup
export async function createMediasoupWorker() {
	mediasoupWorker = await mediasoup.createWorker();
	mediasoupRouter = await mediasoupWorker.createRouter({
  mediaCodecs: [
    // Audio: OPUS
    {
      kind      : "audio",
      mimeType  : "audio/opus",
      clockRate : 48000,
      channels  : 2
    },
    // Video: VP8
    {
      kind      : "video",
      mimeType  : "video/VP8",
      clockRate : 90000,
      parameters: {}
    },
    // (Optional) Video: H264
    {
      kind      : "video",
      mimeType  : "video/H264",
      clockRate : 90000,
      parameters: {
        "packetization-mode": 1,
        "profile-level-id"  : "42e01f"
      }
    }
  ]

	});
	console.log("mediasoupWorker and router started");
}
