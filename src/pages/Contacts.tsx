import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search, Users } from 'lucide-react';
import { toast } from 'sonner';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

type Contact = Tables<'contacts'>;

const TAGS = ['consulting', 'finance', 'tech', 'alumni', 'student club', 'healthcare', 'PE/VC'];

export default function Contacts() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState('');
  const [filterStrength, setFilterStrength] = useState<string>('all');
  const [filterTag, setFilterTag] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('recent');
  const [addOpen, setAddOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchContacts = async () => {
    if (!user) return;
    const { data } = await supabase.from('contacts').select('*').eq('user_id', user.id).order('updated_at', { ascending: false });
    setContacts(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchContacts(); }, [user]);

  const filtered = contacts
    .filter(c => {
      const q = search.toLowerCase();
      if (q && !c.full_name.toLowerCase().includes(q) && !c.company?.toLowerCase().includes(q) && !c.role_title?.toLowerCase().includes(q)) return false;
      if (filterStrength !== 'all' && c.relationship_strength !== filterStrength) return false;
      if (filterTag !== 'all' && !(c.tags || []).includes(filterTag)) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.full_name.localeCompare(b.full_name);
      if (sortBy === 'company') return (a.company || '').localeCompare(b.company || '');
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });

  const strengthColor = (s: string | null) => {
    if (s === 'strong') return 'bg-success/10 text-success border-success/20';
    if (s === 'warm') return 'bg-warning/10 text-warning border-warning/20';
    return 'bg-muted text-muted-foreground';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Contacts</h1>
          <p className="text-sm text-muted-foreground mt-1">{contacts.length} people in your network</p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Add Contact
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search contacts..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterStrength} onValueChange={setFilterStrength}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Strength" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All strengths</SelectItem>
            <SelectItem value="cold">Cold</SelectItem>
            <SelectItem value="warm">Warm</SelectItem>
            <SelectItem value="strong">Strong</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterTag} onValueChange={setFilterTag}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Tag" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All tags</SelectItem>
            {TAGS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Sort" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Most recent</SelectItem>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="company">Company</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Contact list */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading contacts...</div>
      ) : filtered.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="w-12 h-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-1">No contacts found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {search || filterStrength !== 'all' || filterTag !== 'all'
                ? 'Try adjusting your filters'
                : 'Start building your network by adding a contact'}
            </p>
            {!search && filterStrength === 'all' && filterTag === 'all' && (
              <Button onClick={() => setAddOpen(true)} variant="outline" className="gap-2">
                <Plus className="w-4 h-4" /> Add your first contact
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map(c => (
            <Link key={c.id} to={`/contacts/${c.id}`}>
              <Card className="border-border/50 hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary shrink-0">
                    {c.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{c.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{c.role_title}{c.company ? ` at ${c.company}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {(c.tags || []).slice(0, 2).map(t => (
                      <Badge key={t} variant="outline" className="text-xs hidden md:inline-flex">{t}</Badge>
                    ))}
                    <Badge variant="outline" className={`text-xs ${strengthColor(c.relationship_strength)}`}>
                      {c.relationship_strength}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <AddContactDialog open={addOpen} onOpenChange={setAddOpen} userId={user?.id || ''} onAdded={fetchContacts} />
    </div>
  );
}

function AddContactDialog({ open, onOpenChange, userId, onAdded }: { open: boolean; onOpenChange: (v: boolean) => void; userId: string; onAdded: () => void }) {
  const [form, setForm] = useState({ full_name: '', role_title: '', company: '', email: '', linkedin_url: '', school_alumni_status: '', relationship_strength: 'cold' as const, notes: '', shared_interests: '' });
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.full_name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    const { error } = await supabase.from('contacts').insert({
      ...form,
      user_id: userId,
      tags: selectedTags,
    } as TablesInsert<'contacts'>);
    if (error) { toast.error(error.message); setSaving(false); return; }
    toast.success('Contact added!');
    onOpenChange(false);
    setForm({ full_name: '', role_title: '', company: '', email: '', linkedin_url: '', school_alumni_status: '', relationship_strength: 'cold', notes: '', shared_interests: '' });
    setSelectedTags([]);
    setSaving(false);
    onAdded();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Contact</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 col-span-2">
              <Label>Full name *</Label>
              <Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Sarah Chen" />
            </div>
            <div className="space-y-1.5">
              <Label>Role/title</Label>
              <Input value={form.role_title} onChange={e => setForm(f => ({ ...f, role_title: e.target.value }))} placeholder="Engagement Manager" />
            </div>
            <div className="space-y-1.5">
              <Label>Company</Label>
              <Input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} placeholder="McKinsey" />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} type="email" />
            </div>
            <div className="space-y-1.5">
              <Label>LinkedIn URL</Label>
              <Input value={form.linkedin_url} onChange={e => setForm(f => ({ ...f, linkedin_url: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Alumni status</Label>
            <Input value={form.school_alumni_status} onChange={e => setForm(f => ({ ...f, school_alumni_status: e.target.value }))} placeholder="Kellogg '22" />
          </div>
          <div className="space-y-1.5">
            <Label>Relationship strength</Label>
            <Select value={form.relationship_strength} onValueChange={v => setForm(f => ({ ...f, relationship_strength: v as any }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cold">Cold</SelectItem>
                <SelectItem value="warm">Warm</SelectItem>
                <SelectItem value="strong">Strong</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2">
              {TAGS.map(t => (
                <Badge key={t} variant={selectedTags.includes(t) ? 'default' : 'outline'} className="cursor-pointer" onClick={() => setSelectedTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])}>
                  {t}
                </Badge>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label>Shared interests</Label>
            <Input value={form.shared_interests} onChange={e => setForm(f => ({ ...f, shared_interests: e.target.value }))} placeholder="Basketball, hiking, same hometown..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Add Contact'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
