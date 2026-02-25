'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/auth';
import { useNotificationStore } from '@/stores/notifications';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:4000` : 'http://localhost:4000');

type EventHandler = (data: any) => void;

let globalSocket: Socket | null = null;
const listeners = new Map<string, Set<EventHandler>>();

export function useSocket() {
    const { user, isAuthenticated } = useAuthStore();
    const { fetchNotifications, fetchUnreadTicketIds } = useNotificationStore();

    useEffect(() => {
        if (!isAuthenticated || !user) {
            if (globalSocket) { globalSocket.disconnect(); globalSocket = null; }
            return;
        }

        if (globalSocket?.connected) return;

        globalSocket = io(WS_URL, {
            query: { userId: user.id, departmentId: user.departmentId || '' },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 2000,
        });

        globalSocket.on('connect', () => {
            console.log('🔌 WebSocket connected');
        });

        globalSocket.on('disconnect', () => {
            console.log('🔌 WebSocket disconnected');
        });

        // Real-time notification — refresh notification store
        globalSocket.on('notification:new', () => {
            fetchNotifications();
            fetchUnreadTicketIds();
        });

        // Forward all events to registered listeners
        const forwardEvent = (event: string) => {
            globalSocket!.on(event, (data: any) => {
                const handlers = listeners.get(event);
                if (handlers) handlers.forEach(h => h(data));
            });
        };

        // Register forwarding for key events
        [
            'ticket:created', 'ticket:updated', 'ticket:statusChanged',
            'ticket:assigned', 'ticket:newMessage', 'ticket:new',
            'tickets:refresh', 'userTyping',
        ].forEach(forwardEvent);

        return () => {
            // Don't disconnect on unmount — keep global socket alive
        };
    }, [isAuthenticated, user?.id]);

    const joinTicket = useCallback((ticketId: string) => {
        globalSocket?.emit('joinTicket', ticketId);
    }, []);

    const leaveTicket = useCallback((ticketId: string) => {
        globalSocket?.emit('leaveTicket', ticketId);
    }, []);

    const emitTyping = useCallback((ticketId: string, userName: string) => {
        globalSocket?.emit('typing', { ticketId, userName });
    }, []);

    return { joinTicket, leaveTicket, emitTyping, socket: globalSocket };
}

// Subscribe to a specific event from any component
export function useSocketEvent(event: string, handler: EventHandler) {
    const handlerRef = useRef(handler);
    handlerRef.current = handler;

    useEffect(() => {
        const wrappedHandler: EventHandler = (data) => handlerRef.current(data);
        if (!listeners.has(event)) listeners.set(event, new Set());
        listeners.get(event)!.add(wrappedHandler);

        return () => {
            listeners.get(event)?.delete(wrappedHandler);
        };
    }, [event]);
}