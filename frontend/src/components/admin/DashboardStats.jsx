import { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Key, Package, Users, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function DashboardStats() {
  const [stats, setStats] = useState({
    total_licenses: 0,
    active_licenses: 0,
    total_products: 0,
    total_users: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/dashboard/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (error) {
      toast.error('Erro ao carregar estatísticas');
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total de Licenças',
      value: stats.total_licenses,
      icon: Key,
      color: 'from-blue-500 to-indigo-600',
      testId: 'stat-total-licenses'
    },
    {
      title: 'Licenças Ativas',
      value: stats.active_licenses,
      icon: CheckCircle,
      color: 'from-green-500 to-emerald-600',
      testId: 'stat-active-licenses'
    },
    {
      title: 'Produtos',
      value: stats.total_products,
      icon: Package,
      color: 'from-purple-500 to-pink-600',
      testId: 'stat-products'
    },
    {
      title: 'Usuários',
      value: stats.total_users,
      icon: Users,
      color: 'from-orange-500 to-red-600',
      testId: 'stat-users'
    }
  ];

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600">Carregando estatísticas...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Dashboard</h1>
        <p className="text-slate-600">Visão geral do sistema de licenças</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="shadow-lg border-0 overflow-hidden" data-testid={stat.testId}>
              <div className={`h-2 bg-gradient-to-r ${stat.color}`} />
              <CardHeader className="pb-3">
                <CardDescription className="text-slate-600">{stat.title}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-3xl font-bold text-slate-800">{stat.value}</div>
                  <div className={`w-12 h-12 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center shadow-md`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
