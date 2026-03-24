import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, Check, Copy, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { addDays, format } from 'date-fns';
import type { Tables } from '@/integrations/supabase/types';

type Contact = Tables<'contacts'>;

const MEETING_TYPE_LABELS: Record<string, string> = {
  coffee_chat: 'Coffee Chat',
  info_interview: 'Info Interview',
  networking_event: 'Networking Event',
  class_project: 'Class Project',
  alumni_call: 'Alumni Call',
};

type ProcessedResult = {
  attendee_name: string;
  attendee_company: string;
  attendee_role: string;
  meeting_type: string;
  key_takeaways: string;
  next_steps: string;
  email_subject: string;
  email_body: string;
};

export default function GranolaSync() {
  const { user } = useAuth();
  const [transcript, setTranscript] = useState('');
  const [userContext, setUserContext] = useState('');
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);

  // Processed result fields (editable)
  const [result, setResult] = useState<ProcessedResult | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<string>('new');
  const [meetingDate, setMeetingDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    if (!user) return;
    supabase.from('contacts').select('*').eq('user_id', user.id).order('full_name')
      .then(({ data }) => setContacts(data || []));
  }, [user]);

  // Auto-match contact when result comes back
  useEffect(() => {
    if (!result) return;
    const name = result.attendee_name.toLowerCase();
    const match = contacts.find(c =>
      c.full_name.toLowerCase() === name ||
      c.full_name.toLowerCase().includes(name) ||
      name.includes(c.full_name.toLowerCase())
    );
    setSelectedContactId(match ? match.id : 'new');
  }, [result, contacts]);

  const handleProcess = async () => {
    if (!transcript.trim()) { toast.error('Paste a transcript first'); return; }
    setProcessing(true);
    setResult(null);
    setSaved(false);

    try {
      const { data, error } = await supabase.functions.invoke('process-granola-transcript', {
        body: { transcript, userContext: userContext || undefined },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      setResult(data.result);
    } catch (e: any) {
      toast.error(e.message || 'Failed to process transcript');
    } finally {
      setProcessing(false);
    }
  };

  const handleSave = async () => {
    if (!user || !result) return;
    setSaving(true);

    try {
      let contactId = selectedContactId;

      // Create new contact if needed
      if (contactId === 'new') {
        const { data: newContact, error: contactErr } = await supabase.from('contacts').insert({
          user_id: user.id,
          full_name: result.attendee_name,
          company: result.attendee_company || null,
          role_title: result.attendee_role || null,
          relationship_strength: 'warm',
          last_interaction_date: meetingDate,
        }).select().single();
        if (contactErr) throw contactErr;
        contactId = newContact.id;
        setContacts(prev => [...prev, newContact].sort((a, b) => a.full_name.localeCompare(b.full_name)));
      } else {
        // Update existing contact's last interaction date
        await supabase.from('contacts').update({ last_interaction_date: meetingDate }).eq('id', contactId);
      }

      // Insert meeting
      const { error: meetingErr } = await supabase.from('meetings').insert({
        user_id: user.id,
        contact_id: contactId,
        date: meetingDate,
        meeting_type: result.meeting_type as any,
        key_takeaways: result.key_takeaways,
        promised_next_steps: result.next_steps,
        transcript,
        source: 'granola',
        sent_thank_you: false,
        followup_date: format(addDays(new Date(meetingDate), 3), 'yyyy-MM-dd'),
      });
      if (meetingErr) throw meetingErr;

      // Create follow-up reminder
      await supabase.from('follow_ups').insert({
        user_id: user.id,
        contact_id: contactId,
        due_date: format(addDays(new Date(meetingDate), 3), 'yyyy-MM-dd'),
        description: `Send follow-up to ${result.attendee_name}`,
        status: 'pending',
      });

      // Save drafted email
      await supabase.from('drafted_messages').insert({
        user_id: user.id,
        contact_id: contactId,
        message_type: 'follow_up',
        subject: result.email_subject,
        content: result.email_body,
      });

      setSaved(true);
      toast.success('Meeting logged, follow-up created, and email drafted');
    } catch (e: any) {
      toast.error(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyEmail = () => {
    if (!result) return;
    const full = result.email_subject
      ? `Subject: ${result.email_subject}\n\n${result.email_body}`
      : result.email_body;
    navigator.clipboard.writeText(full);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setTranscript('');
    setUserContext('');
    setResult(null);
    setSaved(false);
    setSelectedContactId('new');
    setMeetingDate(format(new Date(), 'yyyy-MM-dd'));
    setShowTranscript(false);
  };

  const updateResult = (field: keyof ProcessedResult, value: string) => {
    if (!result) return;
    setResult({ ...result, [field]: value });
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Granola Sync</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Paste a meeting transcript. We'll extract the details and draft a follow-up.
        </p>
      </div>

      {/* Step 1: Paste transcript */}
      {!result && (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Meeting Transcript</CardTitle>
            <CardDescription>Copy the transcript from Granola and paste it below</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={transcript}
              onChange={e => setTranscript(e.target.value)}
              placeholder="Paste your Granola transcript here..."
              rows={12}
              className="font-mono text-sm"
            />
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">Context (optional)</Label>
              <Input
                value={userContext}
                onChange={e => setUserContext(e.target.value)}
                placeholder='e.g., "recruiting coffee chat for summer internship"'
              />
            </div>
            <Button onClick={handleProcess} disabled={processing || !transcript.trim()} className="gap-2">
              {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {processing ? 'Processing...' : 'Process Transcript'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Review & edit extracted details */}
      {result && !saved && (
        <>
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Meeting Details</CardTitle>
              <CardDescription>Review and edit before saving</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Contact</Label>
                  <Select value={selectedContactId} onValueChange={setSelectedContactId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">
                        + New: {result.attendee_name}
                        {result.attendee_company ? ` (${result.attendee_company})` : ''}
                      </SelectItem>
                      {contacts.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.full_name}{c.company ? ` (${c.company})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Date</Label>
                  <Input type="date" value={meetingDate} onChange={e => setMeetingDate(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Meeting Type</Label>
                  <Select value={result.meeting_type} onValueChange={v => updateResult('meeting_type', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(MEETING_TYPE_LABELS).map(([val, label]) => (
                        <SelectItem key={val} value={val}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Attendee Role</Label>
                  <Input
                    value={result.attendee_role}
                    onChange={e => updateResult('attendee_role', e.target.value)}
                    placeholder="Role/title"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Key Takeaways</Label>
                <Textarea
                  value={result.key_takeaways}
                  onChange={e => updateResult('key_takeaways', e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Next Steps</Label>
                <Textarea
                  value={result.next_steps}
                  onChange={e => updateResult('next_steps', e.target.value)}
                  rows={2}
                />
              </div>

              {/* Collapsible transcript */}
              <button
                onClick={() => setShowTranscript(!showTranscript)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {showTranscript ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {showTranscript ? 'Hide transcript' : 'Show original transcript'}
              </button>
              {showTranscript && (
                <div className="p-3 rounded-lg bg-muted/50 text-xs font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {transcript}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Follow-up email */}
          <Card className="border-border/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Follow-up Email</CardTitle>
                  <CardDescription>Edit if needed, then save or copy</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={handleCopyEmail} className="gap-1.5">
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-muted-foreground">Subject</Label>
                <Input
                  value={result.email_subject}
                  onChange={e => updateResult('email_subject', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground">Body</Label>
                <Textarea
                  value={result.email_body}
                  onChange={e => updateResult('email_body', e.target.value)}
                  rows={6}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {saving ? 'Saving...' : 'Save Meeting & Draft Email'}
            </Button>
            <Button variant="outline" onClick={handleReset}>Start Over</Button>
          </div>
        </>
      )}

      {/* Step 3: Saved confirmation */}
      {saved && (
        <Card className="border-success/30 bg-success/5">
          <CardContent className="py-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mx-auto">
              <Check className="w-6 h-6 text-success" />
            </div>
            <div>
              <p className="text-lg font-medium text-foreground">All set</p>
              <p className="text-sm text-muted-foreground mt-1">
                Meeting logged, follow-up reminder created for {format(addDays(new Date(meetingDate), 3), 'MMM d')}, and email draft saved.
              </p>
            </div>
            <div className="flex justify-center gap-3">
              <Button variant="outline" size="sm" onClick={handleCopyEmail} className="gap-1.5">
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy Email'}
              </Button>
              <Button size="sm" onClick={handleReset}>Sync Another</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
