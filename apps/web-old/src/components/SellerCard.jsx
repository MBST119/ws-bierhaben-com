
import React from 'react';
import pb from '@/lib/pocketbaseClient.js';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MapPin, Phone, MessageSquare, LogIn } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const SellerCard = ({ seller, onOpenChat }) => {
  const { currentUser, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  if (!seller) {
    console.warn('SellerCard: seller prop ist undefined oder null');
    return null;
  }

  const avatarUrl = seller.avatar
    ? pb.files.getUrl(seller, seller.avatar, { thumb: '100x100' })
    : null;

  const initials = seller.name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

  // Überprüfen, ob der aktuelle Benutzer der Besitzer der Anzeige ist
  const isOwner = currentUser?.id === seller.id;

  return (
    <Card className="overflow-hidden border-none shadow-md bg-[hsl(var(--seller-bg))]">
      <CardContent className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 rounded-xl border-2 border-background shadow-sm">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={seller.name} />}
            <AvatarFallback className="rounded-xl bg-primary/10 text-primary font-semibold text-lg">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-xl text-[hsl(var(--seller-text))] truncate">
              {seller.name}
            </h3>
            <p className="text-sm font-medium text-[hsl(var(--seller-text))]/70">
              Verkäufer
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {seller.location && (
            <div className="flex items-center gap-3 text-[hsl(var(--seller-text))]/80 text-sm">
              <div className="p-2 rounded-lg bg-[hsl(var(--seller-text))]/5">
                <MapPin className="h-4 w-4" />
              </div>
              <span className="truncate">{seller.location}</span>
            </div>
          )}
          
          {seller.phone && (
            <div className="flex items-center gap-3 text-[hsl(var(--seller-text))]/80 text-sm">
              <div className="p-2 rounded-lg bg-[hsl(var(--seller-text))]/5">
                <Phone className="h-4 w-4" />
              </div>
              <span>{seller.phone}</span>
            </div>
          )}
        </div>

        {!isOwner && (
          <div className="pt-2">
            {isAuthenticated ? (
              <Button 
                onClick={onOpenChat}
                className="w-full gap-2 h-12 text-base font-semibold shadow-md transition-all active:scale-[0.98] bg-orange-500 text-white hover:bg-orange-600"
              >
                <MessageSquare className="h-5 w-5" />
                Nachricht senden
              </Button>
            ) : (
              <div className="flex flex-col gap-3 items-center bg-background/50 p-4 rounded-xl border border-border/50 text-center">
                <p className="text-sm text-muted-foreground">Bitte anmelden um zu kontaktieren</p>
                <Button 
                  onClick={() => navigate('/login')}
                  variant="outline"
                  className="w-full gap-2"
                >
                  <LogIn className="h-4 w-4" />
                  Anmelden
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SellerCard;
