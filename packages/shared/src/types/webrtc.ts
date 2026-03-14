export interface ICEServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export interface ICEConfig {
  iceServers: ICEServer[];
}
