-- Add DRAFT to TicketStatus enum
ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'DRAFT' BEFORE 'OPEN';
