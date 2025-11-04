import { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, Package } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function ProductsManager() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, productId: null });
  const [formData, setFormData] = useState({ name: '', description: '', version: '1.0.0' });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/products`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProducts(response.data);
    } catch (error) {
      toast.error('Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');

    try {
      if (editingId) {
        await axios.put(`${API}/products/${editingId}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Produto atualizado com sucesso!');
      } else {
        await axios.post(`${API}/products`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Produto criado com sucesso!');
      }
      
      setDialogOpen(false);
      setFormData({ name: '', description: '', version: '1.0.0' });
      setEditingId(null);
      fetchProducts();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao salvar produto');
    }
  };

  const handleEdit = (product) => {
    setFormData({ name: product.name, description: product.description || '', version: product.version || '1.0.0' });
    setEditingId(product.id);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    const token = localStorage.getItem('token');
    
    try {
      await axios.delete(`${API}/products/${deleteDialog.productId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Produto deletado com sucesso!');
      setDeleteDialog({ open: false, productId: null });
      fetchProducts();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao deletar produto');
    }
  };

  const openCreateDialog = () => {
    setFormData({ name: '', description: '', version: '1.0.0' });
    setEditingId(null);
    setDialogOpen(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Produtos</h1>
          <p className="text-slate-600">Gerencie os produtos do sistema</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog} className="bg-gradient-to-r from-blue-500 to-indigo-600" data-testid="create-product-btn">
              <Plus className="w-4 h-4 mr-2" />
              Novo Produto
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="product-dialog">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
              <DialogDescription>Preencha as informações do produto</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  data-testid="product-name-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nome do produto"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="version">Versão</Label>
                <Input
                  id="version"
                  data-testid="product-version-input"
                  value={formData.version}
                  onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                  placeholder="1.0.0"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Input
                  id="description"
                  data-testid="product-description-input"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrição do produto"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" data-testid="product-submit-btn">Salvar</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-lg border-0">
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-12">
              <p className="text-slate-600">Carregando produtos...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600">Nenhum produto cadastrado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Versão</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id} data-testid="product-row">
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell><span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">{product.version || '1.0.0'}</span></TableCell>
                    <TableCell>{product.description || '-'}</TableCell>
                    <TableCell>{format(new Date(product.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleEdit(product)}
                          data-testid="edit-product-btn"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive" 
                          onClick={() => setDeleteDialog({ open: true, productId: product.id })}
                          data-testid="delete-product-btn"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar este produto? Esta ação não pode ser desfeita.
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
