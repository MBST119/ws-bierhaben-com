
import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/contexts/AuthContext.jsx';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Upload } from 'lucide-react';

const ProfilePage = () => {
  const { currentUser, updateProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: currentUser?.name || '',
    location: currentUser?.location || '',
    phone: currentUser?.phone || ''
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

  const avatarUrl = currentUser?.avatar
    ? pb.files.getUrl(currentUser, currentUser.avatar, { thumb: '200x200' })
    : null;

  const initials = currentUser?.name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updateData = new FormData();
      updateData.append('name', formData.name);
      updateData.append('location', formData.location);
      updateData.append('phone', formData.phone);

      if (avatarFile) {
        updateData.append('avatar', avatarFile);
      }

      await updateProfile(currentUser.id, updateData);
      toast.success('Profil aktualisiert');
      setAvatarFile(null);
      setAvatarPreview(null);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Fehler beim Aktualisieren des Profils');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Mein Profil - bierhaben.com</title>
        <meta name="description" content="Verwalte dein Profil auf bierhaben.com" />
      </Helmet>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 py-12">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-8">
              <h1 className="text-4xl md:text-5xl font-bold mb-4 text-balance" style={{ letterSpacing: '-0.02em' }}>
                Mein Profil
              </h1>
              <p className="text-lg text-muted-foreground">
                Verwalte deine persönlichen Informationen
              </p>
            </div>

            <Tabs defaultValue="profile" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="profile">Profil bearbeiten</TabsTrigger>
                <TabsTrigger value="account">Konto-Einstellungen</TabsTrigger>
              </TabsList>

              <TabsContent value="profile">
                <Card>
                  <CardHeader>
                    <CardTitle>Profil-Informationen</CardTitle>
                    <CardDescription>
                      Aktualisiere deine öffentlichen Profil-Informationen
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                      {/* Avatar */}
                      <div className="flex items-center gap-6">
                        <Avatar className="h-24 w-24 rounded-xl">
                          {(avatarPreview || avatarUrl) && (
                            <AvatarImage src={avatarPreview || avatarUrl} alt={currentUser?.name} />
                          )}
                          <AvatarFallback className="rounded-xl bg-primary/10 text-primary text-2xl font-semibold">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <input
                            type="file"
                            id="avatar"
                            accept="image/*"
                            onChange={handleAvatarChange}
                            className="hidden"
                          />
                          <label htmlFor="avatar">
                            <Button type="button" variant="outline" size="sm" className="gap-2" asChild>
                              <span className="cursor-pointer">
                                <Upload className="h-4 w-4" />
                                Profilbild ändern
                              </span>
                            </Button>
                          </label>
                          <p className="text-xs text-muted-foreground mt-2">
                            JPG, PNG oder GIF. Max. 20MB.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="name">Name *</Label>
                        <Input
                          id="name"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          required
                          className="text-foreground"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="location">Standort</Label>
                        <Input
                          id="location"
                          name="location"
                          value={formData.location}
                          onChange={handleChange}
                          placeholder="Wien, Österreich"
                          className="text-foreground"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone">Telefon</Label>
                        <Input
                          id="phone"
                          name="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={handleChange}
                          placeholder="+43 123 456789"
                          className="text-foreground"
                        />
                      </div>

                      <Button type="submit" disabled={loading}>
                        {loading ? 'Speichern...' : 'Änderungen speichern'}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="account">
                <Card>
                  <CardHeader>
                    <CardTitle>Konto-Einstellungen</CardTitle>
                    <CardDescription>
                      Verwalte deine Konto-Einstellungen und Sicherheit
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>E-Mail-Adresse</Label>
                      <Input value={currentUser?.email} disabled className="text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">
                        Die E-Mail-Adresse kann derzeit nicht geändert werden
                      </p>
                    </div>

                    <div className="pt-4 border-t border-border">
                      <h3 className="font-semibold mb-2">Passwort ändern</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Diese Funktion ist in Entwicklung
                      </p>
                      <Button variant="outline" disabled className="opacity-50 cursor-not-allowed pointer-events-none">
                        Passwort ändern
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default ProfilePage;
