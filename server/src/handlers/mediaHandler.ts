import { Client } from "../classes/Client";
import { mediasoupRouter,mediasoupWorker } from "../mediasoup/setup";
import { roomsById, playerPositions } from "../state/state"; 

export async function createWebRtcTransport(client:Client,message:any){
  if (!client.userId || !client.roomId) {
					return client.sendToSelf({
						type: "error",
						payload: "Must be authenticated and in a room first",
					});
				}

				const msRoom = roomsById.get(client.roomId);
				if (!msRoom) {
					return client.sendToSelf({
						type: "error",
						payload: "Room not found",
					});
				}

				const transport = await mediasoupRouter.createWebRtcTransport({
					listenIps: [{ ip: "0.0.0.0", announcedIp: "" }],
					enableTcp: true,
					enableUdp: true,
					preferUdp: true,
					enableSctp: true, // Add SCTP support for DataChannels
					numSctpStreams: {
						// Configure SCTP streams
						OS: 1024,
						MIS: 1024,
					},
				});

				msRoom.mediasoupTransports.set(client.userId, transport);
				client.sendToSelf({
					type: "webRtcTransportCreated",
					payload: {
						id: transport.id,
						iceCandidates: transport.iceCandidates,
						iceParameters: transport.iceParameters,
						dtlsParameters: transport.dtlsParameters,
					},
				});
}

export async function connectWebRtcTransport(client:Client,message:any){
  if (!client.userId || !client.roomId) {
					return client.sendToSelf({
						type: "error",
						payload: "Must be authenticated and in a room first",
					});
				}

				const { transportId, dtlsParameters } = message.payload;
				const msRoom = roomsById.get(client.roomId);
				const transport = msRoom?.mediasoupTransports.get(transportId);

				if (transport) {
					await transport.connect({ dtlsParameters });
					client.sendToSelf({
						type: "webRtcTransportConnected",
						payload: { transportId },
					});
				} else {
					client.sendToSelf({
						type: "error",
						payload: "Transport not found",
					});
				}
}

//sends data to the server=> think of it like every player has a storage or box where they store their movements and other clients subscribed to this storage have
//access to it so they can pull the information whenever they want .
export async function proudceData(client:Client,message:any){
  
  //basic authentication shitt
  if (!client.userId || !client.roomId) {
			return client.sendToSelf({
				type: "error",
				payload: "Must be authenticated and in a room first",
			});
		}

		
		const { transportId, sctpStreamParameters, label, protocol } =
			message.payload;

		const msRoom = roomsById.get(client.roomId);
		const transport = msRoom?.mediasoupTransports.get(transportId);

		if (!transport) {
			return client.sendToSelf({
				type: "error",
				payload: "Transport not found",
			});
		}

		const dataProducer = await transport.produceData({
			sctpStreamParameters,
			label,
			protocol,
		});

		msRoom!.dataProducers.set(dataProducer.id, dataProducer);
		client.sendToSelf({
			type: "dataProduced",
			payload: {
				dataProducerId: dataProducer.id,
			},
		});
		
		msRoom?.clients.forEach((client)=>{
		const message = {producerId:dataProducer.id,transportId:transportId}
	  consumeData(client,mess)
			
		})
		console.log("All others clients called consume on the new producer")
		
}

export async function consumeData(client:Client,message:any){
 	if (!client.userId || !client.roomId) {
					return client.sendToSelf({
						type: "error",
						payload: "Must be authenticated and in a room first",
					});
				}

				const { producerId, transportId } = message.payload;

				const msRoom = roomsById.get(client.roomId);
				if (!msRoom) {
					return client.sendToSelf({
						type: "error",
						payload: "Room not found",
					});
				}

				const transport = msRoom.mediasoupTransports.get(transportId);
				const producer = msRoom.dataProducers.get(producerId);

				if (!transport || !producer) {
					return client.sendToSelf({
						type: "error",
						payload: "Transport or producer not found",
					});
				}

				const consumer = await transport.consumeData({
					dataProducerId: producerId,
				});

				if (!msRoom.dataConsumers.get(client.id)) {
					msRoom.dataConsumers.set(client.id, []);
				}

				msRoom.dataConsumers.get(client.id)!.push(consumer);
				client.sendToSelf({
					type: "dataConsumerCreated",
					payload: {
						producerId,
						id: consumer.id,
						sctpStreamParameters: consumer.sctpStreamParameters,
						label: consumer.label,
						protocol: consumer.protocol,
					},
				});
}

