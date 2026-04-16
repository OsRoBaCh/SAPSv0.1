'use client';

import { useState, cloneElement } from 'react';
import { 
  getAdminStats, 
  getAllUsers, 
  getAllRequests, 
  updateUserStatus, 
  deleteUser, 
  adminUpdateCategory,
  adminCreateCategory,
  adminDeleteCategory,
  adminAssignProvider,
  getCategories,
  updateSystemSetting,
  adminSendNotification,
  getPlatformAccounts,
  adminCreatePlatformAccount,
  adminUpdatePlatformAccount,
  adminDeletePlatformAccount,
  logout 
} from '@/lib/actions';
import { 
  Users, 
  Briefcase, 
  TrendingUp, 
  DollarSign, 
  LayoutDashboard, 
  Settings, 
  LogOut, 
  Search, 
  Filter, 
  MoreVertical, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Trash2, 
  Edit, 
  ChevronRight,
  Bell,
  Menu,
  X,
  UserCheck,
  UserX,
  Shield,
  Activity,
  Calendar,
  MapPin,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface AdminDashboardProps {
  initialStats: any;
  initialUsers: any[];
  initialRequests: any[];
  initialCategories: any[];
  initialSettings: any[];
  initialAccounts: any[];
  userName: string;
}

export default function AdminDashboard({ 
  initialStats, 
  initialUsers, 
  initialRequests,
  initialCategories,
  initialSettings,
  initialAccounts,
  userName 
}: AdminDashboardProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'requests' | 'categories' | 'finance' | 'system'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [users, setUsers] = useState(initialUsers);
  const [requests, setRequests] = useState(initialRequests);
  const [categories, setCategories] = useState(initialCategories);
  const [settings, setSettings] = useState(initialSettings);
  const [accounts, setAccounts] = useState(initialAccounts);
  const [stats, setStats] = useState(initialStats?.stats);
  const [recentRequests, setRecentRequests] = useState(initialStats?.recentRequests);
  const [logs, setLogs] = useState(initialStats?.logs);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // New states for modals
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [notificationTarget, setNotificationTarget] = useState<string | 'all'>('all');

  // Bank account modal state
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any>(null);

  // Confirmation modal state
  const [confirmation, setConfirmation] = useState<{ 
    isOpen: boolean, 
    title: string, 
    message: string, 
    onConfirm: () => void 
  } | null>(null);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const handleUpdateUserStatus = async (userId: string, status: any) => {
    const res = await updateUserStatus(userId, status);
    if (res.success) {
      setUsers(users.map(u => u.uuidUtilizador === userId ? { ...u, estadoConta: status } : u));
      setMessage({ type: 'success', text: `Estado do utilizador atualizado para ${status}` });
    } else {
      setMessage({ type: 'error', text: res.error || 'Erro ao atualizar estado' });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    setConfirmation({
      isOpen: true,
      title: 'Eliminar Utilizador',
      message: 'Tem certeza que deseja eliminar este utilizador? Esta ação não pode ser desfeita.',
      onConfirm: async () => {
        const res = await deleteUser(userId);
        if (res.success) {
          setUsers(users.filter(u => u.uuidUtilizador !== userId));
          setMessage({ type: 'success', text: 'Utilizador eliminado com sucesso' });
        } else {
          setMessage({ type: 'error', text: res.error || 'Erro ao eliminar utilizador' });
        }
        setConfirmation(null);
      }
    });
  };

  const handleUpdateSetting = async (chave: string, valor: string) => {
    const res = await updateSystemSetting(chave, valor);
    if (res.success) {
      setSettings(settings.map(s => s.chave === chave ? { ...s, valor } : s));
      setMessage({ type: 'success', text: 'Configuração atualizada com sucesso' });
    } else {
      setMessage({ type: 'error', text: res.error || 'Erro ao atualizar configuração' });
    }
  };

  const handleCreateAccount = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const data = {
      banco: formData.get('banco') as string,
      iban: formData.get('iban') as string,
      titular: formData.get('titular') as string
    };

    const res = await adminCreatePlatformAccount(data);
    if (res.success) {
      const updatedAccounts = await getPlatformAccounts();
      setAccounts(updatedAccounts);
      setIsAccountModalOpen(false);
      setMessage({ type: 'success', text: 'Conta bancária adicionada com sucesso!' });
    } else {
      setMessage({ type: 'error', text: res.error || 'Erro ao adicionar conta' });
    }
    setIsSubmitting(false);
  };

  const handleUpdateAccount = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const data = {
      banco: formData.get('banco') as string,
      iban: formData.get('iban') as string,
      titular: formData.get('titular') as string,
      ativo: formData.get('ativo') === 'on' ? 1 : 0
    };

    const res = await adminUpdatePlatformAccount(editingAccount.uuidConta, data);
    if (res.success) {
      const updatedAccounts = await getPlatformAccounts();
      setAccounts(updatedAccounts);
      setIsAccountModalOpen(false);
      setEditingAccount(null);
      setMessage({ type: 'success', text: 'Conta bancária atualizada com sucesso!' });
    } else {
      setMessage({ type: 'error', text: res.error || 'Erro ao atualizar conta' });
    }
    setIsSubmitting(false);
  };

  const handleDeleteAccount = async (id: string) => {
    setConfirmation({
      isOpen: true,
      title: 'Excluir Conta Bancária',
      message: 'Tem certeza que deseja excluir esta conta? Os clientes não poderão mais ver este IBAN.',
      onConfirm: async () => {
        const res = await adminDeletePlatformAccount(id);
        if (res.success) {
          setAccounts(accounts.filter(a => a.uuidConta !== id));
          setMessage({ type: 'success', text: 'Conta bancária excluída com sucesso!' });
        } else {
          setMessage({ type: 'error', text: res.error || 'Erro ao excluir conta' });
        }
        setConfirmation(null);
      }
    });
  };

  const handleSendNotification = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const titulo = formData.get('titulo') as string;
    const mensagem = formData.get('mensagem') as string;

    const res = await adminSendNotification(notificationTarget, titulo, mensagem);
    setIsSubmitting(false);
    if (res.success) {
      setMessage({ type: 'success', text: 'Notificação enviada com sucesso' });
      setIsNotificationModalOpen(false);
    } else {
      setMessage({ type: 'error', text: res.error || 'Erro ao enviar notificação' });
    }
  };

  const handleSaveCategory = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const nome = formData.get('nome') as string;
    const descricao = formData.get('descricao') as string;
    const precoBase = parseFloat(formData.get('precoBase') as string);
    const ativo = formData.get('ativo') === 'on' ? 1 : 0;

    let res;
    if (editingCategory) {
      res = await adminUpdateCategory(editingCategory.uuidCategoria, { nome, descricao, precoBase, ativo });
    } else {
      res = await adminCreateCategory({ nome, descricao, precoBase });
    }

    setIsSubmitting(false);
    if (res.success) {
      const updatedCategories = await getCategories();
      setCategories(updatedCategories);
      setMessage({ type: 'success', text: 'Categoria guardada com sucesso' });
      setIsCategoryModalOpen(false);
      setEditingCategory(null);
    } else {
      setMessage({ type: 'error', text: res.error || 'Erro ao guardar categoria' });
    }
  };

  const handleDeleteCategory = async (id: string) => {
    setConfirmation({
      isOpen: true,
      title: 'Eliminar Categoria',
      message: 'Tem certeza que deseja eliminar esta categoria? Isso pode afetar pedidos existentes.',
      onConfirm: async () => {
        const res = await adminDeleteCategory(id);
        if (res.success) {
          setCategories(categories.filter(c => c.uuidCategoria !== id));
          setMessage({ type: 'success', text: 'Categoria eliminada com sucesso' });
        } else {
          setMessage({ type: 'error', text: res.error || 'Erro ao eliminar categoria' });
        }
        setConfirmation(null);
      }
    });
  };

  const handleAssignProvider = async (solicitacaoId: string, providerId: string) => {
    const res = await adminAssignProvider(solicitacaoId, providerId);
    if (res.success) {
      const updatedRequests = await getAllRequests();
      setRequests(updatedRequests);
      setMessage({ type: 'success', text: 'Técnico atribuído com sucesso' });
    } else {
      setMessage({ type: 'error', text: res.error || 'Erro ao atribuir técnico' });
    }
  };

  const filteredUsers = users.filter(u => 
    u.nomeCompleto.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredRequests = requests.filter(r => 
    r.nomeCliente.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.nomeCategoria.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.nomePrestador && r.nomePrestador.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pendente': return 'bg-orange-100 text-orange-600';
      case 'Aceite': return 'bg-blue-100 text-blue-600';
      case 'Em curso': return 'bg-purple-100 text-purple-600';
      case 'Concluido': return 'bg-green-100 text-green-600';
      case 'Cancelado': return 'bg-red-100 text-red-600';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className={`bg-slate-900 text-white transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-20'} flex flex-col fixed h-full z-50`}>
        <div className="p-6 flex items-center gap-4">
          <div className="bg-blue-600 p-2 rounded-xl">
            <Shield className="w-6 h-6 text-white" />
          </div>
          {isSidebarOpen && <span className="font-display font-black text-xl tracking-tight">SAPS Admin</span>}
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-6">
          <SidebarLink 
            icon={<LayoutDashboard />} 
            label="Dashboard" 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')} 
            collapsed={!isSidebarOpen}
          />
          <SidebarLink 
            icon={<Users />} 
            label="Utilizadores" 
            active={activeTab === 'users'} 
            onClick={() => setActiveTab('users')} 
            collapsed={!isSidebarOpen}
          />
          <SidebarLink 
            icon={<Briefcase />} 
            label="Solicitações" 
            active={activeTab === 'requests'} 
            onClick={() => setActiveTab('requests')} 
            collapsed={!isSidebarOpen}
          />
          <SidebarLink 
            icon={<Settings />} 
            label="Categorias" 
            active={activeTab === 'categories'} 
            onClick={() => setActiveTab('categories')} 
            collapsed={!isSidebarOpen}
          />
          <SidebarLink 
            icon={<DollarSign />} 
            label="Financeiro" 
            active={activeTab === 'finance'} 
            onClick={() => setActiveTab('finance')} 
            collapsed={!isSidebarOpen}
          />
          <SidebarLink 
            icon={<Settings />} 
            label="Sistema" 
            active={activeTab === 'system'} 
            onClick={() => setActiveTab('system')} 
            collapsed={!isSidebarOpen}
          />
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition-all"
          >
            <LogOut className="w-6 h-6" />
            {isSidebarOpen && <span className="font-bold text-sm">Sair do CRM</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-20'}`}>
        {/* Header */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-40 px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              {isSidebarOpen ? <Menu className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </button>
            <h1 className="text-xl font-display font-black text-slate-900 capitalize">{activeTab}</h1>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative hidden md:block">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Pesquisar no CRM..." 
                className="pl-10 pr-4 py-2 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 w-64 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-black text-slate-900">{userName}</p>
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Super Admin</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black">
                {userName.charAt(0)}
              </div>
            </div>
          </div>
        </header>

        <div className="p-8">
          {message && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mb-6 p-4 rounded-2xl flex items-center gap-3 text-sm font-bold ${
                message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
              }`}
            >
              {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
              {message.text}
              <button onClick={() => setMessage(null)} className="ml-auto p-1 hover:bg-black/5 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {activeTab === 'dashboard' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                  icon={<Users className="text-blue-600" />} 
                  label="Total Utilizadores" 
                  value={stats?.totalUsers} 
                  trend="+12% este mês"
                  color="blue"
                />
                <StatCard 
                  icon={<Briefcase className="text-purple-600" />} 
                  label="Solicitações" 
                  value={stats?.totalRequests} 
                  trend="+5% hoje"
                  color="purple"
                />
                <StatCard 
                  icon={<TrendingUp className="text-green-600" />} 
                  label="Volume Total" 
                  value={`${stats?.totalVolume.toLocaleString()} Kz`} 
                  trend="85% concluído"
                  color="green"
                />
                <StatCard 
                  icon={<DollarSign className="text-orange-600" />} 
                  label="Comissão SAPS" 
                  value={`${stats?.platformCommission.toLocaleString()} Kz`} 
                  trend="Taxa fixa 15%"
                  color="orange"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Activity */}
                <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-xl font-display font-black text-slate-900">Atividade Recente</h2>
                    <button className="text-sm font-bold text-blue-600 hover:underline">Ver tudo</button>
                  </div>
                  <div className="space-y-6">
                    {recentRequests?.map((req: any) => (
                      <div key={req.uuidSolicitacao} className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-colors border border-transparent hover:border-slate-100">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                            <Activity className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{req.nomeCliente}</p>
                            <p className="text-xs text-slate-500 font-medium">{req.nomeCategoria} • {req.zonaAtendimento}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-slate-900">{req.precoFinal.toLocaleString()} Kz</p>
                          <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${getStatusColor(req.estadoSolicitacao)}`}>
                            {req.estadoSolicitacao}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* System Health */}
                <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
                  <h2 className="text-xl font-display font-black text-slate-900 mb-8">Estado do Sistema</h2>
                  <div className="space-y-6">
                    <HealthItem label="Servidor API" status="online" />
                    <HealthItem label="Base de Dados" status="online" />
                    <HealthItem label="Gateway Pagamento" status="warning" />
                    <HealthItem label="Serviço Notificações" status="online" />
                    <div className="pt-6 mt-6 border-t border-slate-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Carga do CPU</span>
                        <span className="text-xs font-black text-slate-900">24%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600 rounded-full" style={{ width: '24%' }}></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* System Logs */}
                <div className="lg:col-span-3 bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-xl font-display font-black text-slate-900">Logs do Sistema</h2>
                    <Activity className="w-5 h-5 text-slate-400" />
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-slate-50">
                          <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ação</th>
                          <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Utilizador</th>
                          <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Detalhes</th>
                          <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Data</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {logs?.map((log: any) => (
                          <tr key={log.uuidLog} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-4">
                              <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg uppercase tracking-widest">
                                {log.acao}
                              </span>
                            </td>
                            <td className="py-4 text-sm font-bold text-slate-700">{log.nomeUtilizador || 'Sistema'}</td>
                            <td className="py-4 text-xs text-slate-500 font-medium">{log.detalhes}</td>
                            <td className="py-4 text-right text-[10px] font-bold text-slate-400">
                              {new Date(log.data).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden animate-in fade-in duration-500">
              <div className="p-8 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-display font-black text-slate-900">Gestão de Utilizadores</h2>
                  <p className="text-sm text-slate-500 font-medium">Administre clientes e prestadores de serviço</p>
                </div>
                <div className="flex items-center gap-3">
                  <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-200 transition-all">
                    <Filter className="w-4 h-4" />
                    Filtros
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Utilizador</th>
                      <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo</th>
                      <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado</th>
                      <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cadastro</th>
                      <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredUsers.map((user) => (
                      <tr key={user.uuidUtilizador} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-black">
                              {user.nomeCompleto.charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{user.nomeCompleto}</p>
                              <p className="text-xs text-slate-500">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${
                            user.tipoUtilizador === 'Admin' ? 'bg-red-50 text-red-600' : 
                            user.tipoUtilizador === 'Prestador' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'
                          }`}>
                            {user.tipoUtilizador}
                          </span>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${
                              user.estadoConta === 'Ativo' ? 'bg-green-500' : 
                              user.estadoConta === 'Suspenso' ? 'bg-orange-500' : 'bg-red-500'
                            }`} />
                            <span className="text-sm font-bold text-slate-700">{user.estadoConta}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-sm text-slate-500 font-medium">
                          {new Date(user.dataCadastro).toLocaleDateString()}
                        </td>
                        <td className="px-8 py-6 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => { setNotificationTarget(user.uuidUtilizador); setIsNotificationModalOpen(true); }}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" 
                              title="Enviar Notificação"
                            >
                              <Bell className="w-4 h-4" />
                            </button>
                            {user.estadoConta === 'Ativo' ? (
                              <button 
                                onClick={() => handleUpdateUserStatus(user.uuidUtilizador, 'Suspenso')}
                                className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors" 
                                title="Suspender"
                              >
                                <UserX className="w-4 h-4" />
                              </button>
                            ) : (
                              <button 
                                onClick={() => handleUpdateUserStatus(user.uuidUtilizador, 'Ativo')}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors" 
                                title="Ativar"
                              >
                                <UserCheck className="w-4 h-4" />
                              </button>
                            )}
                            <button 
                              onClick={() => handleDeleteUser(user.uuidUtilizador)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" 
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'requests' && (
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden animate-in fade-in duration-500">
              <div className="p-8 border-b border-slate-100">
                <h2 className="text-xl font-display font-black text-slate-900">Monitorização de Serviços</h2>
                <p className="text-sm text-slate-500 font-medium">Acompanhe todas as solicitações em tempo real</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Serviço</th>
                      <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Intervenientes</th>
                      <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado</th>
                      <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor</th>
                      <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredRequests.map((req) => (
                      <tr key={req.uuidSolicitacao} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-6">
                          <div>
                            <p className="font-bold text-slate-900">{req.nomeCategoria}</p>
                            <p className="text-xs text-slate-500 truncate max-w-xs">{req.descricaoProblema}</p>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest w-12">Cliente:</span>
                              <span className="text-sm font-bold text-slate-700">{req.nomeCliente}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest w-12">Técnico:</span>
                              {req.nomePrestador ? (
                                <span className="text-sm font-bold text-slate-700">{req.nomePrestador}</span>
                              ) : (
                                <select 
                                  className="text-xs bg-slate-100 border-none rounded-lg px-2 py-1 focus:ring-2 focus:ring-purple-500"
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      handleAssignProvider(req.uuidSolicitacao, e.target.value);
                                    }
                                  }}
                                >
                                  <option value="">Atribuir...</option>
                                  {users.filter(u => u.tipoUtilizador === 'Prestador' && u.estadoConta === 'Ativo').map(p => (
                                    <option key={p.uuidUtilizador} value={p.uuidUtilizador}>{p.nomeCompleto}</option>
                                  ))}
                                </select>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${getStatusColor(req.estadoSolicitacao)}`}>
                            {req.estadoSolicitacao}
                          </span>
                        </td>
                        <td className="px-8 py-6">
                          <p className="font-black text-slate-900">{req.precoFinal.toLocaleString()} Kz</p>
                          {req.pagamentoConfirmado === 1 ? (
                            <span className="text-[8px] font-black text-green-600 uppercase tracking-widest">Pago</span>
                          ) : (
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Pendente</span>
                          )}
                        </td>
                        <td className="px-8 py-6 text-sm text-slate-500 font-medium">
                          {new Date(req.dataCriacao).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'categories' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-display font-black text-slate-900">Gestão de Categorias</h2>
                  <p className="text-sm text-slate-500 font-medium">Configure os serviços oferecidos pela plataforma</p>
                </div>
                <button 
                  onClick={() => { setEditingCategory(null); setIsCategoryModalOpen(true); }}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl text-sm font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
                >
                  <Briefcase className="w-5 h-5" />
                  Nova Categoria
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categories.map((cat) => (
                  <div key={cat.uuidCategoria} className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all group">
                    <div className="flex justify-between items-start mb-6">
                      <div className={`w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all`}>
                        <Briefcase className="w-7 h-7" />
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => { setEditingCategory(cat); setIsCategoryModalOpen(true); }}
                          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Edit className="w-5 h-5 text-slate-400" />
                        </button>
                        <button 
                          onClick={() => handleDeleteCategory(cat.uuidCategoria)}
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-5 h-5 text-red-400" />
                        </button>
                      </div>
                    </div>
                    <h3 className="text-xl font-display font-black text-slate-900 mb-2">{cat.nomeCategoria}</h3>
                    <p className="text-sm text-slate-500 font-medium mb-6 line-clamp-2">{cat.descricao}</p>
                    <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Preço Base</p>
                        <p className="font-black text-slate-900">{cat.precoBase.toLocaleString()} Kz</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${cat.ativo ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className="text-xs font-bold text-slate-700">{cat.ativo ? 'Ativo' : 'Inativo'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'finance' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm text-center">
                  <div className="w-20 h-20 rounded-3xl bg-green-50 flex items-center justify-center text-green-600 mx-auto mb-6">
                    <TrendingUp className="w-10 h-10" />
                  </div>
                  <h3 className="text-slate-500 font-bold uppercase tracking-widest text-xs mb-2">Volume Total Transacionado</h3>
                  <p className="text-5xl font-display font-black text-slate-900 tracking-tighter mb-4">
                    {stats?.totalVolume.toLocaleString()} <span className="text-2xl">Kz</span>
                  </p>
                  <p className="text-sm text-slate-400 font-medium">Baseado em {stats?.completedRequests} serviços concluídos</p>
                </div>

                <div className="bg-slate-900 rounded-[2.5rem] p-10 shadow-2xl text-center text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                  <div className="w-20 h-20 rounded-3xl bg-white/10 backdrop-blur-md flex items-center justify-center text-blue-400 mx-auto mb-6 relative z-10">
                    <DollarSign className="w-10 h-10" />
                  </div>
                  <h3 className="text-blue-300 font-bold uppercase tracking-widest text-xs mb-2 relative z-10">Receita da Plataforma (15%)</h3>
                  <p className="text-5xl font-display font-black text-white tracking-tighter mb-4 relative z-10">
                    {stats?.platformCommission.toLocaleString()} <span className="text-2xl">Kz</span>
                  </p>
                  <p className="text-sm text-slate-400 font-medium relative z-10">Lucro bruto acumulado</p>
                </div>
              </div>

              <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
                <h2 className="text-xl font-display font-black text-slate-900 mb-8">Fluxo de Caixa Mensal</h2>
                <div className="h-64 flex items-end gap-4 px-4">
                  {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 100].map((height, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2">
                      <motion.div 
                        initial={{ height: 0 }}
                        animate={{ height: `${height}%` }}
                        className="w-full bg-blue-600/10 hover:bg-blue-600 transition-all rounded-t-xl cursor-help relative group"
                      >
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-black px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          {Math.floor(height * 10000).toLocaleString()} Kz
                        </div>
                      </motion.div>
                      <span className="text-[8px] font-black text-slate-400 uppercase">{['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][i]}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-xl font-display font-black text-slate-900">Gestão de Contas da Aplicação</h2>
                  <button 
                    onClick={() => {
                      setEditingAccount(null);
                      setIsAccountModalOpen(true);
                    }}
                    className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold text-sm hover:bg-blue-700 transition-all flex items-center gap-2"
                  >
                    <DollarSign className="w-4 h-4" />
                    Adicionar Conta
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {accounts.map((account: any) => (
                    <div key={account.uuidConta} className={`p-6 rounded-2xl border ${account.ativo ? 'bg-slate-50 border-slate-100' : 'bg-gray-50 border-gray-200 opacity-60'}`}>
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                          <DollarSign className={`w-5 h-5 ${account.ativo ? 'text-blue-600' : 'text-slate-400'}`} />
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => {
                              setEditingAccount(account);
                              setIsAccountModalOpen(true);
                            }}
                            className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                          >
                            <Settings className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteAccount(account.uuidConta)}
                            className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{account.banco}</p>
                      <p className="text-sm font-bold text-slate-900 mb-1">{account.iban}</p>
                      <p className="text-[10px] font-medium text-slate-500 truncate">{account.titular}</p>
                      {!account.ativo && (
                        <span className="inline-block mt-3 px-2 py-1 bg-gray-200 text-gray-600 text-[8px] font-black uppercase rounded">Inativo</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          {activeTab === 'system' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* System Settings */}
                <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
                  <h2 className="text-xl font-display font-black text-slate-900 mb-8">Configurações da Plataforma</h2>
                  <div className="space-y-6">
                    {settings.map((setting: any) => (
                      <div key={setting.chave} className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{setting.chave.replace('_', ' ')}</p>
                            <p className="text-sm text-slate-500 font-medium">{setting.descricao}</p>
                          </div>
                          <Settings className="w-5 h-5 text-slate-300" />
                        </div>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            defaultValue={setting.valor}
                            onBlur={(e) => handleUpdateSetting(setting.chave, e.target.value)}
                            className="flex-1 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* System Notifications */}
                <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-xl font-display font-black text-slate-900">Notificações Globais</h2>
                    <Bell className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="p-8 bg-blue-50 rounded-[2rem] border border-blue-100 text-center">
                    <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-600/20">
                      <Bell className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-display font-black text-slate-900 mb-2">Comunicado do Sistema</h3>
                    <p className="text-sm text-slate-500 font-medium mb-8">Envie uma notificação para todos os utilizadores da plataforma instantaneamente.</p>
                    <button 
                      onClick={() => { setNotificationTarget('all'); setIsNotificationModalOpen(true); }}
                      className="w-full py-4 bg-blue-600 text-white rounded-2xl text-sm font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
                    >
                      Enviar Notificação Global
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmation && confirmation.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100"
            >
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-xl font-display font-black text-slate-900 mb-2">{confirmation.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed mb-8">{confirmation.message}</p>
                
                <div className="flex gap-3">
                  <button 
                    onClick={() => setConfirmation(null)}
                    className="flex-1 px-6 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={confirmation.onConfirm}
                    className="flex-1 px-6 py-4 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-700 transition-colors shadow-lg shadow-red-100"
                  >
                    Confirmar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isCategoryModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-xl font-display font-black text-slate-900">
                  {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
                </h2>
                <button onClick={() => setIsCategoryModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSaveCategory} className="p-8 space-y-6">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Nome da Categoria</label>
                  <input 
                    name="nome"
                    defaultValue={editingCategory?.nomeCategoria}
                    required
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Descrição</label>
                  <textarea 
                    name="descricao"
                    defaultValue={editingCategory?.descricao}
                    required
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Preço Base (Kz)</label>
                  <input 
                    name="precoBase"
                    type="number"
                    defaultValue={editingCategory?.precoBase}
                    required
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                {editingCategory && (
                  <div className="flex items-center gap-3">
                    <input 
                      name="ativo"
                      type="checkbox"
                      defaultChecked={editingCategory?.ativo === 1}
                      className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label className="text-sm font-bold text-slate-700">Categoria Ativa</label>
                  </div>
                )}
                <button 
                  disabled={isSubmitting}
                  className="w-full py-4 bg-blue-600 text-white rounded-2xl text-sm font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? 'A guardar...' : 'Guardar Categoria'}
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {isNotificationModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-xl font-display font-black text-slate-900">Enviar Notificação</h2>
                <button onClick={() => setIsNotificationModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSendNotification} className="p-8 space-y-6">
                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                  <p className="text-xs font-bold text-blue-700">
                    {notificationTarget === 'all' ? 'Esta notificação será enviada para TODOS os utilizadores.' : `Destinatário: ${users.find(u => u.uuidUtilizador === notificationTarget)?.nomeCompleto}`}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Título</label>
                  <input 
                    name="titulo"
                    required
                    placeholder="Ex: Manutenção do Sistema"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Mensagem</label>
                  <textarea 
                    name="mensagem"
                    required
                    rows={4}
                    placeholder="Escreva a sua mensagem aqui..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  />
                </div>
                <button 
                  disabled={isSubmitting}
                  className="w-full py-4 bg-blue-600 text-white rounded-2xl text-sm font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? 'A enviar...' : 'Enviar Agora'}
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {isAccountModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-xl font-display font-black text-slate-900">
                  {editingAccount ? 'Editar Conta Bancária' : 'Nova Conta Bancária'}
                </h2>
                <button onClick={() => setIsAccountModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={editingAccount ? handleUpdateAccount : handleCreateAccount} className="p-8 space-y-6">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Banco</label>
                  <input 
                    name="banco"
                    defaultValue={editingAccount?.banco}
                    required
                    placeholder="Ex: BAI, BFA, BIC"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">IBAN</label>
                  <input 
                    name="iban"
                    defaultValue={editingAccount?.iban}
                    required
                    placeholder="AO06 0000 ..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Titular da Conta</label>
                  <input 
                    name="titular"
                    defaultValue={editingAccount?.titular}
                    required
                    placeholder="Nome da empresa ou titular"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                {editingAccount && (
                  <div className="flex items-center gap-3">
                    <input 
                      name="ativo"
                      type="checkbox"
                      defaultChecked={editingAccount?.ativo === 1}
                      className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label className="text-sm font-bold text-slate-700">Conta Ativa</label>
                  </div>
                )}
                <button 
                  disabled={isSubmitting}
                  className="w-full py-4 bg-blue-600 text-white rounded-2xl text-sm font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? 'A guardar...' : 'Guardar Conta'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SidebarLink({ icon, label, active, onClick, collapsed }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void, collapsed: boolean }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all ${
        active 
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
      }`}
    >
      <div className={`${active ? 'text-white' : 'text-slate-500'}`}>
        {cloneElement(icon as React.ReactElement<any>, { className: 'w-6 h-6' })}
      </div>
      {!collapsed && <span className="font-bold text-sm">{label}</span>}
    </button>
  );
}

function StatCard({ icon, label, value, trend, color }: { icon: React.ReactNode, label: string, value: any, trend: string, color: string }) {
  const colors: any = {
    blue: 'bg-blue-50',
    purple: 'bg-purple-50',
    green: 'bg-green-50',
    orange: 'bg-orange-50'
  };

  return (
    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
      <div className={`w-12 h-12 rounded-2xl ${colors[color]} flex items-center justify-center mb-4`}>
        {icon}
      </div>
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-2xl font-display font-black text-slate-900 mb-2">{value}</p>
      <p className="text-[10px] font-bold text-slate-500">{trend}</p>
    </div>
  );
}

function HealthItem({ label, status }: { label: string, status: 'online' | 'warning' | 'offline' }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-bold text-slate-700">{label}</span>
      <div className="flex items-center gap-2">
        <span className={`text-[10px] font-black uppercase tracking-widest ${
          status === 'online' ? 'text-green-600' : 
          status === 'warning' ? 'text-orange-600' : 'text-red-600'
        }`}>
          {status}
        </span>
        <div className={`w-2 h-2 rounded-full animate-pulse ${
          status === 'online' ? 'bg-green-500' : 
          status === 'warning' ? 'bg-orange-500' : 'bg-red-500'
        }`} />
      </div>
    </div>
  );
}
