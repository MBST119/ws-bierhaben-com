'use client';

import { useEffect, useState, useRef } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  getDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { 
  MessageSquare, 
  Clock, 
  Send, 
  ArrowLeft, 
  ExternalLink, 
  Loader2 
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Chat {
  id: string;
  listingId: string;
  listingTitle: string;
  participantIds: string[];
  participantNames: Record<string, string>;
  lastMessage: string;
  updatedAt: any;
}

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  createdAt: any;
}

export default function NachrichtenPage() {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();
  
  const [chats, setChats] = useState<Chat[]>([]);
  const [chatsLoading, setChatsLoading] = useState(true);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [fetchedNames, setFetchedNames] = useState<Record<string, string>>({});
  
  // Active chat state
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [newMessageText, setNewMessageText] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Parse chat query param in a client-safe way
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const chatParam = params.get('chat');
      if (chatParam) {
        setSelectedChatId(chatParam);
      }
    }
  }, []);

  // Sync selectedChatId to activeChat object
  useEffect(() => {
    if (selectedChatId && chats.length > 0) {
      const found = chats.find(c => c.id === selectedChatId);
      if (found) {
        setActiveChat(found);
      }
    } else if (!selectedChatId) {
      setActiveChat(null);
      setMessages([]);
    }
  }, [selectedChatId, chats]);

  // Real-time listener for user's chats list
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      // Query chats containing user's uid
      const q = query(
        collection(db, 'chats'),
        where('participantIds', 'array-contains', user.uid)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedChats: Chat[] = [];
        snapshot.forEach((docSnap) => {
          fetchedChats.push({ id: docSnap.id, ...docSnap.data() } as Chat);
        });

        // Sort by updatedAt descending in client code to avoid needing complex indexes
        fetchedChats.sort((a, b) => {
          const timeA = a.updatedAt?.seconds || a.updatedAt?.toMillis?.() || 0;
          const timeB = b.updatedAt?.seconds || b.updatedAt?.toMillis?.() || 0;
          return timeB - timeA;
        });

        setChats(fetchedChats);
        setChatsLoading(false);
      }, (err) => {
        console.error("Fehler beim Abrufen der Chats:", err);
        setChatsLoading(false);
      });

      return () => unsubscribe();
    }
  }, [user, loading, router]);

  // Real-time message listener for selected chat
  useEffect(() => {
    if (!selectedChatId || !user) return;

    setMessagesLoading(true);
    const messagesRef = collection(db, 'chats', selectedChatId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedMsgs: Message[] = [];
      snapshot.forEach((docSnap) => {
        fetchedMsgs.push({ id: docSnap.id, ...docSnap.data() } as Message);
      });
      setMessages(fetchedMsgs);
      setMessagesLoading(false);
      // Scroll to bottom on new messages
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }, (err) => {
      console.error("Fehler beim Abrufen der Nachrichten:", err);
      setMessagesLoading(false);
    });

    return () => unsubscribe();
  }, [selectedChatId, user]);

  // Dynamically resolve missing or anonymous names
  useEffect(() => {
    const resolveNames = async () => {
      if (!user || chats.length === 0) return;
      
      const newNamesToFetch: string[] = [];
      
      // 1. Gather all participant IDs that might have missing/anonymous names
      chats.forEach(chat => {
        chat.participantIds.forEach(pId => {
          if (pId === user.uid) return;
          
          const currentName = chat.participantNames?.[pId];
          const hasBadName = !currentName || currentName === 'Anonymer User' || currentName === 'Unbekannt';
          
          if (hasBadName && !fetchedNames[pId] && !newNamesToFetch.includes(pId)) {
            newNamesToFetch.push(pId);
          }
        });
      });

      // Also look through message senders
      messages.forEach(msg => {
        const hasBadName = !msg.senderName || msg.senderName === 'Anonymer User' || msg.senderName === 'Unbekannt';
        if (hasBadName && msg.senderId !== user.uid && !fetchedNames[msg.senderId] && !newNamesToFetch.includes(msg.senderId)) {
          newNamesToFetch.push(msg.senderId);
        }
      });

      if (newNamesToFetch.length === 0) return;

      const updatedNames = { ...fetchedNames };
      let updated = false;

      // 2. Query Firestore doc for each user
      for (const pId of newNamesToFetch) {
        try {
          const userDocRef = doc(db, 'users', pId);
          const userSnap = await getDoc(userDocRef);
          if (userSnap.exists()) {
            const data = userSnap.data();
            if (data.displayName) {
              updatedNames[pId] = data.displayName;
              updated = true;
            }
          }
        } catch (err) {
          console.warn(`Could not resolve display name for ${pId}:`, err);
        }
      }

      if (updated) {
        setFetchedNames(updatedNames);
      }
    };

    resolveNames();
  }, [chats, messages, user, fetchedNames]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChatId || !user || !newMessageText.trim()) return;

    const textToSend = newMessageText.trim();
    setNewMessageText('');

    try {
      // 1. Add message to messages subcollection
      await addDoc(collection(db, 'chats', selectedChatId, 'messages'), {
        text: textToSend,
        senderId: user.uid,
        senderName: userProfile?.displayName || user.displayName || user.email?.split('@')[0] || 'Nutzer',
        createdAt: serverTimestamp()
      });

      // 2. Update parent chat record for lastMessage snippet & sorting
      const chatRef = doc(db, 'chats', selectedChatId);
      await updateDoc(chatRef, {
        lastMessage: textToSend,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error("Fehler beim Senden der Nachricht:", err);
      alert("Fehler beim Senden der Nachricht.");
    }
  };

  const getOtherParticipantName = (chat: Chat) => {
    if (!user) return 'Unbekannt';
    const otherId = chat.participantIds.find(id => id !== user.uid);
    if (!otherId) return 'Unbekannt';
    return fetchedNames[otherId] || chat.participantNames?.[otherId] || 'Unbekannt';
  };

  if (loading || (chatsLoading && chats.length === 0)) {
    return (
      <div className="w-full h-[calc(100vh-5rem)] flex justify-center items-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto pt-6 px-4 pb-12 h-[calc(100vh-6rem)] min-h-[500px] flex flex-col">
      <div className="flex-1 bg-white dark:bg-card border border-border/80 rounded-2xl shadow-sm overflow-hidden flex">
        
        {/* LEFT COLUMN: CHATS SIDEBAR (Hidden on mobile if chat is active) */}
        <div className={`w-full md:w-80 lg:w-96 border-r border-border/60 flex flex-col shrink-0 ${selectedChatId ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-border/60">
            <h2 className="text-xl font-bold text-secondary dark:text-foreground">Nachrichten</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto divide-y divide-border/40">
            {chats.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground flex flex-col items-center justify-center h-full">
                <MessageSquare className="w-12 h-12 text-muted-foreground/30 mb-3" />
                <p className="font-semibold text-sm">Keine Chats vorhanden</p>
                <p className="text-xs max-w-[200px] mt-1">Nimm Kontakt mit Verkäufern auf, um einen Tausch zu vereinbaren.</p>
              </div>
            ) : (
              chats.map((chat) => {
                const otherName = getOtherParticipantName(chat);
                const isActive = chat.id === selectedChatId;
                
                return (
                  <button
                    key={chat.id}
                    onClick={() => {
                      setSelectedChatId(chat.id);
                      // Update URL parameters without full page reload
                      if (typeof window !== 'undefined') {
                        window.history.replaceState(null, '', `/nachrichten?chat=${chat.id}`);
                      }
                    }}
                    className={`w-full p-4 text-left transition-colors flex gap-3.5 items-start ${isActive ? 'bg-primary/5 dark:bg-primary/10 border-l-4 border-primary' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary shrink-0 text-base">
                      {otherName.charAt(0)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-1">
                        <span className="font-bold text-sm text-secondary dark:text-foreground truncate">{otherName}</span>
                        {chat.updatedAt && (
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                            {new Date(chat.updatedAt?.seconds * 1000 || chat.updatedAt?.toMillis?.() || Date.now()).toLocaleDateString([], {day: '2-digit', month: '2-digit'})}
                          </span>
                        )}
                      </div>
                      
                      <div className="text-[11px] font-bold text-primary truncate mb-1">
                        {chat.listingTitle}
                      </div>
                      
                      <p className="text-xs text-muted-foreground truncate leading-relaxed">
                        {chat.lastMessage}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: ACTIVE CHAT CONVERSATION */}
        <div className={`flex-1 flex flex-col bg-slate-50/50 dark:bg-slate-900/10 ${!selectedChatId ? 'hidden md:flex justify-center items-center text-muted-foreground' : 'flex'}`}>
          {activeChat ? (
            <>
              {/* Chat Header */}
              <div className="bg-white dark:bg-card p-4 border-b border-border/60 flex items-center justify-between shrink-0 shadow-sm">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Back to list button on mobile */}
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => {
                      setSelectedChatId(null);
                      if (typeof window !== 'undefined') {
                        window.history.replaceState(null, '', `/nachrichten`);
                      }
                    }}
                    className="md:hidden p-1 hover:bg-slate-100 rounded-full shrink-0"
                  >
                    <ArrowLeft className="w-5 h-5 text-secondary" />
                  </Button>

                  <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary shrink-0 text-base">
                    {getOtherParticipantName(activeChat).charAt(0)}
                  </div>

                  <div className="min-w-0">
                    <h3 className="font-bold text-sm md:text-base text-secondary dark:text-foreground truncate">
                      {getOtherParticipantName(activeChat)}
                    </h3>
                    <Link 
                      href={`/angebote/detail?id=${activeChat.listingId}`}
                      className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 mt-0.5 truncate"
                    >
                      <span>Anzeige: {activeChat.listingTitle}</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4">
                {messagesLoading ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-xs text-muted-foreground py-8">
                    Starte die Unterhaltung. Schreibe eine Nachricht!
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isOwn = msg.senderId === user?.uid;
                    return (
                      <div 
                        key={msg.id}
                        className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm text-sm ${isOwn ? 'bg-primary text-white rounded-br-none' : 'bg-white dark:bg-card text-foreground border border-border/50 rounded-bl-none'}`}>
                          {!isOwn && (
                            <span className="block text-[10px] font-bold text-primary mb-0.5">
                              {fetchedNames[msg.senderId] || msg.senderName || 'Nutzer'}
                            </span>
                          )}
                          <p className="whitespace-pre-wrap leading-relaxed break-words">{msg.text}</p>
                          <span className={`block text-[9px] text-right mt-1 ${isOwn ? 'text-white/70' : 'text-muted-foreground'}`}>
                            {msg.createdAt ? new Date(msg.createdAt?.seconds * 1000 || msg.createdAt?.toMillis?.() || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              <form 
                onSubmit={handleSendMessage}
                className="p-4 bg-white dark:bg-card border-t border-border/60 flex gap-2.5 items-center shrink-0 shadow-inner"
              >
                <Input
                  value={newMessageText}
                  onChange={(e) => setNewMessageText(e.target.value)}
                  placeholder="Schreibe eine Nachricht..."
                  className="flex-1 h-12 rounded-xl text-base"
                />
                
                <Button 
                  type="submit" 
                  size="icon" 
                  disabled={!newMessageText.trim()}
                  className="h-12 w-12 rounded-xl bg-primary hover:bg-primary/95 text-white shrink-0 shadow-md shadow-primary/10 transition-all hover:scale-105"
                >
                  <Send className="w-5 h-5" />
                </Button>
              </form>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center max-w-sm">
              <MessageSquare className="w-16 h-16 text-muted-foreground/20 mb-4" />
              <h3 className="font-bold text-lg text-secondary dark:text-foreground mb-1">Deine Chats</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Wähle links eine Konversation aus oder kontaktiere einen Verkäufer direkt bei seinem Inserat.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
