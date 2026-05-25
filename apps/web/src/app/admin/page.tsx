'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { fetchPaymentUnits, savePaymentUnits } from '@/lib/paymentSettings';
import { Trash2, Plus, Save, Lock, Settings, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';

export default function AdminPage() {
  const router = useRouter();
  const { user, userProfile, loading } = useAuth();
  
  const [units, setUnits] = useState<string[]>([]);
  const [newUnit, setNewUnit] = useState('');
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Access check & load settings
  useEffect(() => {
    if (!loading) {
      if (!user || userProfile?.role !== 'superAdmin') {
        router.push('/');
      } else {
        loadSettings();
      }
    }
  }, [user, userProfile, loading, router]);

  const loadSettings = async () => {
    setLoadingSettings(true);
    try {
      const fetchedUnits = await fetchPaymentUnits();
      setUnits(fetchedUnits);
    } catch (err) {
      console.error("Failed to load units:", err);
      setErrorMsg("Fehler beim Laden der Einheiten.");
    } finally {
      setLoadingSettings(false);
    }
  };

  const handleAddUnit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    const cleanUnit = newUnit.trim().toLowerCase();
    
    if (!cleanUnit) return;
    if (units.includes(cleanUnit)) {
      setErrorMsg(`Die Einheit "${cleanUnit}" existiert bereits.`);
      return;
    }
    
    setUnits(prev => [...prev, cleanUnit]);
    setNewUnit('');
  };

  const handleRemoveUnit = (unitToRemove: string) => {
    setErrorMsg('');
    setSuccessMsg('');
    if (units.length <= 1) {
      setErrorMsg("Es muss mindestens eine Tauscheinheit definiert bleiben.");
      return;
    }
    setUnits(prev => prev.filter(u => u !== unitToRemove));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await savePaymentUnits(units);
      setSuccessMsg("Tausch-Zahlungsmethoden erfolgreich aktualisiert!");
    } catch (err: any) {
      console.error("Error saving units:", err);
      setErrorMsg(err.message || "Fehler beim Speichern der Einheiten in Firestore.");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || loadingSettings) {
    return (
      <div className="w-full flex-1 flex justify-center items-center py-24">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  // Double check protection to avoid brief flashes before redirect completes
  if (!user || userProfile?.role !== 'superAdmin') {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
        <div className="w-16 h-16 bg-destructive/10 border border-destructive/20 text-destructive rounded-full flex items-center justify-center mb-6">
          <Lock className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-extrabold mb-2">Zugriff verweigert</h1>
        <p className="text-muted-foreground text-sm leading-relaxed mb-6">
          Diese Seite ist nur für Super-Administratoren zugänglich.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full flex-1 max-w-4xl mx-auto py-12 px-4">
      <div className="bg-card border border-border/80 rounded-2xl shadow-lg p-8">
        
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border/60 pb-6 mb-8">
          <div className="p-3 bg-primary/10 rounded-xl text-primary">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Super-Admin Dashboard</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Verwalte globale Einstellungen und Tausch-Zahlungsmethoden für bierhaben.com.
            </p>
          </div>
        </div>

        {successMsg && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-sm flex items-center gap-2">
            <CheckCircle className="w-5 h-5 shrink-0" />
            <span className="font-semibold">{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-sm flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span className="font-semibold">{errorMsg}</span>
          </div>
        )}

        {/* Section: Payment Units */}
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-secondary dark:text-foreground">Tausch-Einheiten verwalten</h2>
            <p className="text-muted-foreground text-xs mt-1">
              Definiere die Einheiten, in denen Benutzer ihre Tauschobjekte bepreisen können (z.B. Flasche, Kiste, Dose, Fass).
            </p>
          </div>

          {/* Add unit form */}
          <form onSubmit={handleAddUnit} className="flex gap-2.5 max-w-md">
            <div className="flex-1 space-y-1">
              <Input 
                value={newUnit}
                onChange={(e) => setNewUnit(e.target.value)}
                placeholder="z.B. fass, tray, liter"
                className="rounded-xl border-border/60 focus:border-primary focus:ring-primary"
              />
            </div>
            <Button type="submit" className="bg-primary hover:bg-primary/90 text-white rounded-xl flex items-center gap-1">
              <Plus className="w-4 h-4" />
              Hinzufügen
            </Button>
          </form>

          {/* Current Units List */}
          <div className="border border-border/60 rounded-xl overflow-hidden bg-background max-w-md">
            <div className="bg-muted/30 px-4 py-3 border-b border-border/60 text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Aktive Einheiten
            </div>
            {units.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">Keine Einheiten definiert.</div>
            ) : (
              <ul className="divide-y divide-border/60">
                {units.map((unit) => (
                  <li key={unit} className="px-4 py-3 flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground capitalize">{unit}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveUnit(unit)}
                      className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all"
                      title="Einheit löschen"
                    >
                      <Trash2 className="w-4.5 h-4.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Save Button */}
          <div className="pt-6 border-t border-border/60 flex justify-end">
            <Button 
              type="button" 
              onClick={handleSave} 
              disabled={isSaving}
              className="bg-primary hover:bg-primary/90 text-white rounded-xl flex items-center gap-2 px-6"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Speichert...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Einstellungen speichern
                </>
              )}
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}
