import * as mediasoup from "mediasoup";
export let mediasoupWorker: mediasoup.types.Worker;
export let mediasoupRouter: mediasoup.types.Router;

//function to setup mediasoup
export async function createMediasoupWorker() {
	mediasoupWorker = await mediasoup.createWorker();
	mediasoupRouter = await mediasoupWorker.createRouter({
		mediaCodecs: [],
	});
	console.log("mediasoupWorker and router started");
}
