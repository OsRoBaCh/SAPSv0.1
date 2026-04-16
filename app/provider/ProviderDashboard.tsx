'use client';

import { useState, useEffect, useCallback } from 'react';
import { acceptRequest, rejectRequest, updateRequestStatus, logout, updateUserProfile, updateUserPassword, updateUserPrivacy, getProviderEarnings, requestWithdrawal, getNotifications, markNotificationAsRead, addProviderBankAccount, deleteProviderBankAccount, setDefaultProviderBankAccount, getProviderRequests } from '@/lib/actions';
import { MapPin, Clock, CheckCircle2, User, Phone, ArrowLeft, LogOut, Brain, AlertCircle, LayoutDashboard, History, User as UserIcon, Settings, ShieldCheck, ArrowRight, Save, Lock, Eye, EyeOff, Trash2, Mail, Map as MapIcon, Navigation, Sparkles, TrendingUp, TrendingDown, Minus, Loader2, Wallet, ArrowUpRight, ArrowDownLeft, Landmark, Bell, X, RefreshCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ProviderDashboard({ initialRequests, userName, userId, userProfile }: { initialRequests: any[], userName: string, userId: string, userProfile: any }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'home' | 'map' | 'history' | 'profile' | 'earnings'>('home');
  // Profile sub-screens state
  const [profileSubScreen, setProfileSubScreen] = useState<'main' | 'account' | 'privacy'>('main');
  
  // Requests state
  const [requests, setRequests] = useState(initialRequests);
  
  const fetchRequests = useCallback(async () => {
    const data = await getProviderRequests(userId);
    setRequests(data);
  }, [userId]);
  
  // Earnings state
  const [earningsData, setEarningsData] = useState<{ saldo: number, contas: any[], transacoes: any[] }>({ saldo: 0, contas: [], transacoes: [] });
  const [isWithdrawalModalOpen, setIsWithdrawalModalOpen] = useState(false);
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [newBank, setNewBank] = useState({ banco: '', iban: '', titular: '' });
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [isEarningsLoading, setIsEarningsLoading] = useState(false);
  
  // Profile form state
  const [editName, setEditName] = useState(userProfile?.nomeCompleto || userName);
  const [editPhone, setEditPhone] = useState(userProfile?.nTelefone || '');
  const [editBank, setEditBank] = useState(userProfile?.nContaBancaria || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [privacyStatus, setPrivacyStatus] = useState(userProfile?.estadoConta || 'Ativo');

  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Notifications state
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const fetchNotifications = useCallback(async () => {
    const data = await getNotifications(userId);
    setNotifications(data);
  }, [userId]);

  const handleMarkAsRead = useCallback(async (id: string) => {
    await markNotificationAsRead(id);
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, [userId, fetchNotifications]);

  // Detect new requests or status changes from notifications
  useEffect(() => {
    const relevantTitles = ['Novo Pedido Disponível', 'Novo Pedido Alternativo', 'Pagamento Confirmado'];
    const statusNotification = notifications.find(n => relevantTitles.includes(n.titulo) && !n.lida);
    
    if (statusNotification) {
      // Refresh requests silently
      fetchRequests();
      // Mark as read to avoid loop
      handleMarkAsRead(statusNotification.uuidNotificacao);
    }
  }, [notifications, handleMarkAsRead, fetchRequests]);

  const unreadCount = notifications.filter(n => !n.lida).length;

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const handleAction = async (id: string, action: 'accept' | 'start' | 'complete' | 'reject') => {
    setLoadingId(id);
    setError(null);
    try {
      let res;
      if (action === 'accept') {
        res = await acceptRequest(id, userId);
      } else if (action === 'reject') {
        res = await rejectRequest(id);
      } else if (action === 'start') {
        res = await updateRequestStatus(id, 'Em curso');
      } else if (action === 'complete') {
        res = await updateRequestStatus(id, 'Concluido');
      }

      if (res && !res.success) {
        setError(res.error || 'Ocorreu um erro desconhecido.');
      } else if (res && res.success) {
        await fetchRequests();
      }
    } catch (err) {
      console.error(err);
      setError('Ocorreu um erro ao processar a sua solicitação.');
    } finally {
      setLoadingId(null);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    try {
      const res = await updateUserProfile(userId, { 
        nomeCompleto: editName, 
        nTelefone: editPhone,
        nContaBancaria: editBank
      });
      if (res.success) {
        setMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' });
        router.refresh();
      } else {
        setMessage({ type: 'error', text: res.error || 'Erro ao atualizar perfil.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro de conexão.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) return;
    setIsSubmitting(true);
    setMessage(null);
    try {
      const res = await updateUserPassword(userId, currentPassword, newPassword);
      if (res.success) {
        setMessage({ type: 'success', text: 'Senha alterada com sucesso!' });
        setCurrentPassword('');
        setNewPassword('');
      } else {
        setMessage({ type: 'error', text: res.error || 'Erro ao alterar senha.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro de conexão.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdatePrivacy = async (status: string) => {
    setIsSubmitting(true);
    setMessage(null);
    try {
      const res = await updateUserPrivacy(userId, status);
      if (res.success) {
        setPrivacyStatus(status);
        setMessage({ type: 'success', text: 'Definições de privacidade atualizadas!' });
      } else {
        setMessage({ type: 'error', text: res.error || 'Erro ao atualizar.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro de conexão.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchEarnings = useCallback(async () => {
    setIsEarningsLoading(true);
    try {
      const data = await getProviderEarnings(userId);
      setEarningsData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsEarningsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (activeTab === 'earnings') {
      fetchEarnings();
    }
  }, [activeTab, fetchEarnings]);

  const handleWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(withdrawalAmount);
    if (isNaN(amount) || amount <= 0) return;
    
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await requestWithdrawal(userId, amount);
      if (res.success) {
        setIsWithdrawalModalOpen(false);
        setWithdrawalAmount('');
        fetchEarnings();
        setMessage({ type: 'success', text: 'Levantamento processado com sucesso!' });
      } else {
        setError(res.error || 'Erro ao processar levantamento.');
      }
    } catch (err) {
      setError('Erro de conexão.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddBankAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await addProviderBankAccount(userId, newBank);
      if (res.success) {
        setIsBankModalOpen(false);
        setNewBank({ banco: '', iban: '', titular: '' });
        fetchEarnings();
        setMessage({ type: 'success', text: 'Conta bancária adicionada com sucesso!' });
      } else {
        setError(res.error || 'Erro ao adicionar conta.');
      }
    } catch (err) {
      setError('Erro de conexão.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBankAccount = async (id: string) => {
    if (!confirm('Tem a certeza que deseja eliminar esta conta?')) return;
    try {
      const res = await deleteProviderBankAccount(userId, id);
      if (res.success) {
        fetchEarnings();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSetDefaultAccount = async (id: string) => {
    try {
      const res = await setDefaultProviderBankAccount(userId, id);
      if (res.success) {
        fetchEarnings();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pendente': return 'bg-yellow-100 text-yellow-800';
      case 'Aceite': return 'bg-blue-100 text-blue-800';
      case 'Em curso': return 'bg-purple-100 text-purple-800';
      case 'Concluido': return 'bg-green-100 text-green-800';
      case 'Cancelado': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24 font-sans">
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-4 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            {activeTab === 'profile' && profileSubScreen !== 'main' ? (
              <button onClick={() => { setProfileSubScreen('main'); setMessage(null); }} className="p-2 -ml-2 text-slate-500 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
            ) : (
              <Link href="/" className="p-2 -ml-2 text-slate-500 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            )}
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-200">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-display font-bold text-slate-900 tracking-tight">
                  {activeTab === 'home' && 'Área do Prestador'}
                  {activeTab === 'map' && 'Mapa de Serviços'}
                  {activeTab === 'history' && 'Histórico de Serviços'}
                  {activeTab === 'profile' && (
                    profileSubScreen === 'main' ? 'Meu Perfil' :
                    profileSubScreen === 'account' ? 'Definições da Conta' : 'Privacidade'
                  )}
                </h1>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{userName}</p>
              </div>
            </div>
          </div>
          {activeTab === 'profile' && profileSubScreen === 'main' && (
            <button onClick={handleLogout} className="text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
          )}

          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-slate-500 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                  {unreadCount}
                </span>
              )}
            </button>

            <AnimatePresence>
              {showNotifications && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-80 bg-white rounded-3xl shadow-2xl border border-slate-100 z-50 overflow-hidden"
                  >
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                      <h3 className="font-black text-xs uppercase tracking-widest text-slate-900">Notificações</h3>
                      <button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-slate-600">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center">
                          <Bell className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                          <p className="text-xs text-slate-400 font-medium">Sem notificações</p>
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div 
                            key={n.uuidNotificacao} 
                            className={`p-4 border-b border-slate-50 last:border-0 transition-colors ${!n.lida ? 'bg-blue-50/30' : 'hover:bg-slate-50'}`}
                            onClick={() => !n.lida && handleMarkAsRead(n.uuidNotificacao)}
                          >
                            <div className="flex justify-between items-start mb-1">
                              <h4 className={`text-sm font-bold ${!n.lida ? 'text-blue-600' : 'text-slate-900'}`}>{n.titulo}</h4>
                              {!n.lida && <div className="w-2 h-2 bg-blue-600 rounded-full" />}
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed mb-2">{n.mensagem}</p>
                            <span className="text-[10px] font-bold text-slate-300 uppercase">{new Date(n.dataCriacao).toLocaleDateString()}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 mt-8">
        {activeTab === 'home' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-display font-black text-slate-900 tracking-tight">Painel de Controlo</h2>
                <p className="text-slate-400 text-sm font-medium">Gerencie seus serviços ativos e pendentes</p>
              </div>
              <button 
                onClick={() => fetchRequests()}
                className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all border border-slate-100 bg-white shadow-sm"
              >
                <RefreshCcw className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3 text-sm font-black text-green-600 bg-green-50 px-5 py-2.5 rounded-2xl border border-green-100 shadow-sm shadow-green-50">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>
                SISTEMA ONLINE
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {requests.filter(r => r.estadoSolicitacao === 'Pendente' || r.estadoSolicitacao === 'Aceite' || r.estadoSolicitacao === 'Em curso').length === 0 ? (
                <div className="text-center py-24 bg-white rounded-[3rem] border border-slate-100 border-dashed col-span-full">
                  <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Sparkles className="w-10 h-10 text-slate-200" />
                  </div>
                  <p className="text-slate-500 font-black text-lg tracking-tight">Sem serviços ativos no momento.</p>
                  <p className="text-slate-400 text-sm">Fique atento às notificações para novas oportunidades.</p>
                </div>
              ) : (
                requests
                  .filter(r => r.estadoSolicitacao === 'Pendente' || r.estadoSolicitacao === 'Aceite' || r.estadoSolicitacao === 'Em curso')
                  .map((req, idx) => (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.1 }}
                    key={req.uuidSolicitacao} 
                    className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-8 flex flex-col justify-between group hover:shadow-2xl hover:shadow-slate-200/50 transition-all relative overflow-hidden"
                  >
                    {req.estadoSolicitacao === 'Em curso' && (
                      <div className="absolute top-0 left-0 w-full h-1.5 bg-purple-600 animate-pulse" />
                    )}
                    
                    <div className="flex justify-between items-start mb-8">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-4">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-500">
                            {req.nomeCategoria}
                          </span>
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                            req.estadoSolicitacao === 'Pendente' ? 'bg-blue-50 text-blue-600' : 
                            req.estadoSolicitacao === 'Aceite' ? 'bg-green-50 text-green-600' : 
                            req.estadoSolicitacao === 'Em curso' ? 'bg-purple-50 text-purple-600' :
                            req.pagamentoConfirmado ? 'bg-green-100 text-green-700' : 'bg-orange-50 text-orange-600'
                          }`}>
                            {req.estadoSolicitacao === 'Concluido' ? (req.pagamentoConfirmado ? 'Pago' : 'Aguardando Pagamento') : req.estadoSolicitacao}
                          </span>
                          {req.priceTrend && req.estadoSolicitacao === 'Pendente' && (
                            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                              req.priceTrend === 'up' ? 'bg-orange-50 text-orange-600' : 
                              req.priceTrend === 'down' ? 'bg-green-50 text-green-600' : 'bg-slate-50 text-slate-500'
                            }`}>
                              {req.priceTrend === 'up' ? <TrendingUp className="w-3 h-3" /> : 
                               req.priceTrend === 'down' ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                              {req.priceLabel}
                            </div>
                          )}
                        </div>
                        <h3 className="font-display font-black text-slate-900 text-xl leading-tight mb-4 group-hover:text-blue-600 transition-colors">
                          {req.descricaoProblema}
                        </h3>
                        <div className="flex items-center gap-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-blue-600" />
                            {req.zonaAtendimento}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-blue-600" />
                            {req.tipoAtendimento}
                          </div>
                        </div>

                        {(req.estadoSolicitacao === 'Aceite' || req.estadoSolicitacao === 'Em curso') && req.clienteTelefone && (
                          <div className="mt-6 p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="bg-blue-600 p-2 rounded-xl text-white">
                                <Phone className="w-4 h-4" />
                              </div>
                              <div>
                                <p className="text-[8px] font-black text-blue-600 uppercase tracking-widest">Contacto do Cliente</p>
                                <p className="text-sm font-black text-slate-900">{req.clienteTelefone}</p>
                              </div>
                            </div>
                            <a 
                              href={`tel:${req.clienteTelefone}`}
                              className="bg-blue-600 text-white p-2 rounded-xl hover:bg-blue-700 transition-all shadow-md shadow-blue-100"
                            >
                              <Phone className="w-4 h-4" />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-8 border-t border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">
                          {req.estadoSolicitacao === 'Concluido' ? 'Ganhos Líquidos (85%)' : 'Ganhos Estimados'}
                        </span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-display font-black text-slate-900">
                            {req.estadoSolicitacao === 'Concluido' 
                              ? (req.precoFinal * 0.85).toLocaleString('pt-AO', { minimumFractionDigits: 0 }) 
                              : req.precoExibicao?.toLocaleString('pt-AO', { minimumFractionDigits: 0 })} Kz
                          </span>
                          {(req.isBoosted || req.isDiscounted) && (
                            <span className="text-sm text-slate-400 line-through font-medium">
                              {req.precoFinal.toLocaleString('pt-AO', { minimumFractionDigits: 0 })} Kz
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        {req.estadoSolicitacao === 'Pendente' && (
                          <>
                            <button 
                              onClick={() => handleAction(req.uuidSolicitacao, 'accept')}
                              disabled={loadingId === req.uuidSolicitacao}
                              className="flex-1 sm:flex-none bg-blue-600 text-white font-black text-xs uppercase tracking-widest px-8 py-4 rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 active:scale-95 flex items-center justify-center gap-2"
                            >
                              {loadingId === req.uuidSolicitacao ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                              Aceitar
                            </button>
                            <button 
                              onClick={() => handleAction(req.uuidSolicitacao, 'reject')}
                              disabled={loadingId === req.uuidSolicitacao}
                              className="flex-1 sm:flex-none bg-white text-slate-400 border border-slate-100 font-black text-xs uppercase tracking-widest px-8 py-4 rounded-2xl hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all active:scale-95 flex items-center justify-center gap-2"
                              title="Rejeitar Serviço"
                            >
                              {loadingId === req.uuidSolicitacao ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                              Rejeitar
                            </button>
                          </>
                        )}
                        
                        {req.estadoSolicitacao === 'Aceite' && (
                          <button
                            onClick={() => handleAction(req.uuidSolicitacao, 'start')}
                            disabled={loadingId === req.uuidSolicitacao}
                            className="w-full sm:w-auto bg-purple-600 text-white font-black text-xs uppercase tracking-widest px-8 py-4 rounded-2xl hover:bg-purple-700 transition-all shadow-xl shadow-purple-100 active:scale-95 flex items-center justify-center gap-2"
                          >
                            {loadingId === req.uuidSolicitacao ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                            Iniciar
                          </button>
                        )}

                        {req.estadoSolicitacao === 'Em curso' && (
                          <button
                            onClick={() => handleAction(req.uuidSolicitacao, 'complete')}
                            disabled={loadingId === req.uuidSolicitacao}
                            className="w-full sm:w-auto bg-green-600 text-white font-black text-xs uppercase tracking-widest px-8 py-4 rounded-2xl hover:bg-green-700 transition-all shadow-xl shadow-green-100 active:scale-95 flex items-center justify-center gap-2"
                          >
                            {loadingId === req.uuidSolicitacao ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            Concluir
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'map' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-display font-black text-slate-900 tracking-tight">Mapa de Oportunidades</h2>
                <p className="text-slate-400 text-sm font-medium">Visualize serviços próximos a você</p>
              </div>
            </div>

            <div className="bg-white rounded-[3rem] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden relative">
              <div className="relative h-[500px] bg-slate-50 flex items-center justify-center">
                {/* Simulated Map Background with Grid */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-40"></div>
                
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative w-full h-full">
                    {requests.filter(r => r.estadoSolicitacao === 'Pendente').map((req, i) => (
                      <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: i * 0.1, type: "spring" }}
                        key={req.uuidSolicitacao}
                        className="absolute"
                        style={{ 
                          top: `${25 + (i * 17) % 50}%`, 
                          left: `${25 + (i * 23) % 50}%` 
                        }}
                      >
                        <div className="group relative">
                          <div className="bg-blue-600 p-3 rounded-full shadow-2xl cursor-pointer hover:scale-125 transition-transform ring-4 ring-white">
                            <MapPin className="w-5 h-5 text-white" />
                          </div>
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-64 bg-white rounded-[1.5rem] shadow-2xl border border-slate-100 p-5 opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-20 translate-y-2 group-hover:translate-y-0">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{req.nomeCategoria}</span>
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{req.zonaAtendimento}</span>
                            </div>
                            <p className="text-sm font-bold text-slate-900 line-clamp-2 mb-3 leading-tight">{req.descricaoProblema}</p>
                            <div className="flex justify-between items-center pt-3 border-t border-slate-50">
                              <span className="text-sm font-black text-slate-900">{req.precoFinal.toLocaleString('pt-AO')} Kz</span>
                              <div className="flex items-center gap-1 text-[10px] font-black text-blue-600 uppercase tracking-widest">
                                <Navigation className="w-3 h-3" />
                                2.4km
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                    
                    {/* Provider Location */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                      <div className="relative">
                        <div className="absolute inset-0 bg-blue-400 rounded-full animate-ping opacity-20 scale-150"></div>
                        <div className="bg-white p-4 rounded-full shadow-2xl border-4 border-blue-600 relative z-10">
                          <Navigation className="w-8 h-8 text-blue-600 fill-blue-600" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="absolute bottom-8 left-8 right-8 bg-white/80 backdrop-blur-xl p-6 rounded-[2rem] border border-white/50 shadow-2xl flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-100">
                      <Navigation className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900 tracking-tight">Radar de Serviços</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {requests.filter(r => r.estadoSolicitacao === 'Pendente').length} oportunidades encontradas
                      </p>
                    </div>
                  </div>
                  <button className="px-6 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all">Recarregar Mapa</button>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center justify-between group hover:shadow-xl transition-all">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Zona Centro</p>
                  <p className="text-4xl font-display font-black text-slate-900">
                    {requests.filter(r => r.estadoSolicitacao === 'Pendente' && r.zonaAtendimento === 'Centro').length}
                  </p>
                </div>
                <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
                  <MapPin className="w-6 h-6 text-blue-600 group-hover:text-white" />
                </div>
              </div>
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center justify-between group hover:shadow-xl transition-all">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Zona Periferia</p>
                  <p className="text-4xl font-display font-black text-slate-900">
                    {requests.filter(r => r.estadoSolicitacao === 'Pendente' && r.zonaAtendimento === 'Periferia').length}
                  </p>
                </div>
                <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-all">
                  <MapPin className="w-6 h-6 text-slate-400 group-hover:text-white" />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-display font-bold text-slate-900 tracking-tight">Histórico de Concluídos</h2>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                {requests.filter(r => r.estadoSolicitacao === 'Concluido').length} Serviços
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {requests.filter(r => r.estadoSolicitacao === 'Concluido').length === 0 ? (
                <div className="text-center py-20 bg-white rounded-[2.5rem] border border-slate-100 border-dashed col-span-full">
                  <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <History className="w-10 h-10 text-slate-300" />
                  </div>
                  <p className="text-slate-500 font-bold text-lg tracking-tight">Ainda não concluiu nenhum serviço.</p>
                </div>
              ) : (
                requests
                  .filter(r => r.estadoSolicitacao === 'Concluido')
                  .map((req, idx) => (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    key={req.uuidSolicitacao} 
                    className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6 opacity-90 hover:opacity-100 transition-all group"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-green-50 text-green-600">
                        {req.nomeCategoria}
                      </span>
                      <span className="text-lg font-display font-black text-slate-900">
                        {req.precoFinal?.toLocaleString('pt-AO', { minimumFractionDigits: 0 })} Kz
                      </span>
                    </div>
                    <h3 className="text-slate-900 font-bold mb-4 group-hover:text-blue-600 transition-colors">{req.descricaoProblema}</h3>
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest pt-4 border-t border-slate-50">
                      <div className="flex items-center gap-2">
                        <UserIcon className="w-3 h-3" />
                        {req.clienteNome}
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3" />
                        {new Date(req.dataCriacao).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })}
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'earnings' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-display font-black text-slate-900">Meus Ganhos</h2>
              <button 
                onClick={fetchEarnings}
                disabled={isEarningsLoading}
                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all disabled:opacity-50"
              >
                <RefreshCcw className={`w-5 h-5 ${isEarningsLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            {/* Saldo Card */}
            <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-[2.5rem] p-8 text-white shadow-xl shadow-blue-200/50 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <p className="text-blue-100 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Saldo Disponível</p>
                    <h2 className="text-4xl font-display font-black tracking-tight">
                      {earningsData.saldo.toLocaleString('pt-PT', { style: 'currency', currency: 'AOA' })}
                    </h2>
                  </div>
                  <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
                    <Wallet className="w-6 h-6" />
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <button 
                    onClick={() => setIsWithdrawalModalOpen(true)}
                    className="flex-1 bg-white text-blue-600 font-bold py-4 rounded-2xl hover:bg-blue-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20"
                  >
                    <ArrowUpRight className="w-5 h-5" />
                    Levantar Fundo
                  </button>
                </div>
              </div>
            </div>

            {/* Contas Bancárias */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Contas Bancárias</h3>
                <button 
                  onClick={() => setIsBankModalOpen(true)}
                  className="flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Nova Conta
                </button>
              </div>

              <div className="space-y-3">
                {earningsData.contas.length === 0 ? (
                  <div className="bg-white rounded-[2rem] p-8 text-center border border-slate-100 border-dashed">
                    <p className="text-slate-400 text-sm font-medium">Nenhuma conta configurada.</p>
                  </div>
                ) : (
                  earningsData.contas.map((conta) => (
                    <div key={conta.uuidConta} className={`bg-white rounded-3xl p-5 border shadow-sm flex items-center justify-between group transition-all ${conta.isDefault ? 'border-blue-200 bg-blue-50/10' : 'border-slate-100'}`}>
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl ${conta.isDefault ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-400'}`}>
                          <Landmark className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{conta.banco}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{conta.iban}</p>
                          <p className="text-[10px] text-slate-500 font-medium">{conta.titular}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!conta.isDefault && (
                          <button 
                            onClick={() => handleSetDefaultAccount(conta.uuidConta)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            title="Definir como Principal"
                          >
                            <ShieldCheck className="w-4 h-4" />
                          </button>
                        )}
                        <button 
                          onClick={() => handleDeleteBankAccount(conta.uuidConta)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Remover"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Histórico de Transações */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Histórico de Transações</h3>
                <span className="text-[10px] font-bold text-slate-400">{earningsData.transacoes.length} movimentos</span>
              </div>

              <div className="space-y-3">
                {isEarningsLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin mb-2" />
                    <p className="text-xs font-bold uppercase tracking-widest">A carregar movimentos...</p>
                  </div>
                ) : earningsData.transacoes.length === 0 ? (
                  <div className="bg-white rounded-[2rem] p-12 text-center border border-slate-100">
                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <History className="w-8 h-8 text-slate-200" />
                    </div>
                    <p className="text-slate-400 text-sm font-medium">Nenhuma transação registada.</p>
                  </div>
                ) : (
                  earningsData.transacoes.map((tx) => (
                    <motion.div 
                      key={tx.uuidTransacao}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex items-center justify-between group hover:shadow-md transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl ${
                          tx.tipo === 'Ganho' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'
                        }`}>
                          {tx.tipo === 'Ganho' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{tx.descricao}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                            {new Date(tx.data).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-black text-sm ${
                          tx.tipo === 'Ganho' ? 'text-green-600' : 'text-slate-900'
                        }`}>
                          {tx.tipo === 'Ganho' ? '+' : '-'} {tx.valor.toLocaleString('pt-PT', { style: 'currency', currency: 'AOA' })}
                        </p>
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{tx.estado}</p>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {message && (
              <div className={`p-4 rounded-2xl flex items-center gap-3 text-sm font-medium animate-in fade-in zoom-in-95 ${
                message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
              }`}>
                {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                {message.text}
              </div>
            )}

            {profileSubScreen === 'main' && (
              <div className="space-y-6">
                <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 p-10 text-center relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-2 bg-blue-600"></div>
                  <div className="w-28 h-28 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border-4 border-white shadow-xl relative group">
                    <UserIcon className="w-12 h-12 text-slate-300 group-hover:text-blue-600 transition-colors" />
                    <div className="absolute -bottom-2 -right-2 bg-green-500 w-8 h-8 rounded-full border-4 border-white flex items-center justify-center">
                      <ShieldCheck className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <h2 className="text-3xl font-display font-black text-slate-900 tracking-tight mb-1">{userName}</h2>
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-8">Prestador Certificado SAPS</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                    <div className="flex items-center gap-4 p-5 bg-slate-50 rounded-3xl border border-slate-100 group hover:bg-white hover:shadow-lg transition-all">
                      <div className="bg-white p-3 rounded-2xl shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-all">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-0.5">Email Profissional</p>
                        <p className="text-sm font-bold text-slate-700">{userProfile?.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 p-5 bg-slate-50 rounded-3xl border border-slate-100 group hover:bg-white hover:shadow-lg transition-all">
                      <div className="bg-white p-3 rounded-2xl shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-all">
                        <Phone className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-0.5">Contacto</p>
                        <p className="text-sm font-bold text-slate-700">{userProfile?.nTelefone}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                  <button onClick={() => setProfileSubScreen('account')} className="w-full flex items-center justify-between p-6 hover:bg-slate-50 transition-all border-b border-slate-50 group">
                    <div className="flex items-center gap-5">
                      <div className="bg-blue-50 p-3 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-all">
                        <Settings className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <span className="block font-display font-bold text-slate-900">Definições da Conta</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Editar perfil e senha</span>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-300 group-hover:translate-x-1 transition-all" />
                  </button>
                  <button onClick={() => setProfileSubScreen('privacy')} className="w-full flex items-center justify-between p-6 hover:bg-slate-50 transition-all border-b border-slate-50 group">
                    <div className="flex items-center gap-5">
                      <div className="bg-green-50 p-3 rounded-2xl group-hover:bg-green-600 group-hover:text-white transition-all">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <span className="block font-display font-bold text-slate-900">Privacidade e Segurança</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Estado da conta e visibilidade</span>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-300 group-hover:translate-x-1 transition-all" />
                  </button>
                  <button onClick={handleLogout} className="w-full flex items-center justify-between p-5 hover:bg-red-50 transition-colors text-red-600">
                    <div className="flex items-center gap-4">
                      <div className="bg-red-50 p-2 rounded-xl">
                        <LogOut className="w-5 h-5 text-red-600" />
                      </div>
                      <span className="font-bold">Terminar Sessão</span>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {profileSubScreen === 'account' && (
              <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                <section className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <UserIcon className="w-5 h-5 text-blue-600" />
                    Informações Pessoais
                  </h3>
                  <form onSubmit={handleUpdateProfile} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 ml-1">Nome Completo</label>
                      <input 
                        type="text" 
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full rounded-2xl border-gray-200 border px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 ml-1">Telefone</label>
                      <input 
                        type="tel" 
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        className="w-full rounded-2xl border-gray-200 border px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 ml-1">IBAN / Conta Bancária</label>
                      <input 
                        type="text" 
                        value={editBank}
                        onChange={(e) => setEditBank(e.target.value)}
                        placeholder="AO06 0000 0000 0000 0000 0"
                        className="w-full rounded-2xl border-gray-200 border px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50"
                      />
                    </div>
                    <button 
                      type="submit" 
                      disabled={isSubmitting}
                      className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                    >
                      <Save className="w-5 h-5" />
                      {isSubmitting ? 'A guardar...' : 'Guardar Alterações'}
                    </button>
                  </form>
                </section>

                <section className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Lock className="w-5 h-5 text-blue-600" />
                    Alterar Senha
                  </h3>
                  <form onSubmit={handleUpdatePassword} className="space-y-4">
                    <div className="relative">
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 ml-1">Senha Atual</label>
                      <input 
                        type={showPasswords ? 'text' : 'password'} 
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full rounded-2xl border-gray-200 border px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50"
                        required
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPasswords(!showPasswords)}
                        className="absolute right-4 bottom-3.5 text-gray-400 hover:text-gray-600"
                      >
                        {showPasswords ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 ml-1">Nova Senha</label>
                      <input 
                        type={showPasswords ? 'text' : 'password'} 
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full rounded-2xl border-gray-200 border px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50"
                        required
                      />
                    </div>
                    <button 
                      type="submit" 
                      disabled={isSubmitting || !currentPassword || !newPassword}
                      className="w-full bg-gray-900 text-white font-bold py-4 rounded-2xl hover:bg-black transition-all"
                    >
                      {isSubmitting ? 'A processar...' : 'Atualizar Senha'}
                    </button>
                  </form>
                </section>
              </div>
            )}

            {profileSubScreen === 'privacy' && (
              <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                <section className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-green-600" />
                    Estado da Conta
                  </h3>
                  <p className="text-sm text-gray-500 mb-6">Controle a visibilidade e o estado da sua conta no sistema.</p>
                  
                  <div className="space-y-3">
                    <button 
                      onClick={() => handleUpdatePrivacy('Ativo')}
                      className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                        privacyStatus === 'Ativo' ? 'border-green-600 bg-green-50' : 'border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${privacyStatus === 'Ativo' ? 'bg-green-600' : 'bg-gray-300'}`} />
                        <div className="text-left">
                          <p className="font-bold text-gray-900">Ativo</p>
                          <p className="text-xs text-gray-500">Conta visível e funcional.</p>
                        </div>
                      </div>
                      {privacyStatus === 'Ativo' && <CheckCircle2 className="w-5 h-5 text-green-600" />}
                    </button>

                    <button 
                      onClick={() => handleUpdatePrivacy('Inativo')}
                      className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                        privacyStatus === 'Inativo' ? 'border-yellow-600 bg-yellow-50' : 'border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${privacyStatus === 'Inativo' ? 'bg-yellow-600' : 'bg-gray-300'}`} />
                        <div className="text-left">
                          <p className="font-bold text-gray-900">Inativo</p>
                          <p className="text-xs text-gray-500">Pausa temporária na conta.</p>
                        </div>
                      </div>
                      {privacyStatus === 'Inativo' && <CheckCircle2 className="w-5 h-5 text-yellow-600" />}
                    </button>
                  </div>
                </section>
              </div>
            )}

            <div className="text-center">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">SAPS v1.0.0 - Angola</p>
            </div>
          </div>
        )}
      </main>

      <AnimatePresence>
        {isWithdrawalModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsWithdrawalModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-display font-black text-slate-900">Levantar Fundo</h3>
                  <button onClick={() => setIsWithdrawalModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleWithdrawal} className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Valor do Levantamento (AOA)</label>
                    <div className="relative">
                      <input 
                        type="number" 
                        value={withdrawalAmount}
                        onChange={(e) => setWithdrawalAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full rounded-2xl border-slate-100 border-2 px-5 py-4 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 outline-none bg-slate-50 font-bold text-lg transition-all"
                        required
                        min="1"
                        max={earningsData.saldo}
                      />
                      <div className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">AOA</div>
                    </div>
                    <p className="mt-2 text-[10px] font-bold text-slate-400 px-1">
                      Saldo disponível: {earningsData.saldo.toLocaleString('pt-PT', { style: 'currency', currency: 'AOA' })}
                    </p>
                  </div>

                  {error && (
                    <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-xs font-bold">
                      <AlertCircle className="w-4 h-4" />
                      {error}
                    </div>
                  )}

                  <button 
                    type="submit" 
                    disabled={isSubmitting || !withdrawalAmount || parseFloat(withdrawalAmount) > earningsData.saldo}
                    className="w-full bg-blue-600 text-white font-black py-5 rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowUpRight className="w-5 h-5" />}
                    Confirmar Levantamento
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}

        {isBankModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsBankModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-display font-black text-slate-900">Adicionar Conta</h3>
                  <button onClick={() => setIsBankModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleAddBankAccount} className="space-y-5">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Banco</label>
                    <input 
                      type="text" 
                      value={newBank.banco}
                      onChange={(e) => setNewBank({ ...newBank, banco: e.target.value })}
                      placeholder="Ex: BAI, BFA, BIC..."
                      className="w-full rounded-2xl border-slate-100 border-2 px-5 py-3 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 outline-none bg-slate-50 font-bold transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">IBAN</label>
                    <input 
                      type="text" 
                      value={newBank.iban}
                      onChange={(e) => setNewBank({ ...newBank, iban: e.target.value })}
                      placeholder="AO06 ...."
                      className="w-full rounded-2xl border-slate-100 border-2 px-5 py-3 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 outline-none bg-slate-50 font-bold transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Titular da Conta</label>
                    <input 
                      type="text" 
                      value={newBank.titular}
                      onChange={(e) => setNewBank({ ...newBank, titular: e.target.value })}
                      placeholder="Nome Completo"
                      className="w-full rounded-2xl border-slate-100 border-2 px-5 py-3 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 outline-none bg-slate-50 font-bold transition-all"
                      required
                    />
                  </div>

                  <div className="pt-2">
                    <button 
                      type="submit" 
                      disabled={isSubmitting || !newBank.banco || !newBank.iban || !newBank.titular}
                      className="w-full bg-blue-600 text-white font-black py-5 rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                      Adicionar Conta
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3 z-20">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <button 
            onClick={() => { setActiveTab('home'); setProfileSubScreen('main'); }}
            className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'home' ? 'text-blue-600' : 'text-gray-400'}`}
          >
            <LayoutDashboard className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Início</span>
          </button>
          <button 
            onClick={() => { setActiveTab('map'); setProfileSubScreen('main'); }}
            className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'map' ? 'text-blue-600' : 'text-gray-400'}`}
          >
            <MapIcon className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Mapa</span>
          </button>
          <button 
            onClick={() => { setActiveTab('history'); setProfileSubScreen('main'); }}
            className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'history' ? 'text-blue-600' : 'text-gray-400'}`}
          >
            <History className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Histórico</span>
          </button>
          <button 
            onClick={() => { setActiveTab('earnings'); setProfileSubScreen('main'); }}
            className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'earnings' ? 'text-blue-600' : 'text-gray-400'}`}
          >
            <Wallet className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Ganhos</span>
          </button>
          <button 
            onClick={() => { setActiveTab('profile'); setProfileSubScreen('main'); }}
            className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'profile' ? 'text-blue-600' : 'text-gray-400'}`}
          >
            <UserIcon className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Perfil</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
