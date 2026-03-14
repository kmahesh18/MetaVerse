export const InvitationStatus = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
  EXPIRED: 'expired',
} as const;

export type InvitationStatusType = (typeof InvitationStatus)[keyof typeof InvitationStatus];

export interface IInvitation {
  _id: string;
  spaceId: string;
  inviterId: string;
  inviteeEmail: string;
  inviteeId?: string;
  role: string;
  status: InvitationStatusType;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface InvitationNotificationPayload {
  invitationId: string;
  token: string;
  spaceId: string;
  spaceName: string;
  spaceSlug: string;
  inviterId: string;
  inviterName: string;
  role: string;
  createdAt: string;
}
