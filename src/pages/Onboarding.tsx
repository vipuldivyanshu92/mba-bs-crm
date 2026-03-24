import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Flame, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

const INDUSTRIES = ['Consulting', 'Finance', 'Tech', 'Healthcare', 'Consumer Goods', 'Energy', 'Real Estate', 'Private Equity', 'Venture Capital'];
const SCHOOLS = ['Harvard Business School', 'Stanford GSB', 'Wharton', 'Kellogg', 'Booth', 'Columbia Business School', 'Tuck', 'Ross', 'Fuqua', 'Darden', 'Yale SOM', 'Haas', 'Stern', 'Anderson', 'Sloan', 'Other'];

export default function Onboarding() {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [school, setSchool] = useState('');
  const [gradYear, setGradYear] = useState('2026');
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [targetCompanies, setTargetCompanies] = useState('');
  const [loading, setLoading] = useState(false);

  const toggleIndustry = (ind: string) => {
    setSelectedIndustries(prev =>
      prev.includes(ind) ? prev.filter(i => i !== ind) : [...prev, ind]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const companies = targetCompanies.split(',').map(c => c.trim()).filter(Boolean);
      const { error } = await supabase
        .from('profiles')
        .update({
          school,
          graduation_year: parseInt(gradYear),
          target_industries: selectedIndustries,
          target_companies: companies,
          onboarding_completed: true,
        })
        .eq('id', user.id);
      if (error) throw error;
      await refreshProfile();
      toast.success('Welcome to WarmIntro! 🎉');
      navigate('/');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2.5 mb-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary">
              <Flame className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold text-foreground tracking-tight">WarmIntro</span>
          </div>
          <h1 className="text-2xl font-semibold">Let's set up your profile</h1>
          <p className="text-muted-foreground text-sm">This helps us personalize your networking experience.</p>
        </div>

        <Card className="shadow-lg border-border/50">
          <CardHeader>
            <CardTitle>Your MBA details</CardTitle>
            <CardDescription>Tell us about your program and recruiting goals.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label>School</Label>
                <Select value={school} onValueChange={setSchool}>
                  <SelectTrigger><SelectValue placeholder="Select your school" /></SelectTrigger>
                  <SelectContent>
                    {SCHOOLS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Graduation year</Label>
                <Select value={gradYear} onValueChange={setGradYear}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['2025', '2026', '2027', '2028'].map(y => (
                      <SelectItem key={y} value={y}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Target industries</Label>
                <div className="flex flex-wrap gap-2">
                  {INDUSTRIES.map(ind => (
                    <Badge
                      key={ind}
                      variant={selectedIndustries.includes(ind) ? 'default' : 'outline'}
                      className="cursor-pointer transition-colors"
                      onClick={() => toggleIndustry(ind)}
                    >
                      {ind}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Target companies (comma-separated)</Label>
                <Input
                  value={targetCompanies}
                  onChange={e => setTargetCompanies(e.target.value)}
                  placeholder="McKinsey, Goldman Sachs, Amazon..."
                />
              </div>

              <Button type="submit" className="w-full gap-2" disabled={loading || !school}>
                {loading ? 'Saving...' : 'Get started'}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
