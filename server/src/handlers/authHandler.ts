import { Client } from "../classes/Client";
import { AuthenticateMessage } from "../types/message.types";
import { getUserByClerkId } from "../services/userService";




export async function handleAuthentication(client: Client, message: any) {
  // This case should only run if client is NOT already authenticated
  if (client.isAuthenticated) {
    console.warn(`Client ${client.userId} sent authenticate message again.`);
    return; // Or send an error
  }

  const { userId } = (message as AuthenticateMessage).payload;
  if (!userId || typeof userId !== "string") {
    client.sendToSelf({
      type: "error",
      payload: "Invalid authentication payload",
    });
    return;
  }

  // Validate the user ID against the database
  const user = await getUserByClerkId(userId);
  if (user) {
    client.userId = user.id; // Store the validated user ID
    client.isAuthenticated = true;
    console.log(
      `Connection ${client.id} authenticated as user ${client.userId}`,
    );

    if (client.userId) {
      client.sendToSelf({
        type: "authenticated",
        payload: { userId: client.userId },
      });
    } else {
      client.sendToSelf({
        type: "error",
        payload: "Authentication failed: User ID is null",
      });
    }
  } else {
    console.warn(
      `Authentication failed for connection ${client.id}: User ${userId} not found.`,
    );
    client.sendToSelf({
      type: "error",
      payload: "Authentication failed: User not found",
    });
  }
}
