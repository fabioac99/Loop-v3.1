import { WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
@WebSocketGateway({ cors: { origin: '*' }, namespace: '/' })
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private userSockets = new Map<string, string[]>();

  handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;
    if (userId) {
      const sockets = this.userSockets.get(userId) || [];
      sockets.push(client.id);
      this.userSockets.set(userId, sockets);
      client.join(`user:${userId}`);
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.handshake.query.userId as string;
    if (userId) {
      const sockets = (this.userSockets.get(userId) || []).filter(s => s !== client.id);
      if (sockets.length) this.userSockets.set(userId, sockets);
      else this.userSockets.delete(userId);
    }
  }

  @SubscribeMessage('joinTicket')
  handleJoinTicket(client: Socket, ticketId: string) { client.join(`ticket:${ticketId}`); }

  @SubscribeMessage('leaveTicket')
  handleLeaveTicket(client: Socket, ticketId: string) { client.leave(`ticket:${ticketId}`); }

  emitToUser(userId: string, event: string, data: any) { this.server.to(`user:${userId}`).emit(event, data); }
  emitToTicket(ticketId: string, event: string, data: any) { this.server.to(`ticket:${ticketId}`).emit(event, data); }
  emitToAll(event: string, data: any) { this.server.emit(event, data); }
}
