import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Building2, ChevronRight, Users, StickyNote, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

type Company = Tables<'companies'>;
type Contact = Tables<'contacts'>;

const STAGES = [
  { value: 'interested', label: 'Interested', color: 'bg-muted text-muted-foreground' },
  { value: 'reached_out', label: 'Reached Out', color: 'bg-accent/10 text-accent' },
  { value: 'coffee_chat_completed', label: 'Coffee Chat', color: 'bg-accent/20 text-accent' },
  { value: 'applied', label: 'Applied', color: 'bg-primary/10 text-primary' },
  { value: 'interviewing', label: 'Interviewing', color: 'bg-warning/10 text-warning' },
  { value: 'offer', label: 'Offer', color: 'bg-success/10 text-success' },
  { value: 'closed', label: 'Closed', color: 'bg-destructive/10 text-destructive' },
] as const;

export default function Companies() {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [detailCompany, setDetailCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!user) return;
    const [cRes, contactsRes] = await Promise.all([
      supabase.from('companies').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('contacts').select('*').eq('user_id', user.id),
    ]);
    setCompanies(cRes.data || []);
    setContacts(contactsRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  const updateStage = async (companyId: string, stage: string) => {
    await supabase.from('companies').update({ stage: stage as any }).eq('id', companyId);
    fetchData();
  };

  const deleteCompany = async (id: string) => {
    if (!confirm('Delete this company?')) return;
    await supabase.from('companies').delete().eq('id', id);
    toast.success('Company removed');
    setDetailCompany(null);
    fetchData();
  };

  if (loading) return <div className="text-center py-12 text-muted-foreground">Loading pipeline...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Recruiting Pipeline</h1>
          <p className="text-sm text-muted-foreground mt-1">Track your progress across companies</p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Add Company
        </Button>
      </div>

      {/* Pipeline board */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max">
          {STAGES.map(stage => {
            const stageCompanies = companies.filter(c => c.stage === stage.value);
            return (
              <div key={stage.value} className="w-56 shrink-0">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-foreground">{stage.label}</h3>
                  <Badge variant="outline" className="text-xs">{stageCompanies.length}</Badge>
                </div>
                <div className="space-y-2">
                  {stageCompanies.map(company => {
                    const companyContacts = contacts.filter(c => c.company?.toLowerCase() === company.name.toLowerCase());
                    return (
                      <Card key={company.id} className="border-border/50 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setDetailCompany(company)}>
                        <CardContent className="p-3">
                          <p className="text-sm font-medium text-foreground">{company.name}</p>
                          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                            <Users className="w-3 h-3" />
                            <span>{companyContacts.length} contacts</span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                  {stageCompanies.length === 0 && (
                    <div className="p-4 rounded-lg border border-dashed border-border text-center text-xs text-muted-foreground">
                      No companies
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Company Dialog */}
      <AddCompanyDialog open={addOpen} onOpenChange={setAddOpen} userId={user?.id || ''} onAdded={fetchData} />

      {/* Company Detail Dialog */}
      {detailCompany && (
        <Dialog open={!!detailCompany} onOpenChange={() => setDetailCompany(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                {detailCompany.name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Stage</Label>
                <Select value={detailCompany.stage || 'interested'} onValueChange={v => updateStage(detailCompany.id, v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STAGES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {detailCompany.why_interested && (
                <div>
                  <Label className="text-muted-foreground">Why interested</Label>
                  <p className="text-sm mt-1">{detailCompany.why_interested}</p>
                </div>
              )}
              {detailCompany.interview_timeline && (
                <div>
                  <Label className="text-muted-foreground">Interview timeline</Label>
                  <p className="text-sm mt-1">{detailCompany.interview_timeline}</p>
                </div>
              )}
              {detailCompany.notes && (
                <div>
                  <Label className="text-muted-foreground">Notes</Label>
                  <p className="text-sm mt-1">{detailCompany.notes}</p>
                </div>
              )}
              <div>
                <Label className="text-muted-foreground">Contacts at {detailCompany.name}</Label>
                <div className="mt-2 space-y-2">
                  {contacts.filter(c => c.company?.toLowerCase() === detailCompany.name.toLowerCase()).map(c => (
                    <div key={c.id} className="flex items-center gap-2 p-2 rounded bg-muted/50 text-sm">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                        {c.full_name[0]}
                      </div>
                      {c.full_name} — {c.role_title}
                    </div>
                  ))}
                  {contacts.filter(c => c.company?.toLowerCase() === detailCompany.name.toLowerCase()).length === 0 && (
                    <p className="text-xs text-muted-foreground">No contacts yet</p>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => deleteCompany(detailCompany.id)} className="text-destructive gap-1">
                <Trash2 className="w-3 h-3" /> Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function AddCompanyDialog({ open, onOpenChange, userId, onAdded }: { open: boolean; onOpenChange: (v: boolean) => void; userId: string; onAdded: () => void }) {
  const [name, setName] = useState('');
  const [stage, setStage] = useState('interested');
  const [whyInterested, setWhyInterested] = useState('');
  const [timeline, setTimeline] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Company name is required'); return; }
    setSaving(true);
    const { error } = await supabase.from('companies').insert({
      user_id: userId,
      name,
      stage: stage as any,
      why_interested: whyInterested || null,
      interview_timeline: timeline || null,
    });
    if (error) { toast.error(error.message); setSaving(false); return; }
    toast.success('Company added!');
    onOpenChange(false);
    setName(''); setStage('interested'); setWhyInterested(''); setTimeline('');
    setSaving(false);
    onAdded();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add Company</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Company name *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="McKinsey & Company" />
          </div>
          <div className="space-y-1.5">
            <Label>Stage</Label>
            <Select value={stage} onValueChange={setStage}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STAGES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Why interested?</Label>
            <Textarea value={whyInterested} onChange={e => setWhyInterested(e.target.value)} rows={2} placeholder="Culture, growth opportunities..." />
          </div>
          <div className="space-y-1.5">
            <Label>Interview timeline</Label>
            <Input value={timeline} onChange={e => setTimeline(e.target.value)} placeholder="Applications open Sept 2026" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Add Company'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
