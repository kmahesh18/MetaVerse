import * as mediasoup from "mediasoup";

let mediasoupWorker: mediasoup.types.Worker;
let mediasoupRouter: mediasoup.types.Router;

//function to setup mediasoup
async function createMediasoupWorker() {
    mediasoupWorker = await mediasoup.createWorker();
    mediasoupRouter = await mediasoupWorker.createRouter({
        mediaCodecs: [],
    });
    console.log("mediasoupWorker and router started");
    return {
        mediasoupWorker,
        mediasoupRouter}
}

export default createMediasoupWorker();