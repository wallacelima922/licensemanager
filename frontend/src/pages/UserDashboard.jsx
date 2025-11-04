import { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Key, Copy, Calendar, Globe, Package, LogOut, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function UserDashboard({ onLogout, user }) {
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLicenses();
  }, []);

  const fetchLicenses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/licenses`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLicenses(response.data);
    } catch (error) {
      toast.error('Erro ao carregar licenças');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado para a área de transferência!');
  };

  const getStatusBadge = (status) => {
    const variants = {
      active: { variant: 'default', icon: CheckCircle2, label: 'Ativa', color: 'bg-green-500' },
      inactive: { variant: 'secondary', icon: XCircle, label: 'Inativa', color: 'bg-slate-500' },
      expired: { variant: 'destructive', icon: Clock, label: 'Expirada', color: 'bg-red-500' }
    };
    
    const config = variants[status] || variants.inactive;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Minhas Licenças</h1>
                <p className="text-sm text-slate-600">{user.email}</p>
              </div>
            </div>
            <Button 
              onClick={onLogout} 
              variant="outline" 
              className="flex items-center gap-2"
              data-testid="user-logout-btn"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-slate-600">Carregando licenças...</p>
          </div>
        ) : licenses.length === 0 ? (
          <Card className="shadow-lg border-0">
            <CardContent className="py-12 text-center">
              <Key className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-800 mb-2">Nenhuma licença encontrada</h3>
              <p className="text-slate-600">Você ainda não possui licenças cadastradas.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {licenses.map((license) => (
              <Card key={license.id} className="shadow-lg border-0 hover:shadow-xl transition-shadow" data-testid="license-card">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">{license.client_name}</CardTitle>
                      <CardDescription className="flex items-center gap-2 mb-2">
                        <Globe className="w-4 h-4" />
                        {license.domain}
                      </CardDescription>
                    </div>
                    {getStatusBadge(license.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Package className="w-4 h-4" />
                      <span>Produto ID: {license.product_id}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Calendar className="w-4 h-4" />
                      <span>Expira: {format(new Date(license.expiration_date), 'dd/MM/yyyy', { locale: ptBR })}</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-200">
                    <label className="text-xs font-medium text-slate-600 mb-2 block">Chave de Licença</label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-slate-100 px-3 py-2 rounded text-xs font-mono text-slate-700 truncate">
                        {license.license_key}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(license.license_key)}
                        data-testid="copy-license-btn"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
