import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check, Clock, User, MessageSquare, AlertTriangle } from 'lucide-react';
import { format, isToday, isBefore, startOfToday, addDays, isWithinInterval } from 'date-fns';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

type FollowUp = Tables<'follow_ups'> & { contacts?: { full_name: string; company: string | null; id: string } | null };

export default function Reminders() {
  const { user } = useAuth();
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFollowUps = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('follow_ups')
      .select('*, contacts(id, full_name, company)')
      .eq('user_id', user.id)
      .order('due_date', { ascending: true });
    setFollowUps((data as FollowUp[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchFollowUps(); }, [user]);

  const today = startOfToday();
  const overdue = followUps.filter(f => f.status === 'pending' && isBefore(new Date(f.due_date), today));
  const dueToday = followUps.filter(f => f.status === 'pending' && isToday(new Date(f.due_date)));
  const dueThisWeek = followUps.filter(f => f.status === 'pending' && isWithinInterval(new Date(f.due_date), { start: addDays(today, 1), end: addDays(today, 7) }));
  const completed = followUps.filter(f => f.status === 'completed');

  const markComplete = async (id: string) => {
    await supabase.from('follow_ups').update({ status: 'completed', completed_at: new Date().toISOString() } as any).eq('id', id);
    toast.success('Follow-up completed! ✅');
    fetchFollowUps();
  };

  const snooze = async (id: string, days: number) => {
    const newDate = format(addDays(new Date(), days), 'yyyy-MM-dd');
    await supabase.from('follow_ups').update({ due_date: newDate, snoozed_until: newDate } as any).eq('id', id);
    toast.success(`Snoozed for ${days} day${days > 1 ? 's' : ''}`);
    fetchFollowUps();
  };

  if (loading) return <div className="text-center py-12 text-muted-foreground">Loading reminders...</div>;

  const FollowUpItem = ({ f, showOverdue = false }: { f: FollowUp; showOverdue?: boolean }) => (
    <Card className="border-border/50">
      <CardContent className="flex items-center gap-4 p-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Link to={`/contacts/${f.contacts?.id}`} className="text-sm font-medium text-foreground hover:text-accent">
              {f.contacts?.full_name}
            </Link>
            {f.contacts?.company && <Badge variant="outline" className="text-xs">{f.contacts.company}</Badge>}
            {showOverdue && <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-xs">Overdue</Badge>}
          </div>
          <p className="text-xs text-muted-foreground mt-1">{f.description || 'Follow up'}</p>
          <p className="text-xs text-muted-foreground">Due: {format(new Date(f.due_date), 'MMM d, yyyy')}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button variant="outline" size="sm" onClick={() => markComplete(f.id)} className="gap-1 text-xs">
            <Check className="w-3 h-3" /> Done
          </Button>
          <Button variant="ghost" size="sm" onClick={() => snooze(f.id, 3)} className="gap-1 text-xs">
            <Clock className="w-3 h-3" /> +3d
          </Button>
          <Button variant="ghost" size="sm" onClick={() => snooze(f.id, 7)} className="gap-1 text-xs">
            +7d
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Reminders</h1>
        <p className="text-sm text-muted-foreground mt-1">Stay on top of your follow-ups</p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Overdue', count: overdue.length, color: 'text-destructive', icon: AlertTriangle },
          { label: 'Due Today', count: dueToday.length, color: 'text-warning', icon: Clock },
          { label: 'This Week', count: dueThisWeek.length, color: 'text-accent', icon: Clock },
          { label: 'Completed', count: completed.length, color: 'text-success', icon: Check },
        ].map(s => (
          <Card key={s.label} className="border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className={`w-5 h-5 ${s.color}`} />
              <div>
                <p className="text-lg font-semibold">{s.count}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending ({overdue.length + dueToday.length + dueThisWeek.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completed.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="space-y-3 mt-4">
          {overdue.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-destructive flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" /> Overdue
              </h3>
              {overdue.map(f => <FollowUpItem key={f.id} f={f} showOverdue />)}
            </div>
          )}
          {dueToday.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-foreground">Due Today</h3>
              {dueToday.map(f => <FollowUpItem key={f.id} f={f} />)}
            </div>
          )}
          {dueThisWeek.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-foreground">Due This Week</h3>
              {dueThisWeek.map(f => <FollowUpItem key={f.id} f={f} />)}
            </div>
          )}
          {overdue.length === 0 && dueToday.length === 0 && dueThisWeek.length === 0 && (
            <Card className="border-border/50">
              <CardContent className="py-12 text-center">
                <Check className="w-12 h-12 text-success mx-auto mb-3" />
                <h3 className="text-lg font-medium">All caught up!</h3>
                <p className="text-sm text-muted-foreground mt-1">No pending follow-ups right now.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        <TabsContent value="completed" className="space-y-3 mt-4">
          {completed.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="py-8 text-center text-muted-foreground">No completed follow-ups yet.</CardContent>
            </Card>
          ) : (
            completed.map(f => (
              <Card key={f.id} className="border-border/50 opacity-60">
                <CardContent className="flex items-center gap-4 p-4">
                  <Check className="w-4 h-4 text-success shrink-0" />
                  <div>
                    <p className="text-sm font-medium line-through">{f.contacts?.full_name}</p>
                    <p className="text-xs text-muted-foreground">{f.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
