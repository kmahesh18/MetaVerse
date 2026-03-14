import type { ICEConfig } from '@metaverse/shared';
import { env } from '../config/env.js';

export function getICEServers(): ICEConfig {
  const iceServers: ICEConfig['iceServers'] = [
    { urls: env.STUN_URL },
  ];

  if (env.TURN_URL && env.TURN_USERNAME && env.TURN_PASSWORD) {
    iceServers.push({
      urls: env.TURN_URL,
      username: env.TURN_USERNAME,
      credential: env.TURN_PASSWORD,
    });
  }

  return { iceServers };
}
