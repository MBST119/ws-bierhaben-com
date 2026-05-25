import React, { useState, useEffect, useRef } from 'react';
import pb from '@/lib/pocketbaseClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, Loader2, Image, X } from 'lucide-react';
import { toast } from 'sonner';

const ChatWindow = ({ recipientId, listingId = null }) => {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [recipient, setRecipient] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const fetchRecipient = async () => {
      try {
        const user = await pb.collection('users').getOne(recipientId, { $autoCancel: false });
        setRecipient(user);
      } catch (error) {
        console.error('Error fetching recipient:', error);
      }
    };

    if (recipientId) {
      fetchRecipient();
    }
  }, [recipientId]);

  const fetchMessages = async () => {
    try {
      const filter = `(senderId="${currentUser.id}" && recipientId="${recipientId}") || (senderId="${recipientId}" && recipientId="${currentUser.id}")`;
      const records = await pb.collection('messages').getList(1, 50, {
        filter,
        sort: 'created', // Chronological order oldest -> newest for top-to-bottom display
        expand: 'senderId,recipientId',
        $autoCancel: false
      });
      setMessages(records.items);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Fehler beim Laden der Nachrichten');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser && recipientId) {
      setLoading(true);
      fetchMessages();
      const interval = setInterval(fetchMessages, 5000);
      return () => clearInterval(interval);
    }
  }, [currentUser, recipientId]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Bitte wähle eine Bilddatei aus.');
        return;
      }
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedImage) || sending) return;

    setSending(true);
    try {
      if (selectedImage) {
        const formData = new FormData();
        formData.append('senderId', currentUser.id);
        formData.append('recipientId', recipientId);
        formData.append('messageText', newMessage.trim());
        formData.append('image', selectedImage);
        if (listingId) {
          formData.append('listingId', listingId);
        }
        await pb.collection('messages').create(formData, { $autoCancel: false });
      } else {
        const messageData = {
          senderId: currentUser.id,
          recipientId: recipientId,
          messageText: newMessage.trim()
        };
        if (listingId) {
          messageData.listingId = listingId;
        }
        await pb.collection('messages').create(messageData, { $autoCancel: false });
      }
      
      setNewMessage('');
      handleRemoveImage();
      await fetchMessages(); // Refresh message list after sending
      toast.success('Nachricht gesendet');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Fehler beim Senden der Nachricht');
    } finally {
      setSending(false);
    }
  };

  const getAvatarUrl = (user) => {
    return user?.avatar ? pb.files.getUrl(user, user.avatar, { thumb: '50x50' }) : null;
  };

  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  };

  if (loading && messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-muted-foreground gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p>Lade Chat...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background rounded-xl overflow-hidden">
      {/* Header (optional if used standalone, but usually good to have context) */}
      {recipient && (
        <div className="p-4 border-b border-border flex items-center gap-3 bg-card shrink-0">
          <Avatar className="h-10 w-10 rounded-xl">
            {getAvatarUrl(recipient) && <AvatarImage src={getAvatarUrl(recipient)} alt={recipient.name} />}
            <AvatarFallback className="rounded-xl bg-primary/10 text-primary">
              {getInitials(recipient.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-semibold text-foreground">{recipient.name}</div>
            {recipient.location && (
              <div className="text-xs text-muted-foreground">{recipient.location}</div>
            )}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background/50">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground opacity-80">
            <p>Noch keine Nachrichten.</p>
            <p className="text-sm mt-1">Schreib die erste Nachricht!</p>
          </div>
        ) : (
          messages.map((message) => {
            const isOwn = message.senderId === currentUser.id;
            const sender = message.expand?.senderId;
            
            return (
              <div
                key={message.id}
                className={`flex w-full animate-message-enter gap-3 ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                {!isOwn && (
                  <Avatar className="h-8 w-8 rounded-xl flex-shrink-0 mt-auto">
                    {sender?.avatar && <AvatarImage src={getAvatarUrl(sender)} alt={sender.name} />}
                    <AvatarFallback className="rounded-xl bg-primary/10 text-primary text-xs">
                      {getInitials(sender?.name)}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[75%]`}>
                  <div
                    className={`px-4 py-2.5 text-sm leading-relaxed ${
                      isOwn ? 'chat-bubble-own' : 'chat-bubble-other'
                    }`}
                  >
                    {message.image && (
                      <div className="mb-2 max-w-xs overflow-hidden rounded-lg">
                        <img 
                          src={message.image} 
                          alt="Gesendetes Bild" 
                          className="w-full h-auto max-h-60 object-cover cursor-pointer hover:opacity-90 transition-opacity" 
                          onClick={() => window.open(message.image, '_blank')}
                        />
                      </div>
                    )}
                    {message.messageText}
                  </div>
                  <span className="text-xs text-muted-foreground mt-1 px-1">
                    {new Date(message.created).toLocaleTimeString('de-AT', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} className="h-px" />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-4 border-t border-border bg-card shrink-0">
        {imagePreview && (
          <div className="relative inline-block mb-3 p-1 bg-background border border-border rounded-lg group animate-message-enter">
            <img 
              src={imagePreview} 
              alt="Preview" 
              className="h-20 w-auto rounded-md object-cover"
            />
            <button
              type="button"
              onClick={handleRemoveImage}
              className="absolute -top-1.5 -right-1.5 p-1 bg-destructive text-destructive-foreground rounded-full hover:scale-105 active:scale-95 transition-transform shadow-sm"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
        <div className="flex gap-3">
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleImageChange}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={sending}
            className="border-border/60 text-muted-foreground hover:text-foreground shrink-0 transition-transform active:scale-[0.98]"
          >
            <Image className="h-4 w-4" />
          </Button>
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Nachricht schreiben..."
            disabled={sending}
            className="flex-1 border-border/60 bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
          />
          <Button 
            type="submit" 
            disabled={sending || (!newMessage.trim() && !selectedImage)} 
            size="icon"
            className="bg-primary hover:bg-primary/90 text-primary-foreground shrink-0 transition-transform active:scale-[0.98]"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ChatWindow;
