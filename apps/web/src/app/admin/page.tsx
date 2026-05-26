'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fetchPaymentUnits, savePaymentUnits, PaymentUnit, DEFAULT_UNITS } from '@/lib/paymentSettings';
import { fetchCategories, saveCategories, deleteCategory, generateId, DEFAULT_CATEGORIES } from '@/lib/categorySettings';
import { Category, SubCategory, SubSubCategory, Suggestion } from '@/types';
import {
  Trash2, Plus, Save, Lock, Settings, Loader2, CheckCircle,
  AlertTriangle, Tag, ChevronDown, ChevronRight, Pencil, X, Check,
  GripVertical, History, Mail, Layers
} from 'lucide-react';
import { db } from '@/lib/firebaseClient';
import { collection, query, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { fetchSuggestionCategories, saveSuggestionCategories, SuggestionCategory } from '@/lib/suggestionSettings';

type AdminTab = 'units' | 'categories' | 'changelog' | 'suggestions' | 'suggestionCategories';

/* ─────────────────────────────────────────────
   Inline editable label + emoji cell
───────────────────────────────────────────── */
function InlineEdit({
  label, emoji, onSave, onCancel,
}: {
  label: string; emoji: string;
  onSave: (label: string, emoji: string) => void;
  onCancel: () => void;
}) {
  const [l, setL] = useState(label);
  const [e, setE] = useState(emoji);
  return (
    <div className="flex items-center gap-2 flex-1">
      <input
        value={e}
        onChange={(ev) => setE(ev.target.value)}
        className="w-12 text-center text-xl border border-border/60 rounded-lg bg-background px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary"
        placeholder="😀"
        maxLength={4}
      />
      <input
        value={l}
        onChange={(ev) => setL(ev.target.value)}
        onKeyDown={(ev) => { if (ev.key === 'Enter') onSave(l, e); if (ev.key === 'Escape') onCancel(); }}
        className="flex-1 border border-border/60 rounded-lg bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        autoFocus
      />
      <button onClick={() => onSave(l, e)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-all"><Check className="w-4 h-4" /></button>
      <button onClick={onCancel} className="p-1.5 text-muted-foreground hover:bg-muted rounded-lg transition-all"><X className="w-4 h-4" /></button>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Inline editable label + emoji cell for Units
───────────────────────────────────────────── */
function InlineUnitEdit({
  label, labelPlural, emoji, onSave, onCancel,
}: {
  label: string; labelPlural: string; emoji: string;
  onSave: (label: string, labelPlural: string, emoji: string) => void;
  onCancel: () => void;
}) {
  const [l, setL] = useState(label);
  const [lp, setLp] = useState(labelPlural);
  const [e, setE] = useState(emoji);
  return (
    <div className="flex flex-col gap-2 flex-1 border border-border/60 p-2.5 rounded-xl bg-muted/10">
      <div className="flex items-center gap-2">
        <input
          value={e}
          onChange={(ev) => setE(ev.target.value)}
          className="w-12 text-center text-xl border border-border/60 rounded-lg bg-background px-1 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder="😀"
          maxLength={4}
        />
        <div className="flex-1 flex flex-col gap-1.5">
          <input
            value={l}
            onChange={(ev) => setL(ev.target.value)}
            className="w-full border border-border/60 rounded-lg bg-background px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Einzahl (z.B. Flasche)"
            autoFocus
          />
          <input
            value={lp}
            onChange={(ev) => setLp(ev.target.value)}
            className="w-full border border-border/60 rounded-lg bg-background px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Mehrzahl (z.B. Flaschen)"
            onKeyDown={(ev) => { if (ev.key === 'Enter') onSave(l, lp, e); if (ev.key === 'Escape') onCancel(); }}
          />
        </div>
      </div>
      <div className="flex justify-end gap-1.5">
        <button onClick={() => onSave(l, lp, e)} className="px-3 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-all flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Speichern</button>
        <button onClick={onCancel} className="px-3 py-1 text-xs font-bold text-muted-foreground border border-border/60 hover:bg-muted rounded-lg transition-all flex items-center gap-1"><X className="w-3.5 h-3.5" /> Abbrechen</button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Delete-Confirmation Dialog
───────────────────────────────────────────── */
function DeleteConfirm({ label, onConfirm, onCancel, withMigration }: {
  label: string; onConfirm: () => void; onCancel: () => void; withMigration: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl p-6 max-w-sm w-full space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-destructive/10 rounded-xl"><AlertTriangle className="w-5 h-5 text-destructive" /></div>
          <h3 className="font-bold text-lg text-foreground">Kategorie löschen?</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Willst du <span className="font-semibold text-foreground">"{label}"</span> wirklich löschen?
          {withMigration && (
            <span className="block mt-2 text-amber-600 dark:text-amber-400 font-medium">
              ⚠️ Alle Inserate dieser Kategorie werden automatisch auf <strong>"Sonstiges"</strong> umgestellt.
            </span>
          )}
        </p>
        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1 rounded-xl" onClick={onCancel}>Abbrechen</Button>
          <Button className="flex-1 bg-destructive hover:bg-destructive/90 text-white rounded-xl" onClick={onConfirm}>Löschen</Button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Sub-Sub Category Row
───────────────────────────────────────────── */
function SubSubRow({ item, onUpdate, onDelete }: {
  item: SubSubCategory;
  onUpdate: (updated: SubSubCategory) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <>
      {confirmDelete && (
        <DeleteConfirm label={item.label} withMigration={false}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => { setConfirmDelete(false); onDelete(); }}
        />
      )}
      <div className="flex items-center gap-2 py-2 pl-4 group">
        <div className="w-3 border-l-2 border-border/40 h-4 mr-1" />
        {editing ? (
          <InlineEdit label={item.label} emoji={item.emoji || ''} onCancel={() => setEditing(false)}
            onSave={(label, emoji) => { onUpdate({ ...item, label, emoji }); setEditing(false); }} />
        ) : (
          <>
            <span className="text-base">{item.emoji}</span>
            <span className="text-sm text-foreground flex-1">{item.label}</span>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => setEditing(true)} className="p-1 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all"><Pencil className="w-3.5 h-3.5" /></button>
              <button onClick={() => setConfirmDelete(true)} className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────
   Sub Category Section
───────────────────────────────────────────── */
function SubRow({ item, onUpdate, onDelete }: {
  item: SubCategory;
  onUpdate: (updated: SubCategory) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [addingSubSub, setAddingSubSub] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newEmoji, setNewEmoji] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const subs = item.subcategories ?? [];

  const handleAddSubSub = () => {
    if (!newLabel.trim()) return;
    const entry: SubSubCategory = { id: generateId(newLabel), label: newLabel.trim(), emoji: newEmoji };
    onUpdate({ ...item, subcategories: [...subs, entry] });
    setNewLabel(''); setNewEmoji(''); setAddingSubSub(false);
  };

  return (
    <>
      {confirmDelete && (
        <DeleteConfirm label={item.label} withMigration={false}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => { setConfirmDelete(false); onDelete(); }}
        />
      )}
      <div className="pl-6 border-l-2 border-border/30 ml-3">
        {/* Sub header row */}
        <div className="flex items-center gap-2 py-2 group">
          <button onClick={() => setExpanded(!expanded)} className="text-muted-foreground hover:text-foreground transition-colors">
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          {editing ? (
            <InlineEdit label={item.label} emoji={item.emoji || ''} onCancel={() => setEditing(false)}
              onSave={(label, emoji) => { onUpdate({ ...item, label, emoji }); setEditing(false); }} />
          ) : (
            <>
              <span className="text-base">{item.emoji}</span>
              <span className="text-sm font-semibold text-foreground flex-1">{item.label}</span>
              <span className="text-xs text-muted-foreground mr-2">{subs.length} Sub-Kategorien</span>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => { setExpanded(true); setAddingSubSub(true); }} className="p-1 text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-all" title="Sub-Sub-Kategorie hinzufügen"><Plus className="w-3.5 h-3.5" /></button>
                <button onClick={() => setEditing(true)} className="p-1 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all"><Pencil className="w-3.5 h-3.5" /></button>
                <button onClick={() => setConfirmDelete(true)} className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </>
          )}
        </div>

        {/* Sub-sub list */}
        {expanded && (
          <div className="ml-4">
            {subs.map((ss, i) => (
              <SubSubRow key={ss.id} item={ss}
                onDelete={() => onUpdate({ ...item, subcategories: subs.filter((_, idx) => idx !== i) })}
                onUpdate={(updated) => onUpdate({ ...item, subcategories: subs.map((s, idx) => idx === i ? updated : s) })}
              />
            ))}

            {addingSubSub ? (
              <div className="flex items-center gap-2 py-2 pl-4">
                <div className="w-3 border-l-2 border-border/40 h-4 mr-1" />
                <input value={newEmoji} onChange={(e) => setNewEmoji(e.target.value)} className="w-12 text-center text-xl border border-border/60 rounded-lg bg-background px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary" placeholder="😀" maxLength={4} />
                <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleAddSubSub(); if (e.key === 'Escape') { setAddingSubSub(false); setNewLabel(''); } }} className="flex-1 border border-border/60 rounded-lg bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Name der Sub-Sub-Kategorie" autoFocus />
                <button onClick={handleAddSubSub} className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg"><Check className="w-4 h-4" /></button>
                <button onClick={() => { setAddingSubSub(false); setNewLabel(''); }} className="p-1.5 text-muted-foreground hover:bg-muted rounded-lg"><X className="w-4 h-4" /></button>
              </div>
            ) : (
              <button onClick={() => setAddingSubSub(true)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary py-1.5 pl-6 transition-colors">
                <Plus className="w-3 h-3" /> Sub-Kategorie hinzufügen
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────
   Main Category Card
───────────────────────────────────────────── */
function CategoryCard({ cat, onUpdate, onDelete }: {
  cat: Category;
  onUpdate: (updated: Category) => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [addingSub, setAddingSub] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newEmoji, setNewEmoji] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const subs = cat.subcategories ?? [];
  const isSonstiges = cat.id === 'sonstiges';

  const handleAddSub = () => {
    if (!newLabel.trim()) return;
    const entry: SubCategory = { id: `${cat.id}_${generateId(newLabel)}`, label: newLabel.trim(), emoji: newEmoji, subcategories: [] };
    onUpdate({ ...cat, subcategories: [...subs, entry] });
    setNewLabel(''); setNewEmoji(''); setAddingSub(false);
  };

  return (
    <>
      {confirmDelete && (
        <DeleteConfirm label={cat.label} withMigration={true}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => { setConfirmDelete(false); onDelete(); }}
        />
      )}
      <div className="border border-border/60 rounded-xl overflow-hidden bg-background">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 bg-muted/30 group">
          <button onClick={() => setExpanded(!expanded)} className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
            {expanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </button>

          {editing ? (
            <InlineEdit label={cat.label} emoji={cat.emoji || ''} onCancel={() => setEditing(false)}
              onSave={(label, emoji) => { onUpdate({ ...cat, label, emoji }); setEditing(false); }} />
          ) : (
            <>
              <span className="text-xl">{cat.emoji}</span>
              <span className="font-bold text-foreground flex-1">{cat.label}</span>
              <span className="text-xs text-muted-foreground mr-2">{subs.length} Sub-Kategorien</span>
              <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => { setExpanded(true); setAddingSub(true); }} className="p-1.5 text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-all" title="Sub-Kategorie hinzufügen"><Plus className="w-4 h-4" /></button>
                <button onClick={() => setEditing(true)} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all" title="Bearbeiten"><Pencil className="w-4 h-4" /></button>
                {!isSonstiges && (
                  <button onClick={() => setConfirmDelete(true)} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all" title="Löschen"><Trash2 className="w-4 h-4" /></button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Sub-categories */}
        {expanded && (
          <div className="px-4 py-3 space-y-1 border-t border-border/40">
            {subs.length === 0 && !addingSub && (
              <p className="text-xs text-muted-foreground py-2 text-center">Noch keine Sub-Kategorien.</p>
            )}
            {subs.map((sub, i) => (
              <SubRow key={sub.id} item={sub}
                onDelete={() => onUpdate({ ...cat, subcategories: subs.filter((_, idx) => idx !== i) })}
                onUpdate={(updated) => onUpdate({ ...cat, subcategories: subs.map((s, idx) => idx === i ? updated : s) })}
              />
            ))}

            {addingSub ? (
              <div className="flex items-center gap-2 py-2 pl-2">
                <input value={newEmoji} onChange={(e) => setNewEmoji(e.target.value)} className="w-12 text-center text-xl border border-border/60 rounded-lg bg-card px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary" placeholder="😀" maxLength={4} />
                <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleAddSub(); if (e.key === 'Escape') { setAddingSub(false); setNewLabel(''); } }} className="flex-1 border border-border/60 rounded-lg bg-card px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Name der Sub-Kategorie" autoFocus />
                <button onClick={handleAddSub} className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg"><Check className="w-4 h-4" /></button>
                <button onClick={() => { setAddingSub(false); setNewLabel(''); }} className="p-1.5 text-muted-foreground hover:bg-muted rounded-lg"><X className="w-4 h-4" /></button>
              </div>
            ) : (
              <button onClick={() => setAddingSub(true)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary py-1.5 pl-2 w-full transition-colors">
                <Plus className="w-3.5 h-3.5" /> Sub-Kategorie hinzufügen
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────
   Changelog Data
───────────────────────────────────────────── */
interface ChangelogEntry {
  version: string;
  date: string;
  type: 'Major' | 'Minor' | 'Patch' | 'Update';
  changes: string[];
}

const CHANGELOG_DATA: ChangelogEntry[] = [
  {
    version: 'v1.4.0',
    date: '26. Mai 2026',
    type: 'Update',
    changes: [
      'WhatsApp-Status Link-Vorschau: Behebung von fehlenden Vorschaubildern durch clientseitige Bildkomprimierung (< 200 KB) vor dem Upload in Cloud Storage.',
      'Optimiertes Teilen: Übergabe von kombiniertem Text und URL bei der Native Share API zur Erhaltung der Linkvorschau im WhatsApp-Status.',
      'Server-Metadaten: Dynamische serverseitige Generierung des Beschreibungstextes ("Schau mal, was ich...") als og:description in der Cloud Function.',
      'Datenschutz-Schutz: Vollständiges Ausblenden der E-Mail-Adresse des Verkäufers auf der Detailseite.',
      'Standort-Details: Prominente Anzeige von PLZ und Ort unter dem Inseratstitel (mit MapPin-Icon), in der Verkäuferkarte und in der Produktdetail-Tabelle.'
    ]
  },
  {
    version: 'v1.3.0',
    date: '26. Mai 2026',
    type: 'Update',
    changes: [
      'Benutzer-Dropdown: Bündelung aller Aktionen (Profil, Nachrichten, Einstellungen, Logout, Vorschläge) in ein kompaktes, klick-außerhalb-schließendes Dropdown-Menü.',
      'Verbesserungsvorschläge: Einführung eines Formulars für Feedback (Titel, Beschreibung, optionale Bild-Uploads in Cloud Storage, Kategoriewähler) mit Google reCAPTCHA v2 Spam-Schutz.',
      'Admin-Inbox & Kategorien: Neuer einheitlicher Einstellungsbereich mit Dropdown-Navigation zur Inbox-Steuerung (ungelesen/erledigt/abgelehnt-Filterung, Gruppierung) und dynamischer Kategorien-Verwaltung.',
      'Aufruf-Tracking (Unique Views): Erfassung eindeutiger Klicks pro Inserat (Zähler erhöht sich nur einmal pro externem Benutzer) mit Zähleranzeige auf Produktkarten und Inseratsdetails.',
      'Logo-Design: Modernisierung des Logos durch Entfernen des kleinen orangenen Pfeils unter dem "bier"-Kasten für eine klarere Ästhetik.',
      'Hosting-Optimierung: Konfiguration von Cache-Control-Richtlinien in der Cloud (no-cache für HTML-Dateien) zur sofortigen Sichtbarkeit von Updates ohne Browser-Verzögerung.'
    ]
  },
  {
    version: 'v1.2.0',
    date: '26. Mai 2026',
    type: 'Update',
    changes: [
      'Account-Adresse: Benutzer können nun ihre vollständige Adresse (Straße, Hausnummer, PLZ, Ort) in den Profileinstellungen hinterlegen.',
      'Denormalisierung & Sync: PLZ und Ort werden bei der Inseratserstellung direkt denormalisiert gespeichert. Bei einer Profiländerung aktualisiert die Plattform automatisch alle bestehenden Inserate des Benutzers im Hintergrund.',
      'Standortanzeige: Auf der Startseite, in der Suchergebnis-Liste und in den Produktdetails der Inserate werden PLZ und Ort angezeigt (mit Fallback zu "AT/DE").',
      'Datenstruktur: Speicherung aller Adressdaten in separaten Feldern (street, houseNumber, zipCode, city) in der Firestore-Datenbank für verbesserte Flexibilität.'
    ]
  },
  {
    version: 'v1.1.0',
    date: '26. Mai 2026',
    type: 'Update',
    changes: [
      'Mobile Touch-Optimierung: Konvertierung wichtiger Navigationselemente (z. B. "Inserat erstellen" und mobile Menü-Links) zu Standard-HTML-Anchors, um Next.js clientseitige Routing-Locks in mobilen In-App-Browsern zu umgehen.',
      'Taktiles Feedback: Hinzufügen von active:scale-95 active:opacity-90 Touch-Klassen auf prominenten Schaltflächen für ein direktes und wertiges Tipp-Feedback auf Smartphones.',
      'Globale Button-Kompression: Das Klickverhalten aller Standardbuttons in der gesamten Web-App wurde auf active:scale-[0.98] umgestellt.',
      'WhatsApp-Optimierung: Neue Inserats-Teilen-Funktion mit Unterstützung für natives Teilen (Navigator Share) oder responsivem Modaldialog mit direkter WhatsApp-Übergabe und automatischer Emoji-Zuweisung.'
    ]
  },
  {
    version: 'v1.0.0',
    date: '25. Mai 2026',
    type: 'Major',
    changes: [
      'Flexible Tausch-Einheiten: Admins können jetzt dynamische Tausch-Einheiten (Einzahl & Mehrzahl, z. B. Flasche/Flaschen, Kiste/Kisten) verwalten.',
      'Grammatikalische Anpassungen: Dynamische Auflösung der Einheiten im Detail und den Angebotslisten (z. B. "1 Kiste", "3 Kisten").',
      'Kategorien-Editor: Vollwertiges Admin-Interface zur Strukturierung und Bearbeitung mehrstufiger Kategorien inklusive Emoji-Unterstützung.',
      'Plattform Launch: Vollwertiges Tauschen von Gegenständen gegen Bier (Euro-freier Tauschmarkt für die DACH-Region).'
    ]
  }
];

/* ─────────────────────────────────────────────
   Main Admin Page
───────────────────────────────────────────── */
export default function AdminPage() {
  const router = useRouter();
  const { user, userProfile, loading } = useAuth();

  const [activeTab, setActiveTab] = useState<AdminTab>('units');

  // ─── Payment Units state ───
  const [units, setUnits] = useState<PaymentUnit[]>([]);
  const [newUnitLabel, setNewUnitLabel] = useState('');
  const [newUnitLabelPlural, setNewUnitLabelPlural] = useState('');
  const [newUnitEmoji, setNewUnitEmoji] = useState('');
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  const [loadingUnits, setLoadingUnits] = useState(true);

  // ─── Categories state ───
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [addingCat, setAddingCat] = useState(false);
  const [newCatLabel, setNewCatLabel] = useState('');
  const [newCatEmoji, setNewCatEmoji] = useState('');

  // ─── Suggestions state ───
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const [suggestFilter, setSuggestFilter] = useState<'all' | 'unread' | 'pending'>('all');
  const [showDoneRejected, setShowDoneRejected] = useState(false);
  const [editingSuggestId, setEditingSuggestId] = useState<string | null>(null);
  const [editSuggestTitle, setEditSuggestTitle] = useState('');
  const [editSuggestText, setEditSuggestText] = useState('');
  const [editSuggestCategoryId, setEditSuggestCategoryId] = useState('');

  // ─── Suggestion Categories state ───
  const [suggestionCats, setSuggestionCats] = useState<SuggestionCategory[]>([]);
  const [newSuggestCatLabel, setNewSuggestCatLabel] = useState('');
  const [newSuggestCatEmoji, setNewSuggestCatEmoji] = useState('');
  const [editingSuggestCatId, setEditingSuggestCatId] = useState<string | null>(null);
  const [loadingSuggestCats, setLoadingSuggestCats] = useState(true);

  // ─── Shared feedback ───
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const clearMessages = () => { setSuccessMsg(''); setErrorMsg(''); };

  // Access check
  useEffect(() => {
    if (!loading) {
      if (!user || userProfile?.role !== 'superAdmin') {
        router.push('/');
      } else {
        loadUnits();
        loadCats();
        loadSuggestions();
        loadSuggestionCats();
      }
    }
  }, [user, userProfile, loading, router]);

  const loadUnits = async () => {
    setLoadingUnits(true);
    try { setUnits(await fetchPaymentUnits()); }
    catch { setErrorMsg('Fehler beim Laden der Einheiten.'); }
    finally { setLoadingUnits(false); }
  };

  const loadCats = async () => {
    setLoadingCats(true);
    try { setCategories(await fetchCategories()); }
    catch { setErrorMsg('Fehler beim Laden der Kategorien.'); }
    finally { setLoadingCats(false); }
  };

  const loadSuggestions = async () => {
    setLoadingSuggestions(true);
    try {
      const q = query(collection(db, 'suggestions'));
      const querySnapshot = await getDocs(q);
      const list: Suggestion[] = [];
      querySnapshot.forEach((docSnap) => {
        list.push(docSnap.data() as Suggestion);
      });
      list.sort((a, b) => {
        const valA = a.createdAt ? (typeof a.createdAt.toMillis === 'function' ? a.createdAt.toMillis() : (a.createdAt.seconds * 1000 || 0)) : 0;
        const valB = b.createdAt ? (typeof b.createdAt.toMillis === 'function' ? b.createdAt.toMillis() : (b.createdAt.seconds * 1000 || 0)) : 0;
        return valB - valA;
      });
      setSuggestions(list);
    } catch (err) {
      console.error("Fehler beim Laden der Vorschläge:", err);
      setErrorMsg('Fehler beim Laden der Verbesserungsvorschläge.');
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const loadSuggestionCats = async () => {
    setLoadingSuggestCats(true);
    try { setSuggestionCats(await fetchSuggestionCategories()); }
    catch { setErrorMsg('Fehler beim Laden der Vorschlags-Kategorien.'); }
    finally { setLoadingSuggestCats(false); }
  };

  // ─── Suggestion Category Handlers ───
  const handleAddSuggestCat = (e: React.FormEvent) => {
    e.preventDefault(); clearMessages();
    const label = newSuggestCatLabel.trim();
    if (!label) return;
    const id = label.toLowerCase().replace(/\s+/g, '_');
    if (suggestionCats.some(c => c.id === id)) {
      setErrorMsg(`Die Kategorie "${label}" existiert bereits.`);
      return;
    }
    setSuggestionCats(prev => [...prev, { id, label, emoji: newSuggestCatEmoji }]);
    setNewSuggestCatLabel(''); setNewSuggestCatEmoji('');
  };

  const handleRemoveSuggestCat = (id: string) => {
    clearMessages();
    if (suggestionCats.length <= 1) {
      setErrorMsg('Es muss mindestens eine Kategorie definiert bleiben.');
      return;
    }
    setSuggestionCats(prev => prev.filter(c => c.id !== id));
  };

  const handleUpdateSuggestCat = (id: string, label: string, emoji: string) => {
    setSuggestionCats(prev => prev.map(c => c.id === id ? { ...c, label, emoji } : c));
    setEditingSuggestCatId(null);
  };

  const handleSaveSuggestCats = async () => {
    setIsSaving(true); clearMessages();
    try {
      await saveSuggestionCategories(suggestionCats);
      setSuccessMsg('Vorschlags-Kategorien erfolgreich gespeichert!');
    } catch (err: any) {
      setErrorMsg(err.message || 'Fehler beim Speichern.');
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Suggestion Handlers ───
  const handleUpdateSuggestionStatus = async (id: string, updates: Partial<Suggestion>) => {
    try {
      const docRef = doc(db, 'suggestions', id);
      await updateDoc(docRef, updates);
      setSuggestions(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
      setSuccessMsg('Vorschlag erfolgreich aktualisiert.');
    } catch (err: any) {
      console.error("Fehler beim Aktualisieren des Vorschlags:", err);
      setErrorMsg("Fehler beim Aktualisieren: " + err.message);
    }
  };

  const handleStartEditSuggestion = (s: Suggestion) => {
    setEditingSuggestId(s.id);
    setEditSuggestTitle(s.title);
    setEditSuggestText(s.text);
    setEditSuggestCategoryId(s.categoryId);
  };

  const handleSaveSuggestionEdit = async (id: string) => {
    if (!editSuggestTitle.trim() || !editSuggestText.trim()) {
      alert("Titel und Text dürfen nicht leer sein.");
      return;
    }
    setIsSaving(true);
    clearMessages();
    try {
      const docRef = doc(db, 'suggestions', id);
      const updates = {
        title: editSuggestTitle.trim(),
        text: editSuggestText.trim(),
        categoryId: editSuggestCategoryId
      };
      await updateDoc(docRef, updates);
      setSuggestions(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
      setEditingSuggestId(null);
      setSuccessMsg('Vorschlag erfolgreich aktualisiert!');
    } catch (err: any) {
      console.error("Fehler beim Bearbeiten des Vorschlags:", err);
      setErrorMsg("Fehler beim Speichern: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSuggestion = async (id: string) => {
    if (!confirm("Möchtest du diesen Vorschlag wirklich unwiderruflich löschen?")) return;
    clearMessages();
    try {
      const docRef = doc(db, 'suggestions', id);
      await deleteDoc(docRef);
      setSuggestions(prev => prev.filter(s => s.id !== id));
      setSuccessMsg('Vorschlag erfolgreich gelöscht!');
    } catch (err: any) {
      console.error("Fehler beim Löschen des Vorschlags:", err);
      setErrorMsg("Fehler beim Löschen: " + err.message);
    }
  };

  // ─── Units handlers ───
  const handleAddUnit = (e: React.FormEvent) => {
    e.preventDefault(); clearMessages();
    const label = newUnitLabel.trim();
    const labelPlural = newUnitLabelPlural.trim() || label;
    if (!label) return;
    const id = label.toLowerCase().replace(/\s+/g, '_');
    if (units.some(u => u.id === id)) { setErrorMsg(`Die Einheit "${label}" existiert bereits.`); return; }
    setUnits(prev => [...prev, { id, label, labelPlural, emoji: newUnitEmoji }]);
    setNewUnitLabel(''); setNewUnitLabelPlural(''); setNewUnitEmoji('');
  };

  const handleRemoveUnit = (id: string) => {
    clearMessages();
    if (units.length <= 1) { setErrorMsg('Es muss mindestens eine Tauscheinheit definiert bleiben.'); return; }
    setUnits(prev => prev.filter(u => u.id !== id));
  };

  const handleUpdateUnit = (id: string, label: string, labelPlural: string, emoji: string) => {
    setUnits(prev => prev.map(u => u.id === id ? { ...u, label, labelPlural, emoji } : u));
    setEditingUnitId(null);
  };

  const handleSaveUnits = async () => {
    setIsSaving(true); clearMessages();
    try { await savePaymentUnits(units); setSuccessMsg('Tausch-Zahlungsmethoden erfolgreich aktualisiert!'); }
    catch (err: any) { setErrorMsg(err.message || 'Fehler beim Speichern.'); }
    finally { setIsSaving(false); }
  };

  // ─── Categories handlers ───
  const handleAddCategory = () => {
    if (!newCatLabel.trim()) return;
    const cat: Category = { id: generateId(newCatLabel), label: newCatLabel.trim(), emoji: newCatEmoji, subcategories: [] };
    setCategories(prev => [...prev, cat]);
    setNewCatLabel(''); setNewCatEmoji(''); setAddingCat(false);
  };

  const handleDeleteCategory = async (id: string) => {
    clearMessages();
    setIsSaving(true);
    try {
      const updated = await deleteCategory(id, categories);
      setCategories(updated);
      setSuccessMsg('Kategorie gelöscht. Betroffene Inserate wurden zu "Sonstiges" migriert.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Fehler beim Löschen.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveCategories = async () => {
    setIsSaving(true); clearMessages();
    try { await saveCategories(categories); setSuccessMsg('Kategorien erfolgreich gespeichert!'); }
    catch (err: any) { setErrorMsg(err.message || 'Fehler beim Speichern.'); }
    finally { setIsSaving(false); }
  };

  // ─── Render guards ───
  if (loading || loadingUnits || loadingCats) {
    return (
      <div className="w-full flex-1 flex justify-center items-center py-24">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

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

  const getSuggestCatEmoji = (catId: string) => {
    const found = suggestionCats.find(c => c.id === catId);
    return found ? found.emoji : '💡';
  };

  const getSuggestCatLabel = (catId: string) => {
    const found = suggestionCats.find(c => c.id === catId);
    return found ? found.label : catId;
  };

  const tabs: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
    { id: 'suggestions', label: 'Verbesserungsanfragen', icon: <Mail className="w-4 h-4" /> },
    { id: 'suggestionCategories', label: 'Vorschlags-Kategorien', icon: <Layers className="w-4 h-4" /> },
    { id: 'units', label: 'Tausch-Einheiten', icon: <GripVertical className="w-4 h-4" /> },
    { id: 'categories', label: 'Kategorien', icon: <Tag className="w-4 h-4" /> },
    { id: 'changelog', label: 'Changelog', icon: <History className="w-4 h-4" /> },
  ];

  return (
    <div className="w-full flex-1 max-w-4xl mx-auto py-12 px-4">
      <div className="bg-card border border-border/80 rounded-2xl shadow-lg overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border/60 px-8 pt-8 pb-6">
          <div className="p-3 bg-primary/10 rounded-xl text-primary">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight">App-Einstellungen</h1>
            <p className="text-muted-foreground text-sm mt-1">Verwalte globale Einstellungen für bierhaben.com.</p>
          </div>
        </div>

        {/* Tab Dropdown (All Screen Sizes) */}
        <div className="px-6 md:px-8 py-4 border-b border-border/60 flex items-center justify-between gap-4">
          <span className="text-sm font-bold text-muted-foreground hidden sm:inline">Bereich auswählen:</span>
          <div className="relative w-full sm:w-72">
            <select
              id="adminTabSelect"
              value={activeTab}
              onChange={(e) => { setActiveTab(e.target.value as AdminTab); clearMessages(); }}
              className="w-full h-12 bg-background border border-border/80 rounded-xl px-4 pr-10 outline-none focus:ring-1 focus:ring-primary text-foreground font-bold text-sm appearance-none shadow-sm cursor-pointer"
            >
              {tabs.map((tab) => (
                <option key={tab.id} value={tab.id}>
                  {tab.label}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-muted-foreground">
              <ChevronDown className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="p-8 space-y-6">
          {/* Feedback banners */}
          {successMsg && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-sm flex items-center gap-2">
              <CheckCircle className="w-5 h-5 shrink-0" />
              <span className="font-semibold">{successMsg}</span>
            </div>
          )}
          {errorMsg && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-sm flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span className="font-semibold">{errorMsg}</span>
            </div>
          )}


          {/* ── TAB: Verbesserungsanfragen ── */}
          {activeTab === 'suggestions' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-secondary dark:text-foreground">Verbesserungsanfragen</h2>
                <p className="text-muted-foreground text-xs mt-1">
                  Hier siehst du alle von Nutzern eingegangenen Vorschläge und Ideen zur Verbesserung der Plattform.
                </p>
              </div>

              <div className="space-y-4">
                {loadingSuggestions ? (
                  <div className="w-full flex justify-center py-12">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  </div>
                ) : suggestions.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground border border-dashed rounded-2xl bg-muted/10">
                    Keine Verbesserungsvorschläge eingegangen.
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Filter controls */}
                    <div className="flex flex-wrap items-center justify-between gap-4 p-4 border border-border/60 rounded-2xl bg-slate-50/50 dark:bg-card/20 shadow-sm">
                      
                      {/* Desktop Filters (Buttons) */}
                      <div className="hidden sm:flex items-center gap-2">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Filtern nach:</span>
                        <div className="flex bg-background border border-border/80 rounded-xl p-1 shadow-sm">
                          {(['all', 'unread', 'pending'] as const).map((f) => (
                            <button
                              key={f}
                              onClick={() => setSuggestFilter(f)}
                              className={`px-3.5 py-1.5 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
                                suggestFilter === f
                                  ? 'bg-primary text-white shadow-sm'
                                  : 'text-muted-foreground hover:text-foreground'
                              }`}
                            >
                              {f === 'all' ? 'Alle' : f === 'unread' ? 'Ungelesen' : 'Ausstehend'}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Mobile Filters (Dropdown) */}
                      <div className="flex sm:hidden flex-col gap-1.5 w-full">
                        <label htmlFor="mobileSuggestFilter" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Filtern nach:</label>
                        <div className="relative w-full">
                          <select
                            id="mobileSuggestFilter"
                            value={suggestFilter}
                            onChange={(e) => setSuggestFilter(e.target.value as any)}
                            className="w-full h-11 bg-background border border-border/80 rounded-xl px-3.5 pr-10 outline-none focus:ring-1 focus:ring-primary text-foreground font-bold text-sm appearance-none shadow-sm cursor-pointer"
                          >
                            <option value="all">Alle</option>
                            <option value="unread">Ungelesen</option>
                            <option value="pending">Ausstehend</option>
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-muted-foreground">
                            <ChevronDown className="w-4 h-4" />
                          </div>
                        </div>
                      </div>

                      <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-secondary dark:text-foreground select-none w-full sm:w-auto mt-2 sm:mt-0">
                        <input
                          type="checkbox"
                          checked={showDoneRejected}
                          onChange={(e) => setShowDoneRejected(e.target.checked)}
                          className="w-4.5 h-4.5 rounded border-border text-primary focus:ring-primary/30"
                        />
                        <span>Erledigte & Abgelehnt einblenden</span>
                      </label>
                    </div>

                    {/* Suggestions list */}
                    {(() => {
                      const filtered = suggestions.filter((s) => {
                        // 1. Filter out completed/rejected unless enabled
                        if (!showDoneRejected && (s.status === 'done' || s.status === 'rejected')) {
                          return false;
                        }
                        // 2. Filter by unread/pending
                        if (suggestFilter === 'unread' && s.isRead) {
                          return false;
                        }
                        if (suggestFilter === 'pending' && s.status !== 'pending') {
                          return false;
                        }
                        return true;
                      });

                      if (filtered.length === 0) {
                        return (
                          <div className="p-8 text-center text-sm text-muted-foreground border border-dashed rounded-2xl bg-muted/10">
                            Keine Verbesserungsvorschläge entsprechen den Filtereinstellungen.
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-4">
                          {filtered.map((s) => (
                            <div 
                              key={s.id} 
                              className={`p-6 border rounded-2xl bg-background transition-all shadow-sm flex flex-col gap-4 ${
                                !s.isRead ? 'border-primary/45 ring-1 ring-primary/20 shadow-md shadow-primary/5' : 'border-border/80'
                              }`}
                            >
                              {editingSuggestId === s.id ? (
                                <div className="space-y-4">
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                      <label className="text-xs font-bold text-muted-foreground uppercase">Titel</label>
                                      <Input
                                        value={editSuggestTitle}
                                        onChange={(e) => setEditSuggestTitle(e.target.value)}
                                        className="font-semibold text-sm"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-xs font-bold text-muted-foreground uppercase">Kategorie</label>
                                      <select
                                        value={editSuggestCategoryId}
                                        onChange={(e) => setEditSuggestCategoryId(e.target.value)}
                                        className="w-full h-10 px-3 rounded-lg border border-input bg-white dark:bg-card text-sm font-semibold text-foreground"
                                      >
                                        {suggestionCats.map((cat) => (
                                          <option key={cat.id} value={cat.id}>
                                            {cat.emoji} {cat.label}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>

                                  <div className="space-y-1">
                                    <label className="text-xs font-bold text-muted-foreground uppercase">Vorschlagstext</label>
                                    <textarea
                                      value={editSuggestText}
                                      onChange={(e) => setEditSuggestText(e.target.value)}
                                      rows={4}
                                      className="w-full p-3 rounded-lg border border-input bg-transparent text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary text-foreground leading-relaxed resize-none"
                                    />
                                  </div>

                                  <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
                                    <Button
                                      size="sm"
                                      onClick={() => handleSaveSuggestionEdit(s.id)}
                                      disabled={isSaving}
                                      className="bg-primary hover:bg-primary/90 text-white font-bold h-9 px-4 rounded-lg flex items-center gap-1 shadow-sm text-xs cursor-pointer"
                                    >
                                      {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                      Speichern
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setEditingSuggestId(null)}
                                      className="h-9 px-4 rounded-lg text-xs cursor-pointer"
                                    >
                                      Abbrechen
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  {/* Header info */}
                                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-3">
                                    <div className="flex items-center gap-2">
                                      <span className="text-lg font-extrabold text-foreground">{s.title}</span>
                                      <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                        <span>{getSuggestCatEmoji(s.categoryId)}</span>
                                        <span>{getSuggestCatLabel(s.categoryId)}</span>
                                      </span>
                                    </div>
                                    <span className="text-xs text-muted-foreground font-medium">
                                      {s.createdAt && typeof s.createdAt.toDate === 'function' 
                                        ? s.createdAt.toDate().toLocaleString('de-DE') 
                                        : 'Kürzlich'}
                                    </span>
                                  </div>

                                  {/* Text */}
                                  <p className="text-sm text-secondary/90 dark:text-foreground/90 whitespace-pre-wrap leading-relaxed">
                                    {s.text}
                                  </p>

                                  {/* Images preview */}
                                  {s.images && s.images.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                      {s.images.map((url, idx) => (
                                        <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="block w-20 h-20 rounded-xl overflow-hidden border border-border/80 hover:border-primary/50 transition-all">
                                          <img src={url} alt="" className="w-full h-full object-cover" />
                                        </a>
                                      ))}
                                    </div>
                                  )}

                                  {/* Creator info & badges */}
                                  <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-border/40 text-xs">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                      <span>Vorgeschlagen von:</span>
                                      <span className="font-bold text-foreground">{s.userName}</span>
                                    </div>
                                    
                                    {/* Badges */}
                                    <div className="flex items-center gap-2">
                                      {/* Read Status Badge */}
                                      <span className={`px-2.5 py-1 rounded-full font-bold uppercase tracking-wide text-[10px] border ${
                                        s.isRead 
                                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' 
                                          : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                                      }`}>
                                        {s.isRead ? 'Gelesen' : 'Ungelesen'}
                                      </span>
                                      
                                      {/* Process Status Badge */}
                                      <span className={`px-2.5 py-1 rounded-full font-bold uppercase tracking-wide text-[10px] border ${
                                        s.status === 'done'
                                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                          : s.status === 'rejected'
                                          ? 'bg-destructive/10 text-destructive border-destructive/20'
                                          : 'bg-slate-500/10 text-slate-600 border-slate-500/20'
                                      }`}>
                                        {s.status === 'done' ? 'Gemacht' : s.status === 'rejected' ? 'Abgelehnt' : 'Ausstehend'}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Action buttons row */}
                                  <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-border/40">
                                    
                                    {/* Read/Unread toggle & edit/delete */}
                                    <div className="flex flex-wrap items-center gap-2">
                                      <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={() => handleUpdateSuggestionStatus(s.id, { isRead: !s.isRead })}
                                        className="text-xs h-9 border-border/80 text-secondary dark:text-foreground active:scale-95 active:opacity-90 px-3 cursor-pointer"
                                      >
                                        Als {s.isRead ? 'ungelesen' : 'gelesen'} markieren
                                      </Button>

                                      <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={() => handleStartEditSuggestion(s)}
                                        className="text-xs h-9 border-border/80 text-secondary dark:text-foreground active:scale-95 active:opacity-90 px-3 cursor-pointer flex items-center gap-1.5"
                                      >
                                        <Pencil className="w-3.5 h-3.5 text-primary" />
                                        Bearbeiten
                                      </Button>

                                      <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={() => handleDeleteSuggestion(s.id)}
                                        className="text-xs h-9 border-destructive/30 hover:border-destructive/60 hover:bg-destructive/10 text-destructive active:scale-95 active:opacity-90 px-3 cursor-pointer flex items-center gap-1.5"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        Löschen
                                      </Button>
                                      
                                      {s.status !== 'pending' && (
                                        <Button 
                                          variant="ghost" 
                                          size="sm" 
                                          onClick={() => handleUpdateSuggestionStatus(s.id, { status: 'pending' })}
                                          className="text-xs h-9 text-muted-foreground hover:bg-muted active:scale-95 active:opacity-90 cursor-pointer"
                                        >
                                          Status zurücksetzen
                                        </Button>
                                      )}
                                    </div>

                                    {/* Decision Actions Group (Erledigt / Ablehnen) */}
                                    <div className="flex items-center gap-2 bg-slate-50/80 dark:bg-card/45 border border-border/60 p-1.5 rounded-xl shadow-inner shrink-0">
                                      {s.status !== 'done' && (
                                        <Button 
                                          variant="outline" 
                                          size="sm" 
                                          onClick={() => handleUpdateSuggestionStatus(s.id, { status: 'done', isRead: true })}
                                          className="text-xs h-8 text-emerald-600 dark:text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 border-emerald-500/20 dark:border-emerald-500/30 active:scale-95 active:opacity-90 font-extrabold px-3.5 cursor-pointer"
                                        >
                                          ✓ Erledigt
                                        </Button>
                                      )}
                                      {s.status !== 'rejected' && (
                                        <Button 
                                          variant="outline" 
                                          size="sm" 
                                          onClick={() => handleUpdateSuggestionStatus(s.id, { status: 'rejected', isRead: true })}
                                          className="text-xs h-8 text-destructive hover:text-destructive/90 hover:bg-destructive/10 border-destructive/20 active:scale-95 active:opacity-90 font-extrabold px-3.5 cursor-pointer"
                                        >
                                          ✕ Ablehnen
                                        </Button>
                                      )}
                                    </div>

                                  </div>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── TAB: Vorschlags-Kategorien ── */}
          {activeTab === 'suggestionCategories' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-secondary dark:text-foreground">Vorschlags-Kategorien verwalten</h2>
                <p className="text-muted-foreground text-xs mt-1">
                  Hier kannst du die Kategorien definieren, die Benutzer beim Senden von Verbesserungsvorschlägen auswählen können.
                </p>
              </div>

              {/* Add Category Form */}
              <form onSubmit={handleAddSuggestCat} className="flex gap-2 max-w-md">
                <input
                  value={newSuggestCatEmoji}
                  onChange={(e) => setNewSuggestCatEmoji(e.target.value)}
                  className="w-14 text-center text-xl border border-border/60 rounded-xl bg-background px-1 py-2 shrink-0 focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="💡"
                  maxLength={4}
                />
                <Input
                  value={newSuggestCatLabel}
                  onChange={(e) => setNewSuggestCatLabel(e.target.value)}
                  placeholder="Name der Kategorie (z.B. Bug, Design)"
                  className="flex-1 rounded-xl border-border/60 focus-visible:border-primary focus-visible:ring-primary"
                  required
                />
                <Button type="submit" className="bg-primary hover:bg-primary/90 text-white rounded-xl flex items-center gap-1 active:scale-95 active:opacity-90">
                  <Plus className="w-4 h-4" /> Hinzufügen
                </Button>
              </form>

              {/* Categories List */}
              <div className="border border-border/60 rounded-xl overflow-hidden bg-background max-w-md">
                <div className="bg-muted/30 px-4 py-3 border-b border-border/60 text-xs font-bold text-muted-foreground uppercase tracking-wider">Aktive Kategorien</div>
                {loadingSuggestCats ? (
                  <div className="p-4 text-center">
                    <Loader2 className="w-5 h-5 text-primary animate-spin mx-auto" />
                  </div>
                ) : suggestionCats.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">Keine Kategorien definiert.</div>
                ) : (
                  <ul className="divide-y divide-border/60">
                    {suggestionCats.map((cat) => (
                      <li key={cat.id} className="px-4 py-2.5 flex items-center gap-3 text-sm group">
                        {editingSuggestCatId === cat.id ? (
                          <InlineEdit
                            label={cat.label}
                            emoji={cat.emoji}
                            onCancel={() => setEditingSuggestCatId(null)}
                            onSave={(label, emoji) => handleUpdateSuggestCat(cat.id, label, emoji)}
                          />
                        ) : (
                          <>
                            <span className="text-xl">{cat.emoji}</span>
                            <span className="font-medium text-foreground flex-1">
                              {cat.label}
                            </span>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={() => setEditingSuggestCatId(cat.id)}
                                className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveSuggestCat(cat.id)}
                                className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="pt-4 border-t border-border/60 flex justify-end">
                <Button onClick={handleSaveSuggestCats} disabled={isSaving} className="bg-primary hover:bg-primary/90 text-white rounded-xl flex items-center gap-2 px-6 active:scale-95 active:opacity-90">
                  {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Speichert...</> : <><Save className="w-4 h-4" /> Kategorien speichern</>}
                </Button>
              </div>

            </div>
          )}

          {/* ── TAB: Tausch-Einheiten ── */}
          {activeTab === 'units' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-secondary dark:text-foreground">Tausch-Einheiten verwalten</h2>
                <p className="text-muted-foreground text-xs mt-1">
                  Definiere die Einheiten, in denen Benutzer ihre Tauschobjekte bepreisen können (z.B. Flasche, Kiste, Dose, Fass).
                </p>
              </div>

              {/* Add new unit form */}
              <form onSubmit={handleAddUnit} className="space-y-3 max-w-md">
                <div className="flex gap-2">
                  <input
                    value={newUnitEmoji}
                    onChange={(e) => setNewUnitEmoji(e.target.value)}
                    className="w-14 text-center text-xl border border-border/60 rounded-xl bg-background px-1 py-2 shrink-0 focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="🍺"
                    maxLength={4}
                  />
                  <div className="flex-1 space-y-2">
                    <Input
                      value={newUnitLabel}
                      onChange={(e) => setNewUnitLabel(e.target.value)}
                      placeholder="Einzahl (z.B. Flasche)"
                      className="rounded-xl border-border/60 focus:border-primary focus:ring-primary"
                      required
                    />
                    <Input
                      value={newUnitLabelPlural}
                      onChange={(e) => setNewUnitLabelPlural(e.target.value)}
                      placeholder="Mehrzahl (z.B. Flaschen)"
                      className="rounded-xl border-border/60 focus:border-primary focus:ring-primary"
                      required
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button type="submit" className="bg-primary hover:bg-primary/90 text-white rounded-xl flex items-center gap-1">
                    <Plus className="w-4 h-4" /> Einheit hinzufügen
                  </Button>
                </div>
              </form>

              {/* Units list */}
              <div className="border border-border/60 rounded-xl overflow-hidden bg-background max-w-md">
                <div className="bg-muted/30 px-4 py-3 border-b border-border/60 text-xs font-bold text-muted-foreground uppercase tracking-wider">Aktive Einheiten</div>
                {units.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">Keine Einheiten definiert.</div>
                ) : (
                  <ul className="divide-y divide-border/60">
                    {units.map((unit) => (
                      <li key={unit.id} className="px-4 py-2.5 flex items-center gap-3 text-sm group">
                        {editingUnitId === unit.id ? (
                          <InlineUnitEdit
                            label={unit.label}
                            labelPlural={unit.labelPlural || unit.label}
                            emoji={unit.emoji}
                            onCancel={() => setEditingUnitId(null)}
                            onSave={(label, labelPlural, emoji) => handleUpdateUnit(unit.id, label, labelPlural, emoji)}
                          />
                        ) : (
                          <>
                            <span className="text-xl">{unit.emoji}</span>
                            <span className="font-medium text-foreground flex-1">
                              {unit.label} <span className="text-xs text-muted-foreground">({unit.labelPlural || unit.label})</span>
                            </span>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={() => setEditingUnitId(unit.id)}
                                className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveUnit(unit.id)}
                                className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="pt-4 border-t border-border/60 flex justify-end">
                <Button onClick={handleSaveUnits} disabled={isSaving} className="bg-primary hover:bg-primary/90 text-white rounded-xl flex items-center gap-2 px-6">
                  {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Speichert...</> : <><Save className="w-4 h-4" /> Einstellungen speichern</>}
                </Button>
              </div>
            </div>
          )}

          {/* ── TAB: Kategorien ── */}
          {activeTab === 'categories' && (
            <div className="space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-secondary dark:text-foreground">Kategorien verwalten</h2>
                  <p className="text-muted-foreground text-xs mt-1">
                    Klicke auf eine Kategorie, um Sub-Kategorien zu sehen und zu bearbeiten. Jede Ebene hat Emoji-Unterstützung.
                  </p>
                </div>
                <Button
                  onClick={() => setAddingCat(true)}
                  className="bg-primary hover:bg-primary/90 text-white rounded-xl flex items-center gap-1.5 shrink-0"
                >
                  <Plus className="w-4 h-4" /> Neue Kategorie
                </Button>
              </div>

              {/* Add new top-level category */}
              {addingCat && (
                <div className="flex items-center gap-2 p-3 border border-primary/30 bg-primary/5 rounded-xl">
                  <input value={newCatEmoji} onChange={(e) => setNewCatEmoji(e.target.value)} className="w-12 text-center text-xl border border-border/60 rounded-lg bg-background px-1 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary" placeholder="😀" maxLength={4} />
                  <input
                    value={newCatLabel}
                    onChange={(e) => setNewCatLabel(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddCategory(); if (e.key === 'Escape') { setAddingCat(false); setNewCatLabel(''); } }}
                    className="flex-1 border border-border/60 rounded-lg bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Name der Hauptkategorie"
                    autoFocus
                  />
                  <button onClick={handleAddCategory} className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-all"><Check className="w-4 h-4" /></button>
                  <button onClick={() => { setAddingCat(false); setNewCatLabel(''); }} className="p-2 text-muted-foreground hover:bg-muted rounded-lg transition-all"><X className="w-4 h-4" /></button>
                </div>
              )}

              {/* Category list */}
              <div className="space-y-3">
                {categories.map((cat) => (
                  <CategoryCard
                    key={cat.id}
                    cat={cat}
                    onUpdate={(updated) => setCategories(prev => prev.map(c => c.id === cat.id ? updated : c))}
                    onDelete={() => handleDeleteCategory(cat.id)}
                  />
                ))}
              </div>

              {/* Save */}
              <div className="pt-4 border-t border-border/60 flex justify-end">
                <Button onClick={handleSaveCategories} disabled={isSaving} className="bg-primary hover:bg-primary/90 text-white rounded-xl flex items-center gap-2 px-6">
                  {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Speichert...</> : <><Save className="w-4 h-4" /> Kategorien speichern</>}
                </Button>
              </div>
            </div>
          )}

          {/* ── TAB: Changelog ── */}
          {activeTab === 'changelog' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-secondary dark:text-foreground">App-Changelog</h2>
                <p className="text-muted-foreground text-xs mt-1">
                  Hier siehst du den Verlauf der veröffentlichten Updates und Feature-Releases von bierhaben.com.
                </p>
              </div>

              <div className="space-y-8 relative before:absolute before:inset-y-1 before:left-3 before:w-0.5 before:bg-border/60">
                {CHANGELOG_DATA.map((version) => (
                  <div key={version.version} className="relative pl-8 group">
                    {/* Bullet node */}
                    <div className="absolute left-1.5 top-1.5 w-3.5 h-3.5 rounded-full bg-background border-2 border-primary group-hover:bg-primary transition-all shadow-sm z-10" />
                    
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-black text-secondary dark:text-foreground">{version.version}</span>
                        <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          version.type === 'Major' 
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20' 
                            : 'bg-primary/10 text-primary border border-primary/20'
                        }`}>
                          {version.type}
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-muted-foreground">{version.date}</span>
                    </div>

                    <ul className="space-y-2 text-sm text-secondary/80 dark:text-foreground/80 list-disc pl-4">
                      {version.changes.map((change, idx) => (
                        <li key={idx} className="leading-relaxed">
                          {change}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
