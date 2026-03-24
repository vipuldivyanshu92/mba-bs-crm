import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { format } from 'date-fns';
import type { Tables } from '@/integrations/supabase/types';

type Contact = Tables<'contacts'>;

const MEETING_TYPES = [
  { value: 'coffee_chat', label: 'Coffee Chat' },
  { value: 'info_interview', label: 'Info Interview' },
  { value: 'networking_event', label: 'Networking Event' },
  { value: 'class_project', label: 'Class Project' },
  { value: 'alumni_call', label: 'Alumni Call' },
] as const;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  prefillContactId?: string;
}

export function LogMeetingDialog({ open, onOpenChange, prefillContactId }: Props) {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Pick<Contact, 'id' | 'full_name' | 'company'>[]>([]);
  const [contactId, setContactId] = useState(prefillContactId || '');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [meetingType, setMeetingType] = useState<string>('coffee_chat');
  const [rawNotes, setRawNotes] = useState('');
  const [keyTakeaways, setKeyTakeaways] = useState('');
  const [promisedNextSteps, setPromisedNextSteps] = useState('');
  const [followupDate, setFollowupDate] = useState('');
  const [sentThankYou, setSentThankYou] = useState(false);
  const [saving, setSaving] = useState(false);
  const [summarizing, setSummarizing] = useState(false);

  useEffect(() => {
    if (!user || !open) return;
    supabase.from('contacts').select('id, full_name, company').eq('user_id', user.id).order('full_name').then(({ data }) => {
      setContacts(data || []);
    });
  }, [user, open]);

  useEffect(() => {
    if (prefillContactId) setContactId(prefillContactId);
  }, [prefillContactId]);

  const handleSummarize = async () => {
    if (!rawNotes.trim()) { toast.error('Enter some notes first'); return; }
    setSummarizing(true);
    try {
      const { data, error } = await supabase.functions.invoke('summarize-notes', {
        body: { notes: rawNotes, meetingType },
      });
      if (error) throw error;
      if (data?.summary) {
        const summary = data.summary;
        if (summary.key_takeaways) setKeyTakeaways(summary.key_takeaways);
        if (summary.next_steps) setPromisedNextSteps(summary.next_steps);
        toast.success('Notes summarized with AI!');
      }
    } catch (err: any) {
      toast.error('Could not summarize: ' + (err.message || 'Unknown error'));
    } finally {
      setSummarizing(false);
    }
  };

  const handleSubmit = async () => {
    if (!contactId || !date || !meetingType) {
      toast.error('Please fill in all required fields');
      return;
    }
    setSaving(true);
    try {
      // Insert meeting
      const { error: meetingError } = await supabase.from('meetings').insert({
        user_id: user!.id,
        contact_id: contactId,
        date,
        meeting_type: meetingType as any,
        raw_notes: rawNotes,
        key_takeaways: keyTakeaways,
        promised_next_steps: promisedNextSteps,
        followup_date: followupDate || null,
        sent_thank_you: sentThankYou,
      });
      if (meetingError) throw meetingError;

      // Update contact's last interaction date
      await supabase.from('contacts').update({
        last_interaction_date: date,
        next_followup_date: followupDate || null,
      }).eq('id', contactId);

      // Create follow-up if date specified
      if (followupDate) {
        await supabase.from('follow_ups').insert({
          user_id: user!.id,
          contact_id: contactId,
          due_date: followupDate,
          description: promisedNextSteps || 'Follow up after meeting',
        });
      }

      toast.success('Meeting logged successfully! 🎉');
      onOpenChange(false);
      resetForm();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setContactId('');
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setMeetingType('coffee_chat');
    setRawNotes('');
    setKeyTakeaways('');
    setPromisedNextSteps('');
    setFollowupDate('');
    setSentThankYou(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log Meeting</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 col-span-2">
              <Label>Contact *</Label>
              <Select value={contactId} onValueChange={setContactId}>
                <SelectTrigger><SelectValue placeholder="Select contact" /></SelectTrigger>
                <SelectContent>
                  {contacts.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.full_name}{c.company ? ` (${c.company})` : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Date *</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Meeting type *</Label>
              <Select value={meetingType} onValueChange={setMeetingType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MEETING_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Raw notes</Label>
              <Button type="button" variant="outline" size="sm" onClick={handleSummarize} disabled={summarizing || !rawNotes.trim()} className="text-xs">
                {summarizing ? 'Summarizing...' : '✨ Summarize with AI'}
              </Button>
            </div>
            <Textarea value={rawNotes} onChange={e => setRawNotes(e.target.value)} rows={4} placeholder="Type your meeting notes here..." />
          </div>

          <div className="space-y-1.5">
            <Label>Key takeaways</Label>
            <Textarea value={keyTakeaways} onChange={e => setKeyTakeaways(e.target.value)} rows={2} placeholder="Main things you learned..." />
          </div>

          <div className="space-y-1.5">
            <Label>Promised next steps</Label>
            <Input value={promisedNextSteps} onChange={e => setPromisedNextSteps(e.target.value)} placeholder="What did you promise to do?" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Follow-up date</Label>
              <Input type="date" value={followupDate} onChange={e => setFollowupDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Sent thank-you note?</Label>
              <div className="flex items-center gap-2 pt-1.5">
                <Switch checked={sentThankYou} onCheckedChange={setSentThankYou} />
                <span className="text-sm text-muted-foreground">{sentThankYou ? 'Yes' : 'No'}</span>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving}>{saving ? 'Saving...' : 'Log Meeting'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
