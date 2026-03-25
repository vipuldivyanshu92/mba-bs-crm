import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

import { Copy, Check } from 'lucide-react';

const INDUSTRIES = ['Consulting', 'Finance', 'Tech', 'Healthcare', 'Consumer Goods', 'Energy', 'Real Estate', 'Private Equity', 'Venture Capital'];

export default function Settings() {
  const { user, profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState('');
  const [school, setSchool] = useState('');
  const [gradYear, setGradYear] = useState('2026');
  const [industries, setIndustries] = useState<string[]>([]);
  const [companies, setCompanies] = useState('');
  const [saving, setSaving] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  const webhookUrl = user ? `${import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/otter-webhook?user_id=${user.id}` : '';

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
    toast.success('Webhook URL copied');
  };

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setSchool(profile.school || '');
      setGradYear(String(profile.graduation_year || 2026));
      setIndustries(profile.target_industries || []);
      setCompanies((profile.target_companies || []).join(', '));
    }
  }, [profile]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('profiles').update({
      full_name: fullName,
      school,
      graduation_year: parseInt(gradYear),
      target_industries: industries,
      target_companies: companies.split(',').map(c => c.trim()).filter(Boolean),
    }).eq('id', user.id);
    if (error) { toast.error(error.message); setSaving(false); return; }
    await refreshProfile();
    toast.success('Profile updated!');
    setSaving(false);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your profile and preferences</p>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
          <CardDescription>Your personal and MBA information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Full name</Label>
            <Input value={fullName} onChange={e => setFullName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>School</Label>
              <Input value={school} onChange={e => setSchool(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Graduation year</Label>
              <Select value={gradYear} onValueChange={setGradYear}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['2025', '2026', '2027', '2028'].map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Target industries</Label>
            <div className="flex flex-wrap gap-2">
              {INDUSTRIES.map(ind => (
                <Badge
                  key={ind}
                  variant={industries.includes(ind) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => setIndustries(prev => prev.includes(ind) ? prev.filter(i => i !== ind) : [...prev, ind])}
                >
                  {ind}
                </Badge>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Target companies (comma-separated)</Label>
            <Input value={companies} onChange={e => setCompanies(e.target.value)} />
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save changes'}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
          <CardDescription>Email: {user?.email}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Signed in as {user?.email}</p>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Integrations</CardTitle>
          <CardDescription>Automate workflows (e.g., Otter.ai Sync)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Use this webhook URL in <b>Zapier</b> or <b>Make.com</b> to automatically sync your transcriptions to your CRM.
            Set up a trigger for "New Note" and a POST action to this URL with the payload:<br/>
            <code className="bg-muted p-1 text-xs rounded mt-2 inline-block">{"{"} "transcript": "..." {"}"}</code>
          </p>
          <div className="flex gap-2 items-center">
            <Input readOnly value={webhookUrl} className="font-mono text-xs" />
            <Button variant="outline" size="sm" onClick={handleCopyWebhook} className="gap-1.5 whitespace-nowrap">
              {copiedWebhook ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedWebhook ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
