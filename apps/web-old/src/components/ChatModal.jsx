
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import ChatWindow from '@/components/ChatWindow.jsx';

const ChatModal = ({ isOpen, onClose, recipientId, listingId = null }) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] h-[90vh] sm:h-[700px] p-0 flex flex-col overflow-hidden gap-0 border-border bg-background shadow-xl">
        <DialogHeader className="p-4 border-b border-border/50 shrink-0 bg-card hidden">
          <DialogTitle>Chat</DialogTitle>
          <DialogDescription>Nachrichtenverlauf mit dem Verkäufer</DialogDescription>
        </DialogHeader>
        
        {recipientId ? (
          <div className="flex-1 overflow-hidden">
            <ChatWindow recipientId={recipientId} listingId={listingId} />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Verkäufer-Informationen nicht verfügbar.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ChatModal;
