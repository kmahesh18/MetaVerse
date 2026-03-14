export const MessageType = {
  ROOM: 'room',
  DIRECT: 'direct',
  BROADCAST: 'broadcast',
  PROXIMITY: 'proximity',
} as const;

export type MessageTypeValue = (typeof MessageType)[keyof typeof MessageType];

export const AttachmentType = {
  IMAGE: 'image',
  FILE: 'file',
  LINK: 'link',
} as const;

export interface MessageAttachment {
  type: (typeof AttachmentType)[keyof typeof AttachmentType];
  url: string;
  name?: string;
}

export interface IMessage {
  _id: string;
  type: MessageTypeValue;
  senderId: string;
  roomId?: string;
  spaceId?: string;
  recipientId?: string;
  content: string;
  attachments: MessageAttachment[];
  readBy: string[];
  createdAt: Date;
}
