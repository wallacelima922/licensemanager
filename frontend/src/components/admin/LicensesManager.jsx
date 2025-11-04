import { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Key, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function LicensesManager() {
  const [licenses, setLicenses] = useState([]);
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, licenseId: null });
  const [formData, setFormData] = useState({
    client_name: '',
    domain: '',
    product_id: '',
    user_id: '',
    expiration_date: '',
    status: 'active'
  });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [licensesRes, productsRes, usersRes] = await Promise.all([
        axios.get(`${API}/licenses`, { headers }),
        axios.get(`${API}/products`, { headers }),
        axios.get(`${API}/users`, { headers })
      ]);
      
      setLicenses(licensesRes.data);
      setProducts(productsRes.data);
      setUsers(usersRes.data);
    } catch (error) {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');

    try {
      const submitData = {
        ...formData,
        expiration_date: new Date(formData.expiration_date).toISOString()
      };

      if (editingId) {
        await axios.put(`${API}/licenses/${editingId}`, submitData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Licença atualizada com sucesso!');
      } else {
        await axios.post(`${API}/licenses`, submitData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Licença criada com sucesso!');
      }
      
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao salvar licença');
    }
  };

  const resetForm = () => {
    setFormData({
      client_name: '',
      domain: '',
      product_id: '',
      user_id: '',
      expiration_date: '',
      status: 'active'
    });
    setEditingId(null);
  };

  const handleEdit = (license) => {
    setFormData({
      client_name: license.client_name,
      domain: license.domain,
      product_id: license.product_id,
      user_id: license.user_id,
      expiration_date: format(new Date(license.expiration_date), 'yyyy-MM-dd'),
      status: license.status
    });
    setEditingId(license.id);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    const token = localStorage.getItem('token');
    
    try {
      await axios.delete(`${API}/licenses/${deleteDialog.licenseId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Licença deletada com sucesso!');
      setDeleteDialog({ open: false, licenseId: null });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao deletar licença');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Chave copiada!');
  };

  const getStatusBadge = (status) => {
    const variants = {
      active: { variant: 'default', label: 'Ativa' },
      inactive: { variant: 'secondary', label: 'Inativa' },
      expired: { variant: 'destructive', label: 'Expirada' }
    };
    const config = variants[status] || variants.inactive;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getProductName = (productId) => {
    const product = products.find(p => p.id === productId);
    return product?.name || productId;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Licenças</h1>
          <p className="text-slate-600">Gerencie as licenças do sistema</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="bg-gradient-to-r from-blue-500 to-indigo-600" data-testid="create-license-btn">
              <Plus className="w-4 h-4 mr-2" />
              Nova Licença
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl" data-testid="license-dialog">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Editar Licença' : 'Nova Licença'}</DialogTitle>
              <DialogDescription>Preencha as informações da licença</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="client_name">Nome do Cliente</Label>
                  <Input
                    id="client_name"
                    data-testid="license-client-input"
                    value={formData.client_name}
                    onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="domain">Domínio</Label>
                  <Input
                    id="domain"
                    data-testid="license-domain-input"
                    value={formData.domain}
                    onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                    placeholder="example.com"
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="product_id">Produto</Label>
                  <Select value={formData.product_id} onValueChange={(value) => setFormData({ ...formData, product_id: value })} required>
                    <SelectTrigger data-testid="license-product-select">
                      <SelectValue placeholder="Selecione um produto" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="user_id">Usuário</Label>
                  <Select value={formData.user_id} onValueChange={(value) => setFormData({ ...formData, user_id: value })} required>
                    <SelectTrigger data-testid="license-user-select">
                      <SelectValue placeholder="Selecione um usuário" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>{user.email}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expiration_date">Data de Expiração</Label>
                  <Input
                    id="expiration_date"
                    data-testid="license-expiration-input"
                    type="date"
                    value={formData.expiration_date}
                    onChange={(e) => setFormData({ ...formData, expiration_date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                    <SelectTrigger data-testid="license-status-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Ativa</SelectItem>
                      <SelectItem value="inactive">Inativa</SelectItem>
                      <SelectItem value="expired">Expirada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" data-testid="license-submit-btn">Salvar</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-lg border-0">
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-12">
              <p className="text-slate-600">Carregando licenças...</p>
            </div>
          ) : licenses.length === 0 ? (
            <div className="text-center py-12">
              <Key className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600">Nenhuma licença cadastrada</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Domínio</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Chave</TableHead>
                    <TableHead>Expira em</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {licenses.map((license) => (
                    <TableRow key={license.id} data-testid="license-row">
                      <TableCell className="font-medium">{license.client_name}</TableCell>
                      <TableCell>{license.domain}</TableCell>
                      <TableCell>{getProductName(license.product_id)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-slate-100 px-2 py-1 rounded">
                            {license.license_key.substring(0, 8)}...
                          </code>
                          <Button size="sm" variant="ghost" onClick={() => copyToClipboard(license.license_key)}>
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>{format(new Date(license.expiration_date), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                      <TableCell>{getStatusBadge(license.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button size="sm" variant="outline" onClick={() => handleEdit(license)} data-testid="edit-license-btn">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => setDeleteDialog({ open: true, licenseId: license.id })} data-testid="delete-license-btn">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar esta licença? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Deletar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
