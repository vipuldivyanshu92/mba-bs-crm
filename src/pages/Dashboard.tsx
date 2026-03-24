import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Building2, Bell, Calendar, Plus, ArrowRight, CheckCircle2 } from 'lucide-react';
import { format, isToday, isBefore, startOfToday, addDays, isWithinInterval } from 'date-fns';
import type { Tables } from '@/integrations/supabase/types';

type Contact = Tables<'contacts'>;
type FollowUp = Tables<'follow_ups'> & { contacts?: { full_name: string; company: string | null } | null };
type Company = Tables<'companies'>;

export default function Dashboard() {
  const { user, profile } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contactCount, setContactCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [contactsRes, followUpsRes, companiesRes] = await Promise.all([
        supabase.from('contacts').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(5),
        supabase.from('follow_ups').select('*, contacts(full_name, company)').eq('user_id', user.id).eq('status', 'pending').order('due_date', { ascending: true }).limit(10),
        supabase.from('companies').select('*').eq('user_id', user.id),
      ]);
      setContacts(contactsRes.data || []);
      setFollowUps((followUpsRes.data as FollowUp[]) || []);
      setCompanies(companiesRes.data || []);
      setContactCount(contactsRes.data?.length || 0);
      setLoading(false);
    };
    load();
  }, [user]);

  const today = startOfToday();
  const todayFollowUps = followUps.filter(f => isToday(new Date(f.due_date)));
  const overdueFollowUps = followUps.filter(f => isBefore(new Date(f.due_date), today));
  const weekFollowUps = followUps.filter(f => isWithinInterval(new Date(f.due_date), { start: today, end: addDays(today, 7) }));

  const strengthColor = (s: string | null) => {
    if (s === 'strong') return 'bg-success/10 text-success border-success/20';
    if (s === 'warm') return 'bg-warning/10 text-warning border-warning/20';
    return 'bg-muted text-muted-foreground';
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-pulse text-muted-foreground">Loading dashboard...</div></div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {profile?.full_name?.split(' ')[0] || 'there'}
        </h1>
        <p className="text-muted-foreground mt-1">Here's what's happening with your network.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Contacts', value: contactCount, icon: Users, color: 'text-accent' },
          { label: 'Companies Tracked', value: companies.length, icon: Building2, color: 'text-primary' },
          { label: 'Due This Week', value: weekFollowUps.length, icon: Bell, color: 'text-warning' },
          { label: 'Overdue', value: overdueFollowUps.length, icon: Calendar, color: 'text-destructive' },
        ].map(stat => (
          <Card key={stat.label} className="border-border/50">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <p className="text-2xl font-semibold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Today's Follow-ups */}
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold">Today's Follow-ups</CardTitle>
            <Link to="/reminders" className="text-xs text-accent hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {todayFollowUps.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <CheckCircle2 className="w-4 h-4 text-success" />
                You're all caught up for today!
              </div>
            ) : (
              todayFollowUps.map(f => (
                <div key={f.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="text-sm font-medium text-foreground">{f.contacts?.full_name}</p>
                    <p className="text-xs text-muted-foreground">{f.description || 'Follow up'}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">{f.contacts?.company}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent Contacts */}
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold">Recent Contacts</CardTitle>
            <Link to="/contacts" className="text-xs text-accent hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {contacts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No contacts yet. Start by logging a meeting!</p>
            ) : (
              contacts.slice(0, 4).map(c => (
                <Link key={c.id} to={`/contacts/${c.id}`} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                      {c.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{c.full_name}</p>
                      <p className="text-xs text-muted-foreground">{c.role_title}{c.company ? ` at ${c.company}` : ''}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className={`text-xs ${strengthColor(c.relationship_strength)}`}>
                    {c.relationship_strength}
                  </Badge>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Summary */}
      <Card className="border-border/50">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base font-semibold">Recruiting Pipeline</CardTitle>
          <Link to="/companies" className="text-xs text-accent hover:underline flex items-center gap-1">
            View pipeline <ArrowRight className="w-3 h-3" />
          </Link>
        </CardHeader>
        <CardContent>
          {companies.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No companies in your pipeline yet.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {['interested', 'reached_out', 'applied', 'interviewing'].map(stage => {
                const count = companies.filter(c => c.stage === stage).length;
                return (
                  <div key={stage} className="p-3 rounded-lg bg-muted/50 text-center">
                    <p className="text-lg font-semibold text-foreground">{count}</p>
                    <p className="text-xs text-muted-foreground capitalize">{stage.replace('_', ' ')}</p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
