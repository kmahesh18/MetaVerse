interface BaseMessage {
	type: string;
}

interface ErrorMessage extends BaseMessage {
	type: "error";
	payload: string;
}

interface RoomIdPayload {
	roomId: string;
}

interface SpaceIdPayload {
	spaceId: string;
}

interface ClientIdPayload {
	clientId: string;
}

interface JoinRoomMessage extends BaseMessage {
	type: "joinRoom";
	payload: RoomIdPayload;
}

interface LeaveRoomMessage extends BaseMessage {
	type: "leaveRoom";
	payload: RoomIdPayload;
}

interface JoinSpaceMessage extends BaseMessage {
	type: "joinSpace";
	payload: SpaceIdPayload;
}

interface LeaveSpaceMessage extends BaseMessage {
	type: "leaveSpace";
	payload: SpaceIdPayload;
}

interface RoomResponseMessage extends BaseMessage {
	type: "joinedRoom" | "leftRoom";
	payload: RoomIdPayload;
}

interface SpaceResponseMessage extends BaseMessage {
	type: "joinedSpace" | "leftSpace";
	payload: SpaceIdPayload & { rooms: string[] }; // Include room IDs
}

interface ClientLeftMessage extends BaseMessage {
	type: "clientLeft";
	payload: ClientIdPayload;
}

interface CreateSpaceMessage extends BaseMessage {
	type: "createSpace";
	payload: {
		numRooms?: number;
		companyId: string;
	};
}

interface SpaceCreatedMessage extends BaseMessage {
	type: "spaceCreated";
	payload: SpaceIdPayload & { rooms: string[] };
}

interface CreateWebRtcTransportMessage extends BaseMessage {
	type: "createWebRtcTransport";
	payload: {};
}

interface WebRtcTransportCreatedMessage extends BaseMessage {
	type: "webRtcTransportCreated";
	payload: {
		id: string;
		iceParameters: any;
		iceCandidates: any[];
		dtlsParameters: any;
	};
}

interface ConnectWebRtcTransportMessage extends BaseMessage {
	type: "connectWebRtcTransport";
	payload: {
		transportId: string;
		dtlsParameters: any;
	};
}

interface ProduceDataMessage extends BaseMessage {
	type: "produceData";
	payload: {
		transportId: string;
		sctpStreamParameters: any;
		label: string;
		protocol: string;
	};
}

interface DataProducedMessage extends BaseMessage {
	type: "dataProduced";
	payload: {
		dataProducerId: string;
	};
}

interface ConsumeDataMessage extends BaseMessage {
	type: "consumeData";
	payload: {
		producerId: string;
		transportId: string;
	};
}

interface DataConsumerCreatedMessage extends BaseMessage {
	type: "dataConsumerCreated";
	payload: {
		producerId: string;
		id: string;
		sctpStreamParameters: any;
		label: string;
		protocol: string;
	};
}

interface NewDataProducerMessage extends BaseMessage {
	type: "newDataProducer";
	payload: { producerId: string };
}

interface CreateCompanyMessage extends BaseMessage {
	type: "createCompany";
	payload: { name: string };
}
interface CompanyCreatedMessage extends BaseMessage {
	type: "companyCreated";
	payload: { companyId: string };
}

interface WebRtcTransportConnectedMessage extends BaseMessage {
	type: "webRtcTransportConnected";
	payload: {
		transportId: string;
	};
}

interface AuthenticateMessage extends BaseMessage {
	type: "authenticate";
	payload: { userId: string }; // Or potentially a token to be verified
}

interface AuthenticatedMessage extends BaseMessage {
	type: "authenticated";
	payload: { userId: string };
}

// Union type for all possible messages
type Message =
	| AuthenticateMessage
	| AuthenticatedMessage
	| CreateCompanyMessage
	| CompanyCreatedMessage
	| ErrorMessage
	| CreateSpaceMessage
	| SpaceCreatedMessage
	| JoinSpaceMessage
	| LeaveSpaceMessage
	| JoinRoomMessage
	| LeaveRoomMessage
	| RoomResponseMessage
	| SpaceResponseMessage
	| ClientLeftMessage
	| CreateWebRtcTransportMessage
	| WebRtcTransportCreatedMessage
	| ConnectWebRtcTransportMessage
	| WebRtcTransportConnectedMessage
	| ProduceDataMessage
	| NewDataProducerMessage
	| DataProducedMessage
	| ConsumeDataMessage
	| DataConsumerCreatedMessage;

export type {
	AuthenticateMessage,
	AuthenticatedMessage,
	ErrorMessage,
	JoinRoomMessage,
	LeaveRoomMessage,
	JoinSpaceMessage,
	LeaveSpaceMessage,
	RoomResponseMessage,
	SpaceResponseMessage,
	ClientLeftMessage,
	CreateSpaceMessage,
	SpaceCreatedMessage,
	CreateWebRtcTransportMessage,
	WebRtcTransportCreatedMessage,
	ConnectWebRtcTransportMessage,
	ProduceDataMessage,
	ConsumeDataMessage,
	DataProducedMessage,
	DataConsumerCreatedMessage,
	NewDataProducerMessage,
	CreateCompanyMessage,
	CompanyCreatedMessage,
	WebRtcTransportConnectedMessage,
	BaseMessage,
	RoomIdPayload,
	SpaceIdPayload,
	ClientIdPayload,
	Message,
};
