import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  OnGatewayConnection, OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/' })
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(EventsGateway.name);
  private userSockets = new Map<string, string[]>();

  handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;
    const departmentId = client.handshake.query.departmentId as string;
    if (userId) {
      const sockets = this.userSockets.get(userId) || [];
      sockets.push(client.id);
      this.userSockets.set(userId, sockets);
      client.join(`user:${userId}`);
      if (departmentId) client.join(`dept:${departmentId}`);
      this.logger.log(`🔌 User ${userId} connected (${this.userSockets.size} online)`);
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

  @SubscribeMessage('typing')
  handleTyping(client: Socket, data: { ticketId: string; userName: string }) {
    client.to(`ticket:${data.ticketId}`).emit('userTyping', data);
  }

  emitToUser(userId: string, event: string, data: any) { this.server.to(`user:${userId}`).emit(event, data); }
  emitToTicket(ticketId: string, event: string, data: any) { this.server.to(`ticket:${ticketId}`).emit(event, data); }
  emitToDepartment(deptId: string, event: string, data: any) { this.server.to(`dept:${deptId}`).emit(event, data); }
  emitToAll(event: string, data: any) { this.server.emit(event, data); }

  ticketCreated(ticket: any) {
    this.emitToAll('ticket:created', { ticketId: ticket.id, ticketNumber: ticket.ticketNumber, title: ticket.title });
    if (ticket.toDepartmentId) this.emitToDepartment(ticket.toDepartmentId, 'ticket:new', { ticketId: ticket.id, title: ticket.title });
  }

  ticketUpdated(ticketId: string, changes?: any) {
    this.emitToTicket(ticketId, 'ticket:updated', { ticketId, changes });
    this.emitToAll('tickets:refresh', { ticketId });
  }

  ticketStatusChanged(ticketId: string, oldStatus: string, newStatus: string) {
    this.emitToTicket(ticketId, 'ticket:statusChanged', { ticketId, oldStatus, newStatus });
    this.emitToAll('tickets:refresh', { ticketId });
  }

  ticketAssigned(ticket: any, assignedToId: string) {
    this.emitToUser(assignedToId, 'ticket:assigned', { ticketId: ticket.id, ticketNumber: ticket.ticketNumber, title: ticket.title });
    this.emitToAll('tickets:refresh', { ticketId: ticket.id });
  }

  newMessage(ticketId: string, message: any) {
    this.emitToTicket(ticketId, 'ticket:newMessage', { ticketId, messageId: message.id, content: message.content?.slice(0, 100) });
    this.emitToAll('tickets:refresh', { ticketId });
  }

  newNotification(userId: string, notification: any) {
    this.emitToUser(userId, 'notification:new', notification);
  }
}