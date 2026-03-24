import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ArrowLeft, Edit, Trash2, Mail, Linkedin, Calendar, MessageSquare, Coffee } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

type Contact = Tables<'contacts'>;
type Meeting = Tables<'meetings'>;
type FollowUp = Tables<'follow_ups'>;
type DraftedMessage = Tables<'drafted_messages'>;

const MEETING_TYPE_LABELS: Record<string, string> = {
  coffee_chat: 'Coffee Chat',
  info_interview: 'Info Interview',
  networking_event: 'Networking Event',
  class_project: 'Class Project',
  alumni_call: 'Alumni Call',
};

export default function ContactDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [contact, setContact] = useState<Contact | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [messages, setMessages] = useState<DraftedMessage[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !id) return;
    const load = async () => {
      const [cRes, mRes, fRes, dRes] = await Promise.all([
        supabase.from('contacts').select('*').eq('id', id).eq('user_id', user.id).single(),
        supabase.from('meetings').select('*').eq('contact_id', id).eq('user_id', user.id).order('date', { ascending: false }),
        supabase.from('follow_ups').select('*').eq('contact_id', id).eq('user_id', user.id).order('due_date', { ascending: true }),
        supabase.from('drafted_messages').select('*').eq('contact_id', id).eq('user_id', user.id).order('created_at', { ascending: false }),
      ]);
      setContact(cRes.data);
      setMeetings(mRes.data || []);
      setFollowUps(fRes.data || []);
      setMessages(dRes.data || []);
      setLoading(false);
    };
    load();
  }, [user, id]);

  const handleDelete = async () => {
    if (!confirm('Delete this contact? This will also remove related meetings and follow-ups.')) return;
    await supabase.from('contacts').delete().eq('id', id!);
    toast.success('Contact deleted');
    navigate('/contacts');
  };

  const strengthColor = (s: string | null) => {
    if (s === 'strong') return 'bg-success/10 text-success border-success/20';
    if (s === 'warm') return 'bg-warning/10 text-warning border-warning/20';
    return 'bg-muted text-muted-foreground';
  };

  if (loading) return <div className="text-center py-12 text-muted-foreground">Loading...</div>;
  if (!contact) return <div className="text-center py-12 text-muted-foreground">Contact not found</div>;

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate('/contacts')} className="gap-2 -ml-2">
        <ArrowLeft className="w-4 h-4" /> Contacts
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-lg font-semibold text-primary">
            {contact.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{contact.full_name}</h1>
            <p className="text-muted-foreground">{contact.role_title}{contact.company ? ` at ${contact.company}` : ''}</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className={strengthColor(contact.relationship_strength)}>{contact.relationship_strength}</Badge>
              {(contact.tags || []).map(t => <Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}><Edit className="w-4 h-4" /></Button>
          <Button variant="outline" size="sm" onClick={handleDelete} className="text-destructive hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Details */}
        <Card className="border-border/50">
          <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {contact.email && (
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <a href={`mailto:${contact.email}`} className="text-accent hover:underline">{contact.email}</a>
              </div>
            )}
            {contact.linkedin_url && (
              <div className="flex items-center gap-2">
                <Linkedin className="w-4 h-4 text-muted-foreground" />
                <a href={contact.linkedin_url} target="_blank" rel="noreferrer" className="text-accent hover:underline">LinkedIn Profile</a>
              </div>
            )}
            {contact.school_alumni_status && (
              <div><span className="text-muted-foreground">Alumni:</span> {contact.school_alumni_status}</div>
            )}
            {contact.last_interaction_date && (
              <div><span className="text-muted-foreground">Last interaction:</span> {format(new Date(contact.last_interaction_date), 'MMM d, yyyy')}</div>
            )}
            {contact.next_followup_date && (
              <div><span className="text-muted-foreground">Next follow-up:</span> {format(new Date(contact.next_followup_date), 'MMM d, yyyy')}</div>
            )}
            {contact.shared_interests && (
              <div><span className="text-muted-foreground">Shared interests:</span> {contact.shared_interests}</div>
            )}
            {contact.notes && (
              <div>
                <span className="text-muted-foreground">Notes:</span>
                <p className="mt-1 text-foreground">{contact.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Timeline */}
        <div className="md:col-span-2 space-y-4">
          <h2 className="text-base font-semibold text-foreground">Timeline</h2>
          {meetings.length === 0 && followUps.length === 0 && messages.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="py-8 text-center text-muted-foreground">
                No interactions yet. Log your first meeting to get started.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {meetings.map(m => (
                <Card key={m.id} className="border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Coffee className="w-4 h-4 text-accent" />
                      <span className="text-sm font-medium">{MEETING_TYPE_LABELS[m.meeting_type] || m.meeting_type}</span>
                      <span className="text-xs text-muted-foreground ml-auto">{format(new Date(m.date), 'MMM d, yyyy')}</span>
                    </div>
                    {m.key_takeaways && <p className="text-sm text-foreground mt-1">{m.key_takeaways}</p>}
                    {m.promised_next_steps && <p className="text-xs text-muted-foreground mt-1">Next steps: {m.promised_next_steps}</p>}
                    {m.structured_summary && (
                      <div className="mt-3 p-3 rounded-lg bg-muted/50 text-xs space-y-1">
                        {Object.entries(m.structured_summary as Record<string, string>).map(([k, v]) => (
                          <div key={k}><span className="font-medium capitalize">{k.replace(/_/g, ' ')}:</span> {v}</div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
              {followUps.map(f => (
                <Card key={f.id} className="border-border/50">
                  <CardContent className="p-4 flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-warning" />
                    <div className="flex-1">
                      <p className="text-sm">{f.description || 'Follow up'}</p>
                      <p className="text-xs text-muted-foreground">Due: {format(new Date(f.due_date), 'MMM d, yyyy')}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">{f.status}</Badge>
                  </CardContent>
                </Card>
              ))}
              {messages.map(m => (
                <Card key={m.id} className="border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium capitalize">{m.message_type.replace('_', ' ')}</span>
                      <span className="text-xs text-muted-foreground ml-auto">{format(new Date(m.created_at), 'MMM d, yyyy')}</span>
                    </div>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{m.content}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {contact && <EditContactDialog open={editOpen} onOpenChange={setEditOpen} contact={contact} onSaved={() => { setEditOpen(false); window.location.reload(); }} />}
    </div>
  );
}

function EditContactDialog({ open, onOpenChange, contact, onSaved }: { open: boolean; onOpenChange: (v: boolean) => void; contact: Contact; onSaved: () => void }) {
  const [form, setForm] = useState(contact);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from('contacts').update({
      full_name: form.full_name,
      role_title: form.role_title,
      company: form.company,
      email: form.email,
      linkedin_url: form.linkedin_url,
      school_alumni_status: form.school_alumni_status,
      relationship_strength: form.relationship_strength,
      notes: form.notes,
      shared_interests: form.shared_interests,
      tags: form.tags,
    }).eq('id', contact.id);
    if (error) { toast.error(error.message); setSaving(false); return; }
    toast.success('Contact updated!');
    setSaving(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Edit Contact</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Full name</Label>
            <Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Role/title</Label>
              <Input value={form.role_title || ''} onChange={e => setForm(f => ({ ...f, role_title: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Company</Label>
              <Input value={form.company || ''} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Relationship strength</Label>
            <Select value={form.relationship_strength || 'cold'} onValueChange={v => setForm(f => ({ ...f, relationship_strength: v as any }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cold">Cold</SelectItem>
                <SelectItem value="warm">Warm</SelectItem>
                <SelectItem value="strong">Strong</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
