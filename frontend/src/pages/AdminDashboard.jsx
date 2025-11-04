import { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Shield, Package, Key, Users, LogOut, LayoutDashboard, Settings } from 'lucide-react';
import ProductsManager from '@/components/admin/ProductsManager';
import LicensesManager from '@/components/admin/LicensesManager';
import UsersManager from '@/components/admin/UsersManager';
import DashboardStats from '@/components/admin/DashboardStats';
import SettingsManager from '@/components/admin/SettingsManager';

export default function AdminDashboard({ onLogout, user }) {
  const location = useLocation();
  const currentPath = location.pathname;

  const navItems = [
    { path: '/admin', icon: LayoutDashboard, label: 'Dashboard', exact: true },
    { path: '/admin/products', icon: Package, label: 'Produtos' },
    { path: '/admin/licenses', icon: Key, label: 'Licenças' },
    { path: '/admin/users', icon: Users, label: 'Usuários' },
    { path: '/admin/settings', icon: Settings, label: 'Configurações' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 min-h-screen bg-white border-r border-slate-200 shadow-sm">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-slate-800 text-lg">License Manager</h2>
                <p className="text-xs text-slate-500">Admin Panel</p>
              </div>
            </div>

            <nav className="space-y-1">
              {navItems.map((item) => {
                const isActive = item.exact 
                  ? currentPath === item.path 
                  : currentPath.startsWith(item.path);
                
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    data-testid={`nav-${item.label.toLowerCase()}`}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="absolute bottom-0 w-64 p-6 border-t border-slate-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-slate-200 to-slate-300 rounded-full flex items-center justify-center">
                <Users className="w-5 h-5 text-slate-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{user.email}</p>
                <p className="text-xs text-slate-500">Administrador</p>
              </div>
            </div>
            <Button 
              onClick={onLogout} 
              variant="outline" 
              className="w-full flex items-center gap-2"
              data-testid="logout-btn"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </Button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          <Routes>
            <Route index element={<DashboardStats />} />
            <Route path="products" element={<ProductsManager />} />
            <Route path="licenses" element={<LicensesManager />} />
            <Route path="users" element={<UsersManager />} />
            <Route path="settings" element={<SettingsManager />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
