import { Client } from "../classes/Client";
import { AuthenticateMessage } from "../types/message.types";
import { getUserByClerkId } from "../services/userService";




export async function handleAuthentication(client: Client) {
  // This case should only run if client is NOT already authenticated
  if (client.isAuthenticated) {
    return; // Or send an error
  }
  const userId = client.userId;
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
    client.userId = user.clerkId; // Store the validated user ID
    client.isAuthenticated = true;    
    if (!client.userId) {
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
 