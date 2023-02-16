import { v4 as uuidv4 } from "uuid";

export class CimEvent {
  id: string;
  name: string;
  conversationId: string;
  type: string;
  timestamp: any;
  data: any;
  eventEmitter: {};
  channelSession: {};

  constructor(name: string, type: string, conversationId: string, data: any) {
    this.id = uuidv4();
    this.name = name;
    this.type = type;
    this.conversationId = conversationId;
    this.timestamp = Date.now();
    this.data = data;
    if (data.header) {
      if (data.header.channelSession) {
        this.channelSession = data.header.channelSession;
        delete data.header.channelSession;
      }
      if (data.header.sender) {
        this.eventEmitter = data.header.sender;
      }
    }
  }
}
