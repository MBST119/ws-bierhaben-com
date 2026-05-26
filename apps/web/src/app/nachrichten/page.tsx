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
  serverTimestamp,
  increment 
} from 'firebase/firestore';
import { db, storage } from '@/lib/firebaseClient';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { fetchPaymentUnits, PaymentUnit } from '@/lib/paymentSettings';
import { 
  MessageSquare, 
  Clock, 
  Send, 
  ArrowLeft, 
  ExternalLink, 
  Loader2,
  Image,
  Tag,
  Check,
  X,
  Paperclip,
  Info,
  Trash2
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
  unreadCounts?: Record<string, number>;
  updatedAt: any;
}

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  createdAt: any;
  imageUrl?: string;
  type?: 'text' | 'image' | 'offer';
  offerAmount?: number;
  offerUnit?: string;
  offerStatus?: 'pending' | 'accepted' | 'declined';
  isDeleted?: boolean;
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

  const [imageUploading, setImageUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [showPriceSuggestion, setShowPriceSuggestion] = useState(false);
  const [suggestedAmount, setSuggestedAmount] = useState('');
  const [suggestedUnit, setSuggestedUnit] = useState<string>('kiste');
  const [availableUnits, setAvailableUnits] = useState<PaymentUnit[]>([]);

  useEffect(() => {
    fetchPaymentUnits().then((fetched) => {
      setAvailableUnits(fetched);
      if (fetched.length > 0) {
        setSuggestedUnit(fetched[0].id);
      }
    });
  }, []);

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    try {
      let date: Date;
      if (typeof timestamp.toMillis === 'function') {
        date = new Date(timestamp.toMillis());
      } else if (typeof timestamp.seconds === 'number') {
        date = new Date(timestamp.seconds * 1000);
      } else if (timestamp instanceof Date) {
        date = timestamp;
      } else if (typeof timestamp === 'string' || typeof timestamp === 'number') {
        date = new Date(timestamp);
      } else {
        date = new Date();
      }
      if (isNaN(date.getTime())) {
        return '';
      }
      return date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
    } catch (e) {
      return '';
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    try {
      let date: Date;
      if (typeof timestamp.toMillis === 'function') {
        date = new Date(timestamp.toMillis());
      } else if (typeof timestamp.seconds === 'number') {
        date = new Date(timestamp.seconds * 1000);
      } else if (timestamp instanceof Date) {
        date = timestamp;
      } else if (typeof timestamp === 'string' || typeof timestamp === 'number') {
        date = new Date(timestamp);
      } else {
        date = new Date();
      }
      if (isNaN(date.getTime())) {
        return '';
      }
      return date.toLocaleDateString([], {day: '2-digit', month: '2-digit'});
    } catch (e) {
      return '';
    }
  };

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
        chat.participantIds?.forEach(pId => {
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
            } else {
              updatedNames[pId] = 'Unbekannt';
              updated = true;
            }
          } else {
            updatedNames[pId] = 'Unbekannt';
            updated = true;
          }
        } catch (err) {
          console.warn(`Could not resolve display name for ${pId}:`, err);
          updatedNames[pId] = 'Unbekannt';
          updated = true;
        }
      }

      if (updated) {
        setFetchedNames(updatedNames);
      }
    };

    resolveNames();
  }, [chats, messages, user, fetchedNames]);

  // Clear unread count for the selected chat
  useEffect(() => {
    if (!selectedChatId || !user) return;
    
    const clearUnread = async () => {
      try {
        const chatRef = doc(db, 'chats', selectedChatId);
        await updateDoc(chatRef, {
          [`unreadCounts.${user.uid}`]: 0
        });
      } catch (err) {
        console.error("Fehler beim Zurücksetzen der ungelesenen Nachrichten:", err);
      }
    };
    
    clearUnread();
  }, [selectedChatId, user]);

  const getRecipientId = async (chatId: string) => {
    // 1. Try chats state
    const currentChat = chats.find(c => c.id === chatId);
    if (currentChat) {
      return currentChat.participantIds?.find(pId => pId !== user?.uid) || null;
    }
    // 2. Try activeChat state
    if (activeChat && activeChat.id === chatId) {
      return activeChat.participantIds?.find(pId => pId !== user?.uid) || null;
    }
    // 3. Fallback: Fetch directly from firestore
    try {
      const chatDoc = await getDoc(doc(db, 'chats', chatId));
      if (chatDoc.exists()) {
        const data = chatDoc.data();
        const participantIds = data?.participantIds as string[];
        return participantIds?.find(pId => pId !== user?.uid) || null;
      }
    } catch (e) {
      console.error("Error fetching chat for recipient ID:", e);
    }
    return null;
  };

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
      const updates: any = {
        lastMessage: textToSend,
        updatedAt: serverTimestamp()
      };

      const recipientId = await getRecipientId(selectedChatId);
      if (recipientId) {
        updates[`unreadCounts.${recipientId}`] = increment(1);
      }

      await updateDoc(chatRef, updates);
    } catch (err) {
      console.error("Fehler beim Senden der Nachricht:", err);
      alert("Fehler beim Senden der Nachricht.");
    }
  };

  const getOfferUnitLabel = (unitId: string, amount: number) => {
    const found = availableUnits.find(u => u.id === unitId);
    if (found) {
      return amount > 1 ? (found.labelPlural || found.label) : found.label;
    }
    const plural = amount > 1;
    const lowerUnit = unitId.toLowerCase();
    if (lowerUnit === 'flasche') return plural ? 'Flaschen' : 'Flasche';
    if (lowerUnit === 'kiste') return plural ? 'Kisten' : 'Kiste';
    if (lowerUnit === 'dose') return plural ? 'Dosen' : 'Dose';
    return unitId;
  };

  const handleImageUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedChatId || !user) return;

    setImageUploading(true);
    try {
      const uuid = crypto.randomUUID();
      const storageRef = ref(storage, `chats/${selectedChatId}/${uuid}_${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);

      // Add image message
      await addDoc(collection(db, 'chats', selectedChatId, 'messages'), {
        text: '[Bild]',
        imageUrl: downloadUrl,
        type: 'image',
        senderId: user.uid,
        senderName: userProfile?.displayName || user.displayName || user.email?.split('@')[0] || 'Nutzer',
        createdAt: serverTimestamp()
      });

      // Update parent chat record
      const chatRef = doc(db, 'chats', selectedChatId);
      const updates: any = {
        lastMessage: '📷 Foto gesendet',
        updatedAt: serverTimestamp()
      };

      const recipientId = await getRecipientId(selectedChatId);
      if (recipientId) {
        updates[`unreadCounts.${recipientId}`] = increment(1);
      }

      await updateDoc(chatRef, updates);
    } catch (err) {
      console.error("Fehler beim Hochladen des Bildes:", err);
      alert("Fehler beim Hochladen des Bildes.");
    } finally {
      setImageUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSendPriceSuggestion = async () => {
    if (!selectedChatId || !user || !suggestedAmount) return;
    
    const amount = parseInt(suggestedAmount);
    if (isNaN(amount) || amount <= 0) return;

    try {
      const unitText = getOfferUnitLabel(suggestedUnit, amount);
      const textMessage = `Vorgeschlagener Preis: ${amount} ${unitText}`;

      // 1. Add message of type 'offer' to subcollection
      await addDoc(collection(db, 'chats', selectedChatId, 'messages'), {
        text: textMessage,
        type: 'offer',
        offerAmount: amount,
        offerUnit: suggestedUnit,
        offerStatus: 'pending',
        senderId: user.uid,
        senderName: userProfile?.displayName || user.displayName || user.email?.split('@')[0] || 'Nutzer',
        createdAt: serverTimestamp()
      });

      // 2. Update parent chat record
      const chatRef = doc(db, 'chats', selectedChatId);
      const updates: any = {
        lastMessage: `🍻 Preisvorschlag: ${amount} ${unitText}`,
        updatedAt: serverTimestamp()
      };

      const recipientId = await getRecipientId(selectedChatId);
      if (recipientId) {
        updates[`unreadCounts.${recipientId}`] = increment(1);
      }

      await updateDoc(chatRef, updates);
      
      // Reset state
      setSuggestedAmount('');
      setShowPriceSuggestion(false);
    } catch (err) {
      console.error("Fehler beim Senden des Preisvorschlags:", err);
      alert("Fehler beim Senden des Preisvorschlags.");
    }
  };

  const handleUpdateOfferStatus = async (messageId: string, status: 'accepted' | 'declined', amount: number, unit: string) => {
    if (!selectedChatId || !user) return;
    
    try {
      // 1. Update the message offerStatus
      const msgRef = doc(db, 'chats', selectedChatId, 'messages', messageId);
      await updateDoc(msgRef, {
        offerStatus: status
      });

      // 2. Send a system message notifying both users of the action
      const userName = userProfile?.displayName || user.displayName || 'Nutzer';
      const actionText = status === 'accepted' ? 'akzeptiert' : 'abgelehnt';
      const unitText = getOfferUnitLabel(unit, amount);
      const systemMessageText = `📢 ${userName} hat den Preisvorschlag von ${amount} ${unitText} ${actionText}!`;

      await addDoc(collection(db, 'chats', selectedChatId, 'messages'), {
        text: systemMessageText,
        senderId: 'system',
        senderName: 'System',
        createdAt: serverTimestamp()
      });

      // 3. Update the parent chat lastMessage
      const chatRef = doc(db, 'chats', selectedChatId);
      const updates: any = {
        lastMessage: systemMessageText,
        updatedAt: serverTimestamp()
      };

      const recipientId = await getRecipientId(selectedChatId);
      if (recipientId) {
        updates[`unreadCounts.${recipientId}`] = increment(1);
      }

      await updateDoc(chatRef, updates);
    } catch (err) {
      console.error("Fehler beim Aktualisieren des Status:", err);
      alert("Fehler beim Aktualisieren des Status.");
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!selectedChatId) return;
    if (!confirm("Möchtest du diese Nachricht wirklich löschen?")) return;
    try {
      const msgRef = doc(db, 'chats', selectedChatId, 'messages', messageId);
      await updateDoc(msgRef, {
        isDeleted: true,
        text: 'Diese Nachricht wurde gelöscht.',
        imageUrl: null,
        type: 'text',
        offerAmount: null,
        offerUnit: null,
        offerStatus: null
      });

      // Update parent chat record if this was the last message
      if (messages.length > 0 && messages[messages.length - 1].id === messageId) {
        const chatRef = doc(db, 'chats', selectedChatId);
        await updateDoc(chatRef, {
          lastMessage: '🚫 Nachricht gelöscht',
          updatedAt: serverTimestamp()
        });
      }
    } catch (err) {
      console.error("Fehler beim Löschen der Nachricht:", err);
      alert("Fehler beim Löschen der Nachricht.");
    }
  };

  const getOtherParticipantName = (chat: Chat | null | undefined) => {
    if (!chat || !user) return 'Unbekannt';
    const otherId = chat.participantIds?.find(id => id !== user.uid);
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

  if (user && !user.emailVerified) {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
        <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-full flex items-center justify-center mb-6">
          <Info className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-extrabold mb-2">E-Mail-Verifizierung erforderlich</h1>
        <p className="text-muted-foreground text-sm leading-relaxed mb-6">
          Du musst deine E-Mail-Adresse verifizieren, um Nachrichten lesen und schreiben zu können. Bitte klicke auf den Link in der E-Mail, die wir dir gesendet haben.
        </p>
        <div className="flex gap-4">
          <Button onClick={() => router.push('/')} variant="outline" className="rounded-full">
            Zur Startseite
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto pt-0 md:pt-6 px-0 md:px-4 pb-0 md:pb-12 h-[calc(100dvh-4rem)] md:h-[calc(100vh-5rem)] md:min-h-[500px] flex flex-col">
      <div className="flex-1 bg-white dark:bg-card border-0 md:border border-border/80 rounded-none md:rounded-2xl shadow-none md:shadow-sm overflow-hidden flex">
        
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
                            {formatDate(chat.updatedAt)}
                          </span>
                        )}
                      </div>
                      
                      <div className="text-[11px] font-bold text-primary truncate mb-1">
                        {chat.listingTitle}
                      </div>
                      
                      <div className="flex justify-between items-center gap-2">
                        <p className={`text-xs truncate leading-relaxed flex-1 ${chat.unreadCounts?.[user?.uid || ''] ? 'font-semibold text-secondary dark:text-foreground' : 'text-muted-foreground'}`}>
                          {chat.lastMessage}
                        </p>
                        {chat.unreadCounts?.[user?.uid || ''] ? (
                          <span className="flex h-4.5 min-w-[18px] px-1 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shrink-0">
                            {chat.unreadCounts[user?.uid || '']}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: ACTIVE CHAT CONVERSATION */}
        <div className={`flex-1 w-full min-w-0 flex flex-col bg-slate-50/50 dark:bg-slate-900/10 ${!selectedChatId ? 'hidden md:flex justify-center items-center text-muted-foreground' : 'flex'}`}>
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
                    const isSystem = msg.senderId === 'system';
                    const isOffer = msg.type === 'offer';

                    if (isSystem) {
                      return (
                        <div key={msg.id} className="flex justify-center my-2.5">
                          <div className="bg-slate-100 dark:bg-slate-800 text-muted-foreground text-xs font-bold px-4 py-1.5 rounded-full border border-border/30 shadow-sm">
                            {msg.text}
                          </div>
                        </div>
                      );
                    }

                    const bubbleBgClass = msg.isDeleted
                      ? (isOwn ? 'bg-slate-100 dark:bg-slate-800/60 text-muted-foreground/80 border border-border/20 rounded-br-none' : 'bg-slate-50 dark:bg-card/40 text-muted-foreground/80 border border-border/20 rounded-bl-none')
                      : (isOwn ? 'bg-primary text-white rounded-br-none' : 'bg-white dark:bg-card text-foreground border border-border/50 rounded-bl-none');

                    return (
                      <div 
                        key={msg.id}
                        className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm text-sm ${bubbleBgClass}`}>
                          {!isOwn && !msg.isDeleted && (
                            <span className="block text-[10px] font-bold text-primary mb-0.5">
                              {fetchedNames[msg.senderId] || msg.senderName || 'Nutzer'}
                            </span>
                          )}

                          {msg.isDeleted ? (
                            <p className="italic text-muted-foreground/75 leading-relaxed break-words flex items-center gap-1.5 select-none">
                              <span>Diese Nachricht wurde gelöscht.</span>
                            </p>
                          ) : (
                            <>
                              {msg.imageUrl && (
                                <div className="mb-2 overflow-hidden rounded-lg max-w-full">
                                  <img src={msg.imageUrl} alt="Bild" className="w-full max-h-60 object-cover rounded-lg border border-border/10" />
                                </div>
                              )}

                              {isOffer ? (
                                <div className="my-1.5 p-3 rounded-xl border border-amber-500/20 bg-amber-50/50 dark:bg-amber-950/20 text-foreground dark:text-foreground">
                                  <div className="flex items-center gap-1.5 font-bold text-amber-600 dark:text-amber-400 mb-1.5 text-xs">
                                    <span>🍻 Preisvorschlag</span>
                                  </div>
                                  <div className="font-extrabold text-base md:text-lg mb-2 text-secondary dark:text-foreground">
                                    {msg.offerAmount} {getOfferUnitLabel(msg.offerUnit || '', msg.offerAmount || 0)}
                                  </div>
                                  
                                  {msg.offerStatus === 'pending' ? (
                                    !isOwn ? (
                                      <div className="flex gap-2 mt-2">
                                        <Button
                                          size="sm"
                                          variant="default"
                                          onClick={() => handleUpdateOfferStatus(msg.id, 'accepted', msg.offerAmount || 0, msg.offerUnit || '')}
                                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-1 h-8 rounded-lg flex items-center gap-1 flex-1 shadow-sm"
                                        >
                                          <Check className="w-3.5 h-3.5" /> Akzeptieren
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="destructive"
                                          onClick={() => handleUpdateOfferStatus(msg.id, 'declined', msg.offerAmount || 0, msg.offerUnit || '')}
                                          className="font-semibold text-xs py-1 h-8 rounded-lg flex items-center gap-1 flex-1 shadow-sm"
                                        >
                                          <X className="w-3.5 h-3.5" /> Ablehnen
                                        </Button>
                                      </div>
                                    ) : (
                                      <div className="inline-flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-semibold bg-amber-100/50 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                        Ausstehend
                                      </div>
                                    )
                                  ) : msg.offerStatus === 'accepted' ? (
                                    <div className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-100/50 dark:bg-emerald-900/30 px-2.5 py-1 rounded-full">
                                      <Check className="w-3.5 h-3.5" /> Akzeptiert
                                    </div>
                                  ) : (
                                    <div className="inline-flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 font-semibold bg-rose-100/50 dark:bg-rose-900/30 px-2.5 py-1 rounded-full">
                                      <X className="w-3.5 h-3.5" /> Abgelehnt
                                    </div>
                                  )}
                                </div>
                              ) : null}

                              {(!isOffer && msg.text && msg.text !== '[Bild]') && (
                                <p className="whitespace-pre-wrap leading-relaxed break-words">{msg.text}</p>
                              )}
                            </>
                          )}

                          <div className="flex items-center justify-end gap-1.5 mt-1 select-none">
                            <span className={`block text-[9px] ${msg.isDeleted ? 'text-muted-foreground/50' : (isOwn ? 'text-white/70' : 'text-muted-foreground')}`}>
                              {formatTime(msg.createdAt)}
                            </span>
                            {isOwn && !msg.isDeleted && (
                              <button
                                onClick={() => handleDeleteMessage(msg.id)}
                                className="text-white/60 hover:text-white dark:text-muted-foreground dark:hover:text-foreground cursor-pointer transition-colors"
                                title="Nachricht löschen"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Price Suggestion Panel */}
              {showPriceSuggestion && (
                <div className="p-4 bg-amber-50/75 dark:bg-amber-950/10 border-t border-amber-500/10 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between shrink-0 animate-in slide-in-from-bottom duration-200">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                      <span>🍻 Preisvorschlag in Trinken machen</span>
                    </span>
                    <span className="text-[11px] text-muted-foreground mt-0.5">Gib an, wie viel und welches Getränk du vorschlägst.</span>
                  </div>
                  
                  <div className="flex gap-2 items-center">
                    <Input
                      type="number"
                      min="1"
                      placeholder="Menge"
                      value={suggestedAmount}
                      onChange={(e) => setSuggestedAmount(e.target.value)}
                      className="w-24 h-10 rounded-lg text-base font-bold text-center bg-white dark:bg-card border-amber-500/40 text-foreground dark:text-foreground focus-visible:border-amber-500 focus-visible:ring-1 focus-visible:ring-amber-500"
                    />
                    
                    <select
                      value={suggestedUnit}
                      onChange={(e: any) => setSuggestedUnit(e.target.value)}
                      className="h-10 px-3 rounded-lg border border-input bg-white dark:bg-card text-base font-bold focus:outline-none focus:ring-1 focus:ring-primary border-amber-500/40 text-foreground dark:text-foreground capitalize"
                    >
                      {availableUnits.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.emoji} {u.label}
                        </option>
                      ))}
                    </select>
                    
                    <Button
                      type="button"
                      onClick={handleSendPriceSuggestion}
                      disabled={!suggestedAmount || parseInt(suggestedAmount) <= 0}
                      className="bg-amber-500 hover:bg-amber-600 text-white font-bold h-10 px-4 rounded-lg flex items-center gap-1.5 shadow-sm text-xs"
                    >
                      Senden
                    </Button>
                    
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowPriceSuggestion(false)}
                      className="h-10 w-10 text-muted-foreground hover:bg-slate-200/50"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Chat Input */}
              <form 
                onSubmit={handleSendMessage}
                className="p-4 bg-white dark:bg-card border-t border-border/60 flex gap-2.5 items-center shrink-0 shadow-inner"
              >
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  className="hidden"
                />
                
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={imageUploading}
                  onClick={handleImageUploadClick}
                  className="h-12 w-12 rounded-xl border-border/60 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-primary transition-colors text-muted-foreground shrink-0"
                  title="Bild senden"
                >
                  {imageUploading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  ) : (
                    <Image className="w-5 h-5" />
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowPriceSuggestion(!showPriceSuggestion)}
                  className={`h-12 w-12 rounded-xl border-border/60 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-primary transition-colors shrink-0 ${showPriceSuggestion ? 'bg-primary/10 text-primary border-primary/30' : 'text-muted-foreground'}`}
                  title="Preisvorschlag senden"
                >
                  <Tag className="w-5 h-5" />
                </Button>

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
