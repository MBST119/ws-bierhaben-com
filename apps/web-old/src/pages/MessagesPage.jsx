
import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/contexts/AuthContext.jsx';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import ChatWindow from '@/components/ChatWindow.jsx';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquare } from 'lucide-react';

const MessagesPage = () => {
  const location = useLocation();
  const { currentUser } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selectedRecipient, setSelectedRecipient] = useState(location.state?.recipientId || null);
  const [selectedListing, setSelectedListing] = useState(location.state?.listingId || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const messages = await pb.collection('messages').getList(1, 100, {
          filter: `senderId = "${currentUser.id}" || recipientId = "${currentUser.id}"`,
          sort: '-created',
          expand: 'senderId,recipientId,listingId',
          $autoCancel: false
        });

        const conversationMap = new Map();
        
        messages.items.forEach((message) => {
          const otherUserId = message.senderId === currentUser.id 
            ? message.recipientId 
            : message.senderId;
          
          if (!conversationMap.has(otherUserId)) {
            const otherUser = message.senderId === currentUser.id
              ? message.expand?.recipientId
              : message.expand?.senderId;
            
            conversationMap.set(otherUserId, {
              userId: otherUserId,
              user: otherUser,
              lastMessage: message,
              listing: message.expand?.listingId
            });
          }
        });

        setConversations(Array.from(conversationMap.values()));
      } catch (error) {
        console.error('Error fetching conversations:', error);
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
      fetchConversations();
    }
  }, [currentUser]);

  const getAvatarUrl = (user) => {
    return user?.avatar ? pb.files.getUrl(user, user.avatar, { thumb: '50x50' }) : null;
  };

  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  };

  return (
    <>
      <Helmet>
        <title>Nachrichten - bierhaben.com</title>
        <meta name="description" content="Verwalte deine Nachrichten auf bierhaben.com" />
      </Helmet>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-8">
              <h1 className="text-4xl md:text-5xl font-bold mb-4 text-balance" style={{ letterSpacing: '-0.02em' }}>
                Nachrichten
              </h1>
              <p className="text-lg text-muted-foreground">
                Chatte mit anderen Nutzern über deine Inserate
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Conversations List */}
              <Card className="lg:col-span-1 p-4">
                <h2 className="font-semibold mb-4">Unterhaltungen</h2>
                {loading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <Skeleton className="h-12 w-12 rounded-xl" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Noch keine Unterhaltungen
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {conversations.map((conv) => (
                      <button
                        key={conv.userId}
                        onClick={() => {
                          setSelectedRecipient(conv.userId);
                          setSelectedListing(conv.listing?.id || null);
                        }}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 text-left ${
                          selectedRecipient === conv.userId
                            ? 'bg-accent'
                            : 'hover:bg-accent/50'
                        }`}
                      >
                        <Avatar className="h-12 w-12 rounded-xl flex-shrink-0">
                          {getAvatarUrl(conv.user) && (
                            <AvatarImage src={getAvatarUrl(conv.user)} alt={conv.user?.name} />
                          )}
                          <AvatarFallback className="rounded-xl bg-primary/10 text-primary">
                            {getInitials(conv.user?.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{conv.user?.name}</div>
                          <div className="text-sm text-muted-foreground truncate">
                            {conv.lastMessage.messageText}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </Card>

              {/* Chat Window */}
              <div className="lg:col-span-2">
                {selectedRecipient ? (
                  <ChatWindow recipientId={selectedRecipient} listingId={selectedListing} />
                ) : (
                  <Card className="h-[600px] flex items-center justify-center">
                    <div className="text-center">
                      <MessageSquare className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        Wähle eine Unterhaltung aus, um zu chatten
                      </p>
                    </div>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default MessagesPage;
