import { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Settings as SettingsIcon, Save } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function SettingsManager() {
  const [settings, setSettings] = useState({
    site_name: '',
    mercadopago_access_token: '',
    mercadopago_public_key: '',
    enable_payments: false
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSettings(response.data);
    } catch (error) {
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API}/settings`, settings, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600">Carregando configurações...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Configurações</h1>
        <p className="text-slate-600">Configure o sistema e integrações</p>
      </div>

      <div className="space-y-6">
        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle>Informações Gerais</CardTitle>
            <CardDescription>Configure as informações básicas do sistema</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="site_name">Nome do Site</Label>
              <Input
                id="site_name"
                data-testid="settings-site-name"
                value={settings.site_name}
                onChange={(e) => setSettings({ ...settings, site_name: e.target.value })}
                placeholder="License Manager"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle>Mercado Pago</CardTitle>
            <CardDescription>Configure a integração de pagamentos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="enable_payments"
                data-testid="settings-enable-payments"
                checked={settings.enable_payments}
                onCheckedChange={(checked) => setSettings({ ...settings, enable_payments: checked })}
              />
              <Label htmlFor="enable_payments">Habilitar Pagamentos</Label>
            </div>

            {settings.enable_payments && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="mercadopago_access_token">Access Token</Label>
                  <Input
                    id="mercadopago_access_token"
                    data-testid="settings-mp-access-token"
                    type="password"
                    value={settings.mercadopago_access_token || ''}
                    onChange={(e) => setSettings({ ...settings, mercadopago_access_token: e.target.value })}
                    placeholder="APP_USR-***"
                  />
                  <p className="text-xs text-slate-500">Obtenha em: https://www.mercadopago.com.br/developers/panel</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mercadopago_public_key">Public Key</Label>
                  <Input
                    id="mercadopago_public_key"
                    data-testid="settings-mp-public-key"
                    value={settings.mercadopago_public_key || ''}
                    onChange={(e) => setSettings({ ...settings, mercadopago_public_key: e.target.value })}
                    placeholder="APP_USR-***"
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-gradient-to-r from-blue-500 to-indigo-600"
            data-testid="settings-save-btn"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Salvando...' : 'Salvar Configurações'}
          </Button>
        </div>
      </div>
    </div>
  );
}
