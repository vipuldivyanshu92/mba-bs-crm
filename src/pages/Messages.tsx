import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Copy, Plus, MessageSquare, Sparkles, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

type DraftedMessage = Tables<'drafted_messages'> & { contacts?: { full_name: string; company: string | null } | null };
type Contact = Tables<'contacts'>;

const MESSAGE_TYPE_LABELS: Record<string, string> = {
  thank_you: 'Thank You',
  follow_up: 'Follow Up',
  check_in: 'Check In',
  alumni_outreach: 'Alumni Outreach',
};

export default function Messages() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<DraftedMessage[]>([]);
  const [draftOpen, setDraftOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchMessages = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('drafted_messages')
      .select('*, contacts(full_name, company)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setMessages((data as DraftedMessage[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchMessages(); }, [user]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const deleteMessage = async (id: string) => {
    await supabase.from('drafted_messages').delete().eq('id', id);
    toast.success('Message deleted');
    fetchMessages();
  };

  if (loading) return <div className="text-center py-12 text-muted-foreground">Loading messages...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Message Drafts</h1>
          <p className="text-sm text-muted-foreground mt-1">AI-drafted messages ready to send</p>
        </div>
        <Button onClick={() => setDraftOpen(true)} className="gap-2">
          <Sparkles className="w-4 h-4" /> Draft Message
        </Button>
      </div>

      {messages.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="py-16 text-center">
            <MessageSquare className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
            <h3 className="text-lg font-medium">No drafts yet</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">Use AI to draft thank-you emails, follow-ups, and outreach messages.</p>
            <Button onClick={() => setDraftOpen(true)} variant="outline" className="gap-2">
              <Sparkles className="w-4 h-4" /> Draft your first message
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {messages.map(m => (
            <Card key={m.id} className="border-border/50">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{MESSAGE_TYPE_LABELS[m.message_type]}</Badge>
                    {m.contacts && (
                      <span className="text-sm text-muted-foreground">
                        to {m.contacts.full_name}{m.contacts.company ? ` (${m.contacts.company})` : ''}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">{format(new Date(m.created_at), 'MMM d, yyyy')}</span>
                </div>
                {m.subject && <p className="text-sm font-medium text-foreground mb-2">Subject: {m.subject}</p>}
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{m.content}</p>
                <div className="flex items-center gap-2 mt-4">
                  <Button variant="outline" size="sm" onClick={() => copyToClipboard(m.content)} className="gap-1.5 text-xs">
                    <Copy className="w-3 h-3" /> Copy
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => deleteMessage(m.id)} className="text-destructive text-xs gap-1.5">
                    <Trash2 className="w-3 h-3" /> Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <DraftMessageDialog open={draftOpen} onOpenChange={setDraftOpen} userId={user?.id || ''} onDrafted={fetchMessages} />
    </div>
  );
}

function DraftMessageDialog({ open, onOpenChange, userId, onDrafted }: { open: boolean; onOpenChange: (v: boolean) => void; userId: string; onDrafted: () => void }) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactId, setContactId] = useState('');
  const [messageType, setMessageType] = useState('thank_you');
  const [context, setContext] = useState('');
  const [draft, setDraft] = useState('');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    supabase.from('contacts').select('*').eq('user_id', userId).order('full_name').then(({ data }) => {
      setContacts(data || []);
    });
  }, [open, userId]);

  const generateDraft = async () => {
    if (!contactId) { toast.error('Select a contact'); return; }
    setGenerating(true);
    try {
      const contact = contacts.find(c => c.id === contactId);
      const { data, error } = await supabase.functions.invoke('draft-message', {
        body: {
          contactName: contact?.full_name,
          contactCompany: contact?.company,
          contactRole: contact?.role_title,
          messageType,
          context,
        },
      });
      if (error) throw error;
      setDraft(data?.message || 'Could not generate draft');
      toast.success('Draft generated!');
    } catch (err: any) {
      toast.error('Failed to generate: ' + (err.message || 'Unknown error'));
    } finally {
      setGenerating(false);
    }
  };

  const saveDraft = async () => {
    if (!draft.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('drafted_messages').insert({
      user_id: userId,
      contact_id: contactId || null,
      message_type: messageType as any,
      content: draft,
    });
    if (error) { toast.error(error.message); setSaving(false); return; }
    toast.success('Draft saved!');
    onOpenChange(false);
    setDraft(''); setContactId(''); setContext('');
    setSaving(false);
    onDrafted();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-accent" /> Draft Message</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Contact</Label>
            <Select value={contactId} onValueChange={setContactId}>
              <SelectTrigger><SelectValue placeholder="Select contact" /></SelectTrigger>
              <SelectContent>
                {contacts.map(c => <SelectItem key={c.id} value={c.id}>{c.full_name}{c.company ? ` (${c.company})` : ''}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Message type</Label>
            <Select value={messageType} onValueChange={setMessageType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(MESSAGE_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Context (optional)</Label>
            <Textarea value={context} onChange={e => setContext(e.target.value)} rows={2} placeholder="Any specific details to include..." />
          </div>
          <Button onClick={generateDraft} disabled={generating} className="w-full gap-2">
            <Sparkles className="w-4 h-4" />
            {generating ? 'Generating...' : 'Generate Draft'}
          </Button>
          {draft && (
            <div className="space-y-1.5">
              <Label>Draft (editable)</Label>
              <Textarea value={draft} onChange={e => setDraft(e.target.value)} rows={8} className="text-sm leading-relaxed" />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          {draft && (
            <>
              <Button variant="outline" onClick={() => { navigator.clipboard.writeText(draft); toast.success('Copied!'); }} className="gap-1.5">
                <Copy className="w-3 h-3" /> Copy
              </Button>
              <Button onClick={saveDraft} disabled={saving}>{saving ? 'Saving...' : 'Save Draft'}</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
