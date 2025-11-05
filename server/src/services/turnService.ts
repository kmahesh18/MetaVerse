// turnService.ts
import twilio from 'twilio';

/**
 * Generate time-limited TURN credentials using Twilio
 * These credentials expire after 1 hour for security
 */
export async function getTurnCredentials() {
	const accountSid = process.env.TWILIO_ACCOUNT_SID;
	const authToken = process.env.TWILIO_AUTH_TOKEN;

	// Fallback to API Key if Account SID not provided
	const apiKeySid = process.env.TURN_USERNAME;
	const apiKeySecret = process.env.TURN_CREDENTIAL;

	if (!accountSid && !apiKeySid) {
		console.warn('⚠️ TURN credentials not configured, using STUN only');
		return {
			iceServers: [
				{
					urls: ['stun:stun.l.google.com:19302'],
				},
			],
		};
	}

	try {
		// Use Account SID if available, otherwise API Key
		const client = accountSid 
			? twilio(accountSid, authToken!)
			: twilio(apiKeySid!, apiKeySecret!);

		// Generate time-limited TURN credentials (valid for 1 hour)
		const token = await client.tokens.create({ ttl: 3600 });

		console.log(`🔑 Generated fresh TURN credentials (expires in 1 hour)`);
		console.log(`   ICE Servers:`, token.iceServers.map(s => s.urls || s.url));

		return {
			iceServers: token.iceServers,
		};
	} catch (error: any) {
		console.error('❌ Failed to generate TURN credentials:', error.message);
		// Fallback to STUN only
		return {
			iceServers: [
				{
					urls: ['stun:stun.l.google.com:19302'],
				},
			],
		};
	}
}
