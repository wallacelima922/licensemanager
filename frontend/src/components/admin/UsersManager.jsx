import { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Trash2, Users as UsersIcon } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function UsersManager() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, userId: null });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data);
    } catch (error) {
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    const token = localStorage.getItem('token');
    
    try {
      await axios.delete(`${API}/users/${deleteDialog.userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Usuário deletado com sucesso!');
      setDeleteDialog({ open: false, userId: null });
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao deletar usuário');
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Usuários</h1>
        <p className="text-slate-600">Gerencie os usuários do sistema</p>
      </div>

      <Card className="shadow-lg border-0">
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-12">
              <p className="text-slate-600">Carregando usuários...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <UsersIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600">Nenhum usuário cadastrado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} data-testid="user-row">
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                        {user.role === 'admin' ? 'Administrador' : 'Usuário'}
                      </Badge>
                    </TableCell>
                    <TableCell>{format(new Date(user.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</TableCell>
                    <TableCell className="text-right">
                      <Button 
                        size="sm" 
                        variant="destructive" 
                        onClick={() => setDeleteDialog({ open: true, userId: user.id })}
                        data-testid="delete-user-btn"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
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
              Tem certeza que deseja deletar este usuário? Esta ação não pode ser desfeita.
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
