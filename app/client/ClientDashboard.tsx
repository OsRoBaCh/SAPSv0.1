'use client';

import { useState, useEffect, useCallback } from 'react';
import { createRequest, rateService, updateUserProfile, updateUserPassword, updateUserPrivacy, getNotifications, markNotificationAsRead, confirmPayment, getClientRequests, getProvidersByCategory, logout, toggleBiometrics } from '@/lib/actions';
import { MapPin, Clock, CheckCircle2, AlertCircle, ArrowLeft, Star, Brain, Sparkles, LayoutDashboard, History, User as UserIcon, Settings, Phone, Mail, ShieldCheck, ArrowRight, Save, Lock, Eye, EyeOff, Trash2, TrendingUp, TrendingDown, Minus, Loader2, Bell, X, Wallet, Copy, Check, Filter, Search, Award, Fingerprint, LogOut, Briefcase } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { GoogleGenAI, Type } from "@google/genai";
import { generateAIChecklist, matchTechniciansAI, type ChecklistItem } from '@/lib/ai';

export default function ClientDashboard({ categories, initialRequests, userId, userName, userProfile, settings, accounts }: { categories: any[], initialRequests: any[], userId: string, userName: string, userProfile: any, settings: any[], accounts: any[] }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'home' | 'history' | 'profile'>('home');
  const [profileSubScreen, setProfileSubScreen] = useState<'main' | 'account' | 'privacy' | 'biometrics'>('main');
  
  // Requests state
  const [requests, setRequests] = useState(initialRequests);
  
  const fetchRequests = useCallback(async () => {
    const data = await getClientRequests(userId);
    setRequests(data);
  }, [userId]);

  const platformIban = settings?.find(s => s.chave === 'iban_plataforma')?.valor || 'AO06 0000 0000 0000 0000 0';
  const activeAccounts = accounts?.filter(a => a.ativo === 1) || [];

  // Profile form state
  const [editName, setEditName] = useState(userProfile?.nomeCompleto || userName);
  const [editPhone, setEditPhone] = useState(userProfile?.nTelefone || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [privacyStatus, setPrivacyStatus] = useState(userProfile?.estadoConta || 'Ativo');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning', text: string } | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [description, setDescription] = useState('');
  const [tipoAtendimento, setTipoAtendimento] = useState('Imediato');
  const [dataProgramada, setDataProgramada] = useState('');
  const [complexidade, setComplexidade] = useState('Normal');
  const [zonaAtendimento, setZonaAtendimento] = useState<'Centro' | 'Periferia'>('Centro');
  const [userCoords, setUserCoords] = useState<{ lat: number, lon: number } | null>(null);
  
  // Strategy Pricing State
  const [estimateData, setEstimateData] = useState<{ service: number, travel: number, totalMin: number, totalMax: number, duration: number } | null>(null);
  const [isGettingEstimate, setIsGettingEstimate] = useState(false);
  const [showEstimateStep, setShowEstimateStep] = useState(false);

  const [aiPrices, setAiPrices] = useState<{ Normal: number, Médio: number, Alto: number }>({ Normal: 0, Médio: 0, Alto: 0 });
  const [priceReasoning, setPriceReasoning] = useState('');
  const [isCalculatingPrice, setIsCalculatingPrice] = useState(false);

  // AI Matching state
  const [aiChecklist, setAiChecklist] = useState<ChecklistItem[]>([]);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [isAnalyzingAI, setIsAnalyzingAI] = useState(false);
  const [matchedProviders, setMatchedProviders] = useState<any[]>([]);
  const [isMatchingAI, setIsMatchingAI] = useState(false);
  const [showAIResults, setShowAIResults] = useState(false);
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  
  // Rating state
  const [ratingRequest, setRatingRequest] = useState<string | null>(null);
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  
  // Notifications state
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [copiedIban, setCopiedIban] = useState<string | null>(null);

  const handleCopyIban = (iban: string) => {
    navigator.clipboard.writeText(iban);
    setCopiedIban(iban);
    setTimeout(() => setCopiedIban(null), 2000);
  };
  
  const fetchNotifications = useCallback(async () => {
    const data = await getNotifications(userId);
    setNotifications(data);
  }, [userId]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, [userId, fetchNotifications]);

  const handleMarkAsRead = useCallback(async (id: string) => {
    await markNotificationAsRead(id);
    fetchNotifications();
  }, [fetchNotifications]);

  const unreadCount = notifications.filter(n => !n.lida).length;
  
  // Profile Stats
  const stats = {
    total: requests.length,
    completed: requests.filter((r: any) => r.estadoSolicitacao === 'Concluido').length,
    active: requests.filter((r: any) => r.estadoSolicitacao !== 'Concluido' && r.estadoSolicitacao !== 'Cancelado').length,
    spent: requests.filter((r: any) => r.estadoSolicitacao === 'Concluido' && r.pagamentoConfirmado === 1).reduce((acc: number, r: any) => acc + r.precoFinal, 0)
  };

  // Payment Modal State
  const [paymentModalData, setPaymentModalData] = useState<{ amount: number, serviceName: string, id: string, reference?: string } | null>(null);

  // Detect status changes from notifications
  useEffect(() => {
    const relevantTitles = ['Pedido Aceite', 'Pedido em Curso', 'Pedido Concluído'];
    const statusNotification = notifications.find(n => relevantTitles.includes(n.titulo) && !n.lida);
    
    if (statusNotification) {
      // Refresh requests silently
      fetchRequests();
      // Mark as read to avoid loop
      handleMarkAsRead(statusNotification.uuidNotificacao);
    }
  }, [notifications, handleMarkAsRead, fetchRequests]);

  // Get user location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserCoords({
            lat: position.coords.latitude,
            lon: position.coords.longitude
          });
        },
        (error) => {
          // Fallback to Luanda center if GPS fails
          setUserCoords({ lat: -8.8390, lon: 13.2894 });
          
          let errorMsg = "Erro desconhecido ao obter GPS";
          let severity: 'error' | 'warning' = 'error';

          switch(error.code) {
            case 1: // PERMISSION_DENIED
              errorMsg = "Permissão de GPS bloqueada. Por favor, abra a aplicação num novo separador para permitir o acesso à localização.";
              break;
            case 2: // POSITION_UNAVAILABLE
              errorMsg = "Informação de localização indisponível no momento.";
              severity = 'warning';
              break;
            case 3: // TIMEOUT
              errorMsg = "O tempo de resposta do GPS esgotou. Usando localização padrão.";
              severity = 'warning';
              break;
          }
          
          console.warn(`Aviso de localização GPS (${error.code}): ${error.message || errorMsg}`);
          
          setMessage({ 
            type: severity, 
            text: `${errorMsg} Usando localização padrão (Luanda).` 
          });
        },
        {
          enableHighAccuracy: false,
          timeout: 20000, // Increased timeout to 20 seconds
          maximumAge: 300000 // Cache for 5 minutes
        }
      );
    }
  }, []);

  const selectedCatData = categories.find(c => c.uuidCategoria === selectedCategory);

  const calculatePrice = (level: 'Normal' | 'Médio' | 'Alto') => {
    return aiPrices[level] || 0;
  };

  const prices = {
    'Normal': calculatePrice('Normal'),
    'Médio': calculatePrice('Médio'),
    'Alto': calculatePrice('Alto')
  };

  useEffect(() => {
    if (!selectedCategory || description.length < 5) {
      setAiPrices({ Normal: 0, Médio: 0, Alto: 0 });
      setPriceReasoning('');
      return;
    }

    const calculateDynamicPricing = async () => {
      setIsCalculatingPrice(true);
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });
        const response = await ai.models.generateContent({ 
          model: "gemini-3-flash-preview",
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                priceNormal: { type: Type.NUMBER, description: "Preço de mão de obra Normal em Kz" },
                priceMedio: { type: Type.NUMBER, description: "Preço de mão de obra Médio em Kz" },
                priceAlto: { type: Type.NUMBER, description: "Preço de mão de obra Alto em Kz" },
                zone: { type: Type.STRING, description: "A zona detectada (Centro ou Periferia)" },
                suggestedLevel: { type: Type.STRING, description: "O nível sugerido baseado na descrição (Normal, Médio ou Alto)" },
                reason: { type: Type.STRING, description: "Justificativa curta enfatizando que o preço é apenas mão de obra" }
              },
              required: ["priceNormal", "priceMedio", "priceAlto", "zone", "suggestedLevel", "reason"]
            }
          },
          contents: `Analize a seguinte solicitação de serviço para determinar os valores de MÃO DE OBRA (Labor).
          O PREÇO É DINÂMICO E DEVE REFLETIR A REALIDADE ECONÓMICA DE LUANDA, ANGOLA.
          
          Contexto de Mercado:
          - A Mão de Obra deve ser acessível e competitiva. Evite preços inflacionados.
          - Valor de Mercado de Referência para esta categoria: ${selectedCatData?.precoBase ?? '2500'} Kz.
          - Use este valor apenas como âncora inicial e ajuste conforme o esforço real.
          
          Considere para o AJUSTE REAL:
          1. DEMANDA: Urgência e horário (serviços noturnos ou imediatos podem ter pequeno acréscimo).
          2. DIFICULDADE: Complexidade técnica real (não superestime tarefas simples).
          3. RISCO: Riscos envolvidos.
          4. LOCALIZAÇÃO: Custos de deslocação para ${zonaAtendimento || 'Centro'}.
          
          IMPORTANTE: O valor é APENAS mão de obra. Materiais são à parte.
          
          Dados do Pedido:
          Categoria: ${selectedCatData?.nomeCategoria}
          Descrição: ${description}
          Tipo: ${tipoAtendimento}
          Hora: ${new Date().toLocaleTimeString()}
          
          Retorne os valores sugeridos para 3 níveis de complexidade em Kz. Seja realista e justo.`
        });

        const resultText = response && response.text ? response.text.trim() : '';
        const data = JSON.parse(resultText || '{"priceNormal": 0, "priceMedio": 0, "priceAlto": 0, "zone": "Centro", "suggestedLevel": "Normal", "reason": "Erro no cálculo."}');
        
        if (data.priceNormal > 0) {
          setAiPrices({
            Normal: data.priceNormal,
            Médio: data.priceMedio,
            Alto: data.priceAlto
          });
          setZonaAtendimento(prev => prev !== data.zone ? (data.zone || 'Centro') : prev);
          setComplexidade(prev => prev !== data.suggestedLevel ? (data.suggestedLevel || 'Normal') : prev);
          setPriceReasoning(data.reason || '');
        }
      } catch (error: any) {
        console.error("Erro ao calcular preço dinâmico:", error);
        // If it's a "Failed to fetch", it's likely a network issue with Gemini API
        if (error.message?.includes('fetch')) {
          setMessage({ type: 'error', text: 'Erro ao contactar serviço de IA. Verifique a sua ligação.' });
        }
      } finally {
        setIsCalculatingPrice(false);
      }
    };

    const debounceTimer = setTimeout(calculateDynamicPricing, 1000);
    return () => clearTimeout(debounceTimer);
  }, [selectedCategory, description, selectedCatData, userCoords, tipoAtendimento, zonaAtendimento]);

  const handleLogout = async () => {
    await logout();
  };

  const handleToggleBiometrics = async (enabled: boolean) => {
    setIsSubmitting(true);
    try {
      const credentialId = enabled ? `cred_${Math.random().toString(36).substring(7)}` : undefined;
      const publicKey = enabled ? `pub_${Math.random().toString(36).substring(7)}` : undefined;
      
      const res = await toggleBiometrics(userId, enabled, credentialId, publicKey);
      if (res.success) {
        // Success
      } else {
        alert('Erro ao alterar biometria');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAnalyzeWithAI = async () => {
    if (!selectedCategory || !description) {
      setMessage({ type: 'error', text: 'Selecione uma categoria e descreva o problema primeiro.' });
      return;
    }
    
    setIsAnalyzingAI(true);
    try {
      const data = await generateAIChecklist(selectedCatData?.nomeCategoria || 'Serviço', description);
      setAiChecklist(data.checklist);
      setSuggestedTags(data.suggestedTags);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzingAI(false);
    }
  };

  const handleMatchWithAI = async () => {
    if (!selectedCategory) return;
    setIsMatchingAI(true);
    try {
      const providers = await getProvidersByCategory(selectedCategory);
      const matches = await matchTechniciansAI(description, aiChecklist, providers);
      
      const enrichedProviders = providers.map((p: any) => {
        const match = matches.find((m: any) => m.uuidUtilizador === p.uuidUtilizador);
        return { ...p, ...match };
      }).sort((a: any, b: any) => (b.matchScore || 0) - (a.matchScore || 0));
      
      setMatchedProviders(enrichedProviders);
      setShowAIResults(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsMatchingAI(false);
    }
  };

  const calculateEstimate = async () => {
    if (!selectedCategory || !description) return;
    setIsGettingEstimate(true);
    try {
      const { getSmartEstimate } = await import('@/lib/actions');
      const data = await getSmartEstimate(selectedCategory, complexidade, zonaAtendimento);
      setEstimateData(data);
      setShowEstimateStep(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGettingEstimate(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory || !description) return;
    if (tipoAtendimento === 'Agendado' && !dataProgramada) return;
    
    setIsSubmitting(true);
    try {
      const res = await createRequest({
        uuidCliente: userId,
        uuidCategoria: selectedCategory,
        descricaoProblema: description,
        lat: userCoords?.lat || -8.8368, // Default to Luanda coords if GPS fails
        lon: userCoords?.lon || 13.2331,
        tipoAtendimento,
        dataProgramada: tipoAtendimento === 'Agendado' ? new Date(dataProgramada).toISOString() : new Date().toISOString(),
        complexidade,
        zonaAtendimento,
        precoFinal: estimateData?.totalMin || prices[complexidade as keyof typeof prices],
        uuidPrestador: selectedProviderId || undefined,
        iaJustificativaPreco: priceReasoning
      });
      if (res.success) {
        await fetchRequests();
        setSelectedCategory('');
        setDescription('');
        setTipoAtendimento('Imediato');
        setDataProgramada('');
        setComplexidade('Normal');
        setZonaAtendimento('Centro');
        setAiPrices({ Normal: 0, Médio: 0, Alto: 0 });
        setPriceReasoning('');
        setAiChecklist([]);
        setSuggestedTags([]);
        setSelectedProviderId(null);
        setMatchedProviders([]);
        setShowAIResults(false);
        setEstimateData(null);
        setShowEstimateStep(false);
        setMessage({ type: 'success', text: 'Pedido enviado com sucesso!' });
        setActiveTab('history'); 
      } else {
        setMessage({ type: 'error', text: res.error || 'Erro ao enviar pedido' });
      }
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: 'Erro de conexão' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRate = async (requestId: string) => {
    try {
      setIsSubmitting(true);
      const res = await rateService(requestId, ratingValue, ratingComment);
      if (res.success) {
        await fetchRequests();
        setRatingRequest(null);
        setRatingValue(5);
        setRatingComment('');
        setMessage({ type: 'success', text: 'Avaliação enviada com sucesso!' });
      } else {
        setMessage({ type: 'error', text: res.error || 'Erro ao enviar avaliação' });
      }
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: 'Erro de conexão' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    try {
      const res = await updateUserProfile(userId, { nomeCompleto: editName, nTelefone: editPhone });
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pendente': return 'bg-yellow-100 text-yellow-800';
      case 'Aceite': return 'bg-blue-100 text-blue-800';
      case 'Em curso': return 'bg-purple-100 text-purple-800';
      case 'Aguardando Aprovação Preço': return 'bg-indigo-100 text-indigo-800';
      case 'Concluido': return 'bg-green-100 text-green-800';
      case 'Cancelado': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <>
      <div className="min-h-screen bg-slate-50/50 pb-24 font-sans">
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-4 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            {profileSubScreen !== 'main' ? (
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
                  {activeTab === 'home' && 'Pedir Serviço'}
                  {activeTab === 'history' && 'Meus Pedidos'}
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
            <div className="w-10" />
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

      {/* Payment Modal */}
      <AnimatePresence>
        {paymentModalData && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100"
            >
              <div className="bg-blue-600 p-10 text-center text-white relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                <div className="bg-white/20 w-20 h-20 rounded-3xl backdrop-blur-md flex items-center justify-center mx-auto mb-6 shadow-xl">
                  <Wallet className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-3xl font-display font-black tracking-tight mb-2">Pagamento do Serviço</h2>
                <p className="text-blue-100 text-sm font-medium">O seu serviço de {paymentModalData.serviceName} foi concluído!</p>
              </div>

              <div className="p-10 space-y-8">
                <div className="text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Valor Total a Pagar</p>
                  <div className="text-5xl font-display font-black text-slate-900 tracking-tighter">
                    {paymentModalData.amount.toLocaleString('pt-AO', { minimumFractionDigits: 0 })} Kz
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-slate-50 rounded-[2rem] p-6 border border-slate-100">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contas para Pagamento (SAPS)</span>
                      <ShieldCheck className="w-4 h-4 text-green-500" />
                    </div>
                    <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                      {activeAccounts.length > 0 ? activeAccounts.map((account: any) => (
                        <div key={account.uuidConta} className="bg-white p-4 rounded-2xl border border-slate-200">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-black text-blue-600 uppercase">{account.banco}</span>
                            <button 
                              onClick={() => handleCopyIban(account.iban)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            >
                              {copiedIban === account.iban ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                            </button>
                          </div>
                          <code className="text-xs font-mono font-bold text-slate-700 block mb-1">{account.iban}</code>
                          <p className="text-[8px] font-medium text-slate-400 truncate">{account.titular}</p>
                        </div>
                      )) : (
                        <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center">
                          <code className="text-sm font-mono font-bold text-slate-700">{platformIban}</code>
                          <button 
                            onClick={() => handleCopyIban(platformIban)}
                            className="ml-2 p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-flex"
                          >
                            {copiedIban === platformIban ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {paymentModalData.reference && (
                    <div className="bg-blue-50/50 rounded-[2rem] p-6 border border-blue-100">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Referência de Pagamento</span>
                        <Sparkles className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="bg-white p-4 rounded-2xl border border-blue-200 text-center">
                        <code className="text-lg font-mono font-black text-blue-700 tracking-wider">{paymentModalData.reference}</code>
                      </div>
                      <p className="mt-4 text-[10px] text-blue-500 font-bold leading-relaxed text-center uppercase tracking-widest">
                        Use esta referência para identificar o seu pagamento
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-3">
                  <button 
                    onClick={async () => {
                      setIsSubmitting(true);
                      const res = await confirmPayment(paymentModalData.id);
                      if (res.success) {
                        await fetchRequests();
                        setPaymentModalData(null);
                        setMessage({ type: 'success', text: 'Pagamento confirmado com sucesso!' });
                      } else {
                        setMessage({ type: 'error', text: res.error || 'Erro ao confirmar pagamento' });
                      }
                      setIsSubmitting(false);
                    }}
                    disabled={isSubmitting}
                    className="w-full bg-blue-600 text-white font-display font-black py-6 rounded-[2rem] hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 active:scale-95 flex items-center justify-center gap-3"
                  >
                    {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Já Efetuei o Pagamento'}
                  </button>
                  <button 
                    onClick={() => setPaymentModalData(null)}
                    className="w-full bg-slate-100 text-slate-600 font-display font-black py-4 rounded-[2rem] hover:bg-slate-200 transition-all active:scale-95 text-sm"
                  >
                    Pagar Mais Tarde
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <main className="max-w-5xl mx-auto px-4 mt-6">
        {message && (
          <div className={`mb-6 p-4 rounded-2xl flex items-center gap-3 text-sm font-medium animate-in fade-in zoom-in-95 ${
            message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
          }`}>
            {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            {message.text}
          </div>
        )}
        {activeTab === 'home' && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Categorias Populares */}
            <section>
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-display font-black text-slate-900 tracking-tight">O que precisa hoje?</h2>
                  <p className="text-slate-400 text-sm font-medium">Selecione uma categoria para começar</p>
                </div>
                <button 
                  onClick={() => setActiveTab('history')}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-colors"
                >
                  Ver Todas
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6">
                {categories.map((c, idx) => {
                  const imageKeywords: Record<string, string> = {
                    'Canalização': 'plumbing',
                    'Eletricidade': 'electricity',
                    'Limpeza': 'cleaning',
                    'Mecânica': 'mechanic',
                    'Climatização': 'air-conditioner'
                  };
                  const keyword = imageKeywords[c.nomeCategoria] || 'service';
                  
                  return (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      key={c.uuidCategoria}
                      onClick={() => setSelectedCategory(c.uuidCategoria)}
                      className={`group relative flex flex-col items-center p-6 rounded-[2.5rem] transition-all duration-500 ${
                        selectedCategory === c.uuidCategoria 
                        ? 'bg-blue-600 text-white shadow-2xl shadow-blue-200 ring-8 ring-blue-50' 
                        : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50'
                      }`}
                    >
                      <div className="relative w-16 h-16 mb-4 rounded-2xl overflow-hidden bg-slate-100 group-hover:scale-110 transition-transform duration-500">
                        <Image 
                          src={`https://picsum.photos/seed/${keyword}/200/200`} 
                          alt={c.nomeCategoria}
                          fill
                          className="object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div className={`absolute inset-0 bg-blue-600/20 opacity-0 group-hover:opacity-100 transition-opacity ${selectedCategory === c.uuidCategoria ? 'opacity-40' : ''}`} />
                      </div>
                      <span className={`text-xs font-black text-center leading-tight tracking-tight uppercase ${selectedCategory === c.uuidCategoria ? 'text-white' : 'text-slate-900'}`}>
                        {c.nomeCategoria}
                      </span>
                      {selectedCategory === c.uuidCategoria && (
                        <motion.div 
                          layoutId="active-cat"
                          className="absolute -top-2 -right-2 bg-white text-blue-600 p-1.5 rounded-full shadow-lg"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </motion.div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </section>

            {/* Nova Solicitação */}
            <section className="relative overflow-hidden">
              <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-blue-50 rounded-full blur-3xl opacity-50" />
              <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-indigo-50 rounded-full blur-3xl opacity-50" />
              
              <div className="relative bg-white rounded-[3rem] shadow-2xl shadow-slate-200/60 border border-slate-100 p-10 md:p-12">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center shadow-xl shadow-blue-100">
                      <Sparkles className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-display font-black text-slate-900 tracking-tight">Configurar Pedido</h2>
                      <p className="text-slate-400 text-sm font-medium">Preencha os detalhes para encontrar um técnico</p>
                    </div>
                  </div>
                  
                  {selectedCategory && (
                    <div className="bg-slate-50 px-6 py-3 rounded-2xl border border-slate-100 flex items-center gap-3">
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                      <span className="text-xs font-black text-slate-600 uppercase tracking-widest">
                        {selectedCatData?.nomeCategoria}
                      </span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                    <div className="lg:col-span-7 space-y-10">
                      <AnimatePresence mode='wait'>
                        {!showEstimateStep ? (
                          <motion.div 
                            key="input-step"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-10"
                          >
                            <div className="space-y-4">
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Complexidade do Problema</label>
                              <div className="grid grid-cols-3 gap-3 p-1.5 bg-slate-100 rounded-[1.5rem]">
                                {(['Simples', 'Normal', 'Complexo'] as const).map((c) => (
                                  <button
                                    key={c}
                                    type="button"
                                    onClick={() => setComplexidade(c)}
                                    className={`py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${complexidade === c ? 'bg-white text-blue-600 shadow-xl' : 'text-slate-500 hover:text-slate-700'}`}
                                  >
                                    {c}
                                  </button>
                                ))}
                              </div>
                              <p className="text-[10px] text-slate-400 font-bold px-2 italic">
                                {complexidade === 'Simples' && 'Estimativa automática baseada em tarefas comuns.'}
                                {complexidade === 'Normal' && 'Faixa de preço sugerida pelo sistema.'}
                                {complexidade === 'Complexo' && 'Requer orçamentos detalhados dos técnicos.'}
                              </p>
                            </div>

                            <div className="space-y-4">
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">O que está a acontecer?</label>
                              <textarea 
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={5}
                                className="w-full rounded-3xl border-slate-100 border-2 bg-slate-50/30 px-6 py-5 focus:ring-8 focus:ring-blue-50 focus:border-blue-600 focus:bg-white outline-none resize-none font-medium text-slate-700 transition-all text-lg placeholder:text-slate-300"
                                placeholder="Ex: Tomada não funciona / Torneira a pingar..."
                                required
                              />

                              <div className="flex flex-wrap items-center gap-3">
                                <button
                                  type="button"
                                  onClick={handleAnalyzeWithAI}
                                  disabled={isAnalyzingAI || !description || !selectedCategory}
                                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 disabled:opacity-50 transition-all shadow-lg shadow-blue-100"
                                >
                                  {isAnalyzingAI ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                                  Refinar com IA
                                </button>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                              <div className="space-y-4">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Urgência</label>
                                <div className="flex p-1.5 bg-slate-100 rounded-[1.5rem]">
                                  <button 
                                    type="button"
                                    onClick={() => setTipoAtendimento('Imediato')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${tipoAtendimento === 'Imediato' ? 'bg-white text-blue-600 shadow-xl' : 'text-slate-500 hover:text-slate-700'}`}
                                  >
                                    <Sparkles className="w-4 h-4" />
                                    Agora
                                  </button>
                                  <button 
                                    type="button"
                                    onClick={() => setTipoAtendimento('Agendado')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${tipoAtendimento === 'Agendado' ? 'bg-white text-blue-600 shadow-xl' : 'text-slate-500 hover:text-slate-700'}`}
                                  >
                                    <Clock className="w-4 h-4" />
                                    Depois
                                  </button>
                                </div>
                              </div>

                              <div className="space-y-4">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Zona</label>
                                <div className="flex p-1.5 bg-slate-100 rounded-[1.5rem]">
                                  {(['Centro', 'Periferia'] as const).map((z) => (
                                    <button
                                      key={z}
                                      type="button"
                                      onClick={() => setZonaAtendimento(z)}
                                      className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${zonaAtendimento === z ? 'bg-white text-blue-600 shadow-xl' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                      {z}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={calculateEstimate}
                              disabled={!selectedCategory || !description || isGettingEstimate}
                              className="w-full bg-slate-900 text-white font-display font-black text-lg py-5 px-8 rounded-2xl hover:bg-black transition-all flex items-center justify-center gap-3"
                            >
                              {isGettingEstimate ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Ver Estimativa'}
                              <ArrowRight className="w-5 h-5" />
                            </button>
                          </motion.div>
                        ) : (
                          <motion.div 
                            key="estimate-step"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="bg-white rounded-[2.5rem] border border-slate-200 p-10 space-y-8 relative overflow-hidden"
                          >
                             <div className="absolute top-0 right-0 p-4">
                              <button onClick={() => setShowEstimateStep(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-900 transition-all">
                                <X className="w-5 h-5" />
                              </button>
                            </div>

                            <div>
                              <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-4">💰 Estratégia de Preço SAPS</p>
                              <div className="flex items-center gap-4 mb-8">
                                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                                  <Briefcase className="w-6 h-6 text-slate-900" />
                                </div>
                                <div className="flex-1">
                                  <h4 className="font-display font-black text-xl text-slate-900">Serviço: {selectedCatData?.nomeCategoria}</h4>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                    <MapPin className="w-3 h-3 text-red-500" />
                                    {zonaAtendimento} • <span className="text-slate-900">{description}</span>
                                  </p>
                                </div>
                              </div>

                              <div className="space-y-4 border-t border-b border-slate-100 py-8">
                                <div className="flex justify-between items-center text-sm">
                                  <div className="flex items-center gap-2 font-medium text-slate-500">
                                    <TrendingUp className="w-4 h-4" /> Deslocamento
                                  </div>
                                  <div className="font-black text-slate-900">{estimateData?.travel.toLocaleString()} Kz</div>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                  <div className="flex items-center gap-2 font-medium text-slate-500">
                                    <CheckCircle2 className="w-4 h-4 text-green-500" /> Serviço ({complexidade})
                                  </div>
                                  <div className="font-black text-slate-900">{estimateData?.service.toLocaleString()} Kz</div>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                  <div className="flex items-center gap-2 font-medium text-slate-500">
                                    <Clock className="w-4 h-4 text-blue-500" /> Tempo Estimado
                                  </div>
                                  <div className="font-black text-slate-900">{estimateData?.duration}h</div>
                                </div>
                              </div>

                              <div className="bg-slate-50 rounded-[2rem] p-8 text-center mt-8">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Estimado</p>
                                <div className="text-4xl font-display font-black text-slate-900 tracking-tighter">
                                  {estimateData?.totalMin.toLocaleString()} - {estimateData?.totalMax.toLocaleString()} Kz
                                </div>
                                <p className="mt-4 text-[10px] text-slate-400 font-bold uppercase tracking-wide leading-tight">
                                  ⚠️ RN01: O valor final depende de avaliação presencial.<br/>
                                  Ajustes feitos pelo técnico exigem sua aprovação (RN03).
                                </p>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-10">
                                <button
                                  type="button"
                                  onClick={handleSubmit}
                                  disabled={isSubmitting}
                                  className="w-full bg-slate-900 text-white font-display font-black text-lg py-5 rounded-2xl hover:bg-black transition-all flex items-center justify-center gap-3"
                                >
                                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirmar Pedido'}
                                  <Check className="w-5 h-5" />
                                </button>
                                
                                <button
                                  type="button"
                                  onClick={() => {
                                    setComplexidade('Complexo');
                                    handleSubmit({ preventDefault: () => {} } as any);
                                  }}
                                  className="w-full bg-blue-600 text-white font-display font-black text-lg py-5 rounded-2xl hover:bg-blue-700 transition-all flex items-center justify-center gap-3"
                                >
                                  Receber Orçamentos
                                  <Sparkles className="w-5 h-5" />
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="lg:col-span-5 space-y-8">
                      {/* Pricing AI (Still available as complementary data) */}
                      <div className="bg-slate-50/50 rounded-[2.5rem] p-8 border border-slate-100">
                        <div className="flex items-center gap-3 mb-6">
                          <Eye className="w-4 h-4 text-blue-600" />
                          <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Inteligência de Mercado</h3>
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold leading-relaxed mb-6">
                          O SAPS analisa o histórico de serviços em {zonaAtendimento} para garantir orçamentos justos.
                        </p>
                        {priceReasoning && (
                          <div className="bg-white p-4 rounded-2xl border border-slate-100">
                             <p className="text-[10px] text-slate-600 font-medium leading-relaxed italic">&quot;{priceReasoning}&quot;</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}

        {activeTab === 'history' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-display font-black text-slate-900 tracking-tight">Meus Pedidos</h2>
              <button 
                onClick={fetchRequests}
                className="p-2 text-slate-400 hover:text-blue-600 transition-colors bg-white rounded-xl shadow-sm border border-slate-100"
                title="Atualizar"
              >
                <TrendingUp className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {requests.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-[2.5rem] border border-slate-100 border-dashed col-span-full">
                <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <History className="w-10 h-10 text-slate-300" />
                </div>
                <p className="text-slate-500 font-bold text-lg mb-2 tracking-tight">Ainda não fez nenhum pedido.</p>
                <p className="text-slate-400 text-sm mb-6">Comece agora e receba assistência profissional.</p>
                <button onClick={() => setActiveTab('home')} className="bg-blue-600 text-white font-bold py-3 px-8 rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100">
                  Fazer meu primeiro pedido
                </button>
              </div>
            ) : (
                requests.map((req: any, idx: number) => (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.1 }}
                  key={req.uuidSolicitacao} 
                  className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6 hover:shadow-xl hover:shadow-slate-200/50 transition-all flex flex-col justify-between group relative overflow-hidden"
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-4">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-500">
                          {req.nomeCategoria}
                        </span>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${getStatusColor(req.estadoSolicitacao)}`}>
                          {req.estadoSolicitacao}
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
                      <h3 className="font-display font-black text-slate-900 text-xl leading-tight mb-3 group-hover:text-blue-600 transition-colors">
                        {req.descricaoProblema.length > 60 ? req.descricaoProblema.substring(0, 60) + '...' : req.descricaoProblema}
                      </h3>
                      <div className="flex items-center gap-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-blue-600" />
                          {req.tipoAtendimento}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-blue-600" />
                          {req.zonaAtendimento}
                        </div>
                      </div>

                      {(req.estadoSolicitacao === 'Aceite' || req.estadoSolicitacao === 'Em curso') && req.prestadorTelefone && (
                        <div className="mt-4 p-3 bg-green-50 rounded-2xl border border-green-100 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="bg-green-600 p-2 rounded-xl text-white">
                              <Phone className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-[8px] font-black text-green-600 uppercase tracking-widest">Contacto do Técnico</p>
                              <p className="text-sm font-black text-slate-900">{req.prestadorTelefone}</p>
                            </div>
                          </div>
                          <a 
                            href={`tel:${req.prestadorTelefone}`}
                            className="bg-green-600 text-white p-2 rounded-xl hover:bg-green-700 transition-all shadow-md shadow-green-100"
                          >
                            <Phone className="w-4 h-4" />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="pt-6 border-t border-slate-50 flex items-end justify-between">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Preço Final</span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-display font-black text-slate-900">
                          {req.precoExibicao?.toLocaleString('pt-AO', { minimumFractionDigits: 0 })} Kz
                        </span>
                        {(req.isBoosted || req.isDiscounted) && (
                          <span className="text-xs text-slate-400 line-through font-medium">
                            {req.precoFinal.toLocaleString('pt-AO', { minimumFractionDigits: 0 })} Kz
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      {req.estadoSolicitacao === 'Aguardando Aprovação Preço' && (
                        <button
                          onClick={async () => {
                            setIsSubmitting(true);
                            const { approvePriceChange } = await import('@/lib/actions');
                            const res = await approvePriceChange(req.uuidSolicitacao);
                            if (res.success) {
                              await fetchRequests();
                              setMessage({ type: 'success', text: 'Ajuste de preço aprovado!' });
                            }
                            setIsSubmitting(false);
                          }}
                          className="bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 mb-2"
                        >
                          Aprovar Novo Preço
                        </button>
                      )}
                      {req.estadoSolicitacao === 'Concluido' && (
                        <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${req.pagamentoConfirmado ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                          {req.pagamentoConfirmado ? 'Pago' : 'Pendente de Pagamento'}
                        </div>
                      )}
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Solicitado em</span>
                        <span className="text-xs font-bold text-slate-600">
                          {new Date(req.dataCriacao).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {req.referenciaPagamento && req.estadoSolicitacao === 'Concluido' && !req.pagamentoConfirmado && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-xl border border-blue-100 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Referência</span>
                        <span className="text-xs font-mono font-black text-blue-700">{req.referenciaPagamento}</span>
                      </div>
                      <button 
                        onClick={() => setPaymentModalData({
                          amount: req.precoFinal,
                          serviceName: req.nomeCategoria,
                          id: req.uuidSolicitacao,
                          reference: req.referenciaPagamento
                        })}
                        className="px-3 py-1.5 bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest rounded-lg shadow-lg shadow-blue-100"
                      >
                        Pagar Agora
                      </button>
                    </div>
                  )}

                  {req.estadoSolicitacao === 'Concluido' && req.pagamentoConfirmado === 1 && !req.avaliacaoCliente && ratingRequest !== req.uuidSolicitacao && (
                    <button onClick={() => setRatingRequest(req.uuidSolicitacao)} className="mt-6 w-full bg-slate-900 text-white text-xs font-black uppercase tracking-widest py-4 rounded-2xl hover:bg-blue-600 transition-all shadow-lg shadow-slate-200">
                      Avaliar Serviço
                    </button>
                  )}

                  {req.estadoSolicitacao === 'Concluido' && req.avaliacaoCliente && (
                    <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                      <div className="flex items-center gap-1 text-yellow-500">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`w-3.5 h-3.5 ${i < req.avaliacaoCliente ? 'fill-current' : 'text-gray-200'}`} />
                        ))}
                      </div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sua avaliação</span>
                    </div>
                  )}

                  {ratingRequest === req.uuidSolicitacao && (
                    <div className="mt-4 pt-4 border-t border-gray-100 space-y-4 animate-in zoom-in-95 duration-300">
                      <p className="text-sm font-bold text-gray-900 text-center">Como avalia o serviço?</p>
                      <div className="flex justify-center gap-2">
                        {[1, 2, 3, 4, 5].map(star => (
                          <button key={star} onClick={() => setRatingValue(star)} className={`p-1 hover:scale-125 transition-transform ${star <= ratingValue ? 'text-yellow-500' : 'text-gray-200'}`}>
                            <Star className="w-8 h-8 fill-current" />
                          </button>
                        ))}
                      </div>
                      <textarea 
                        value={ratingComment}
                        onChange={(e) => setRatingComment(e.target.value)}
                        placeholder="Conte-nos mais sobre a sua experiência..."
                        className="w-full text-sm rounded-2xl border-gray-200 border px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none resize-none bg-gray-50"
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <button onClick={() => handleRate(req.uuidSolicitacao)} className="flex-1 bg-blue-600 text-white text-sm font-bold py-3 rounded-xl hover:bg-blue-700 shadow-md shadow-blue-100">
                          Enviar
                        </button>
                        <button onClick={() => setRatingRequest(null)} className="flex-1 bg-gray-100 text-gray-700 text-sm font-bold py-3 rounded-xl hover:bg-gray-200">
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))
            )}
          </div>
        </div>
      )}

        {activeTab === 'profile' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {message && (
              <div className={`p-4 rounded-2xl flex items-center gap-3 text-sm font-medium animate-in fade-in zoom-in-95 ${
                message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 
                message.type === 'warning' ? 'bg-yellow-50 text-yellow-700 border border-yellow-100' :
                'bg-red-50 text-red-700 border border-red-100'
              }`}>
                {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : 
                 message.type === 'warning' ? <AlertCircle className="w-5 h-5" /> :
                 <AlertCircle className="w-5 h-5" />}
                {message.text}
              </div>
            )}
            {profileSubScreen === 'main' && (
              <div className="space-y-8">
                {/* Profile Header Hero */}
                <div className="relative bg-white rounded-[3rem] shadow-2xl shadow-slate-200/60 overflow-hidden border border-slate-100">
                  <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-blue-600 to-indigo-700" />
                  <div className="relative pt-12 md:pt-16 px-6 md:px-8 pb-8 md:pb-10 text-center">
                    <div className="inline-block relative">
                      <div className="w-24 h-24 md:w-32 md:h-32 bg-white rounded-full flex items-center justify-center mx-auto border-[6px] border-white shadow-xl relative z-10">
                        <UserIcon className="w-12 h-12 md:w-16 md:h-16 text-slate-900" />
                      </div>
                      <div className="absolute -bottom-1 -right-1 bg-green-500 w-6 h-6 md:w-8 md:h-8 rounded-full border-4 border-white z-20" />
                    </div>
                    <h2 className="mt-4 text-2xl md:text-3xl font-display font-black text-slate-900 tracking-tight">{userName}</h2>
                    <p className="text-slate-400 text-[10px] md:text-sm font-bold uppercase tracking-widest mt-1">Nível Bronze • Membro desde 2024</p>
                    
                    <div className="grid grid-cols-3 gap-3 md:gap-6 mt-8 md:mt-10">
                      <div className="bg-slate-50/50 rounded-2xl md:rounded-3xl p-3 md:p-4 border border-slate-100 flex flex-col items-center">
                        <span className="text-xl md:text-2xl font-display font-black text-slate-900">{stats.total}</span>
                        <span className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Pedidos</span>
                      </div>
                      <div className="bg-slate-50/50 rounded-2xl md:rounded-3xl p-3 md:p-4 border border-slate-100 flex flex-col items-center">
                        <span className="text-xl md:text-2xl font-display font-black text-blue-600">{stats.completed}</span>
                        <span className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Concluídos</span>
                      </div>
                      <div className="bg-slate-50/50 rounded-2xl md:rounded-3xl p-3 md:p-4 border border-slate-100 flex flex-col items-center">
                        <span className="text-xl md:text-2xl font-display font-black text-emerald-600">
                          {stats.spent > 1000 ? `${(stats.spent / 1000).toFixed(1)}k` : stats.spent}
                        </span>
                        <span className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Investido</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bento Grid Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <motion.div 
                      whileHover={{ y: -4 }}
                      className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100"
                    >
                      <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-50 rounded-xl flex items-center justify-center mb-4">
                        <Mail className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
                      </div>
                      <p className="text-[9px] md:text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Email Principal</p>
                      <p className="text-md md:text-lg font-bold text-slate-900 truncate">{userProfile?.email}</p>
                    </motion.div>
                    
                    <motion.div 
                      whileHover={{ y: -4 }}
                      className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100"
                    >
                      <div className="w-8 h-8 md:w-10 md:h-10 bg-indigo-50 rounded-xl flex items-center justify-center mb-4">
                        <Phone className="w-4 h-4 md:w-5 md:h-5 text-indigo-600" />
                      </div>
                      <p className="text-[9px] md:text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Contacto Telefónico</p>
                      <p className="text-md md:text-lg font-bold text-slate-900">{userProfile?.nTelefone || 'Não definido'}</p>
                    </motion.div>
                  </div>

                {/* Action Cards */}
                <div className="space-y-4">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] ml-2">Definições</h3>
                  <div className="bg-white rounded-[3rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                    <button 
                      onClick={() => setProfileSubScreen('account')} 
                      className="w-full flex items-center justify-between p-6 md:p-8 hover:bg-slate-50 transition-all group"
                    >
                      <div className="flex items-center gap-4 md:gap-6">
                        <div className="bg-blue-600/10 p-3 md:p-4 rounded-2xl group-hover:scale-110 transition-transform">
                          <Settings className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
                        </div>
                        <div className="text-left">
                          <span className="block font-display font-black text-slate-900 text-md md:text-lg">Informações de Perfil</span>
                          <span className="text-[10px] md:text-xs text-slate-400 font-medium italic">Gerir nome e telefone</span>
                        </div>
                      </div>
                      <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
                        <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />
                      </div>
                    </button>

                    <button 
                      onClick={() => setProfileSubScreen('biometrics')} 
                      className="w-full flex items-center justify-between p-6 md:p-8 border-t border-slate-50 hover:bg-slate-50 transition-all group"
                    >
                      <div className="flex items-center gap-4 md:gap-6">
                        <div className="bg-indigo-600/10 p-3 md:p-4 rounded-2xl group-hover:scale-110 transition-transform">
                          <Fingerprint className="w-5 h-5 md:w-6 md:h-6 text-indigo-600" />
                        </div>
                        <div className="text-left">
                          <span className="block font-display font-black text-slate-900 text-md md:text-lg">Biometria & Segurança</span>
                          <span className="text-[10px] md:text-xs text-slate-400 font-medium italic">FaceID / Impressão Digital</span>
                        </div>
                      </div>
                      <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all">
                        <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />
                      </div>
                    </button>

                    <button 
                      onClick={handleLogout} 
                      className="w-full flex items-center justify-between p-6 md:p-8 border-t border-slate-50 hover:bg-red-50 transition-all group"
                    >
                      <div className="flex items-center gap-4 md:gap-6">
                        <div className="bg-red-600/10 p-3 md:p-4 rounded-2xl group-hover:scale-110 transition-transform">
                          <LogOut className="w-5 h-5 md:w-6 md:h-6 text-red-600" />
                        </div>
                        <div className="text-left">
                          <span className="block font-display font-black text-slate-900 text-md md:text-lg">Sair da Conta</span>
                          <span className="text-[10px] md:text-xs text-slate-400 font-medium italic">Terminar sessão atual</span>
                        </div>
                      </div>
                      <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-red-50 flex items-center justify-center group-hover:bg-red-600 group-hover:text-white transition-all text-red-600">
                        <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {profileSubScreen === 'account' && (
              <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
                <section className="bg-white rounded-[3rem] shadow-2xl shadow-slate-200/60 border border-slate-100 p-10">
                  <div className="flex items-center gap-4 mb-10">
                    <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-100">
                      <UserIcon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-display font-black text-slate-900 tracking-tight">Informações Pessoais</h3>
                      <p className="text-slate-400 text-sm font-medium">Mantenha os seus dados atualizados para melhor contacto</p>
                    </div>
                  </div>
                  
                  <form onSubmit={handleUpdateProfile} className="space-y-8">
                    <div className="space-y-4">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Nome Completo</label>
                      <input 
                        type="text" 
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full rounded-2xl border-slate-100 border-2 bg-slate-50/30 px-6 py-4 focus:ring-8 focus:ring-blue-50 focus:border-blue-600 focus:bg-white outline-none font-bold text-slate-700 transition-all text-lg"
                        required
                      />
                    </div>
                    <div className="space-y-4">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Telefone</label>
                      <input 
                        type="tel" 
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        className="w-full rounded-2xl border-slate-100 border-2 bg-slate-50/30 px-6 py-4 focus:ring-8 focus:ring-blue-50 focus:border-blue-600 focus:bg-white outline-none font-bold text-slate-700 transition-all text-lg"
                        required
                      />
                    </div>
                    <button 
                      type="submit" 
                      disabled={isSubmitting}
                      className="w-full bg-blue-600 text-white font-display font-black py-6 rounded-[2rem] hover:bg-blue-700 transition-all flex items-center justify-center gap-3 shadow-xl shadow-blue-100 active:scale-95 disabled:opacity-50"
                    >
                      <Save className="w-6 h-6" />
                      {isSubmitting ? 'A GUARDAR...' : 'GUARDAR ALTERAÇÕES'}
                    </button>
                  </form>
                </section>

                <section className="bg-white rounded-[3rem] shadow-2xl shadow-slate-200/60 border border-slate-100 p-10">
                  <div className="flex items-center gap-4 mb-10">
                    <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg shadow-slate-200">
                      <Lock className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-display font-black text-slate-900 tracking-tight">Alterar Senha</h3>
                      <p className="text-slate-400 text-sm font-medium">Recomendamos trocar a senha a cada 6 meses</p>
                    </div>
                  </div>

                  <form onSubmit={handleUpdatePassword} className="space-y-8">
                    <div className="space-y-4 relative">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Senha Atual</label>
                      <div className="relative">
                        <input 
                          type={showPasswords ? 'text' : 'password'} 
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="w-full rounded-2xl border-slate-100 border-2 bg-slate-50/30 px-6 py-4 pr-14 focus:ring-8 focus:ring-blue-50 focus:border-blue-600 focus:bg-white outline-none font-bold text-slate-700 transition-all text-lg"
                          required
                        />
                        <button 
                          type="button"
                          onClick={() => setShowPasswords(!showPasswords)}
                          className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors"
                        >
                          {showPasswords ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Nova Senha</label>
                      <input 
                        type={showPasswords ? 'text' : 'password'} 
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full rounded-2xl border-slate-100 border-2 bg-slate-50/30 px-6 py-4 focus:ring-8 focus:ring-blue-50 focus:border-blue-600 focus:bg-white outline-none font-bold text-slate-700 transition-all text-lg"
                        required
                      />
                    </div>
                    <button 
                      type="submit" 
                      disabled={isSubmitting || !currentPassword || !newPassword}
                      className="w-full bg-slate-900 text-white font-display font-black py-6 rounded-[2rem] hover:bg-black transition-all shadow-xl shadow-slate-200 active:scale-95 disabled:opacity-50"
                    >
                      {isSubmitting ? 'A PROCESSAR...' : 'ATUALIZAR SENHA'}
                    </button>
                  </form>
                </section>
              </div>
            )}

            {profileSubScreen === 'privacy' && (
              <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
                <section className="bg-white rounded-[3rem] shadow-2xl shadow-slate-200/60 border border-slate-100 p-10">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-green-600 rounded-2xl flex items-center justify-center shadow-lg shadow-green-100">
                      <ShieldCheck className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-display font-black text-slate-900 tracking-tight">Estado da Conta</h3>
                      <p className="text-slate-400 text-sm font-medium">Controle como você aparece para os técnicos</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4 mt-10">
                    <button 
                      onClick={() => handleUpdatePrivacy('Ativo')}
                      className={`w-full flex items-center justify-between p-8 rounded-[2rem] border-2 transition-all ${
                        privacyStatus === 'Ativo' 
                        ? 'border-green-600 bg-green-50 shadow-xl shadow-green-100' 
                        : 'border-slate-50 bg-slate-50/30 hover:border-slate-200 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-6">
                        <div className={`w-4 h-4 rounded-full ${privacyStatus === 'Ativo' ? 'bg-green-600 ring-8 ring-green-100' : 'bg-slate-300'}`} />
                        <div className="text-left">
                          <p className={`font-display font-black text-lg ${privacyStatus === 'Ativo' ? 'text-green-900' : 'text-slate-900'}`}>Modo Ativo</p>
                          <p className="text-xs text-slate-500 font-medium italic">Conta visível, pedidos e chat habilitados</p>
                        </div>
                      </div>
                      {privacyStatus === 'Ativo' && <CheckCircle2 className="w-6 h-6 text-green-600" />}
                    </button>

                    <button 
                      onClick={() => handleUpdatePrivacy('Inativo')}
                      className={`w-full flex items-center justify-between p-8 rounded-[2rem] border-2 transition-all ${
                        privacyStatus === 'Inativo' 
                        ? 'border-orange-500 bg-orange-50 shadow-xl shadow-orange-100' 
                        : 'border-slate-50 bg-slate-50/30 hover:border-slate-200 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-6">
                        <div className={`w-4 h-4 rounded-full ${privacyStatus === 'Inativo' ? 'bg-orange-500 ring-8 ring-orange-100' : 'bg-slate-300'}`} />
                        <div className="text-left">
                          <p className={`font-display font-black text-lg ${privacyStatus === 'Inativo' ? 'text-orange-900' : 'text-slate-900'}`}>Modo Invisível</p>
                          <p className="text-xs text-slate-500 font-medium italic">Pausa temporária, não receberá novas propostas</p>
                        </div>
                      </div>
                      {privacyStatus === 'Inativo' && <CheckCircle2 className="w-6 h-6 text-orange-500" />}
                    </button>
                  </div>
                </section>

                <section className="bg-red-50 rounded-[3rem] border border-red-100 p-10">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center shadow-lg shadow-red-200">
                      <Trash2 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-display font-black text-red-900 tracking-tight">Zona de Perigo</h3>
                      <p className="text-red-500 text-sm font-medium">Estas ações são permanentes e não podem ser desfeitas</p>
                    </div>
                  </div>
                  <button className="w-full bg-white text-red-600 border-2 border-red-100 font-display font-black py-4 rounded-2xl hover:bg-red-600 hover:text-white hover:border-red-600 transition-all active:scale-95">
                    ELIMINAR CONTA PERMANENTEMENTE
                  </button>
                </section>
              </div>
            )}

            {profileSubScreen === 'biometrics' && (
              <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
                <section className="bg-white rounded-[3rem] shadow-2xl shadow-slate-200/60 border border-slate-100 p-10">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100">
                      <Fingerprint className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-display font-black text-slate-900 tracking-tight">Biometria</h3>
                      <p className="text-slate-400 text-sm font-medium">Acesso rápido e seguro</p>
                    </div>
                  </div>
                  
                  <div className="mt-10 p-8 rounded-[2rem] bg-indigo-50/50 border-2 border-indigo-100 flex items-center justify-between gap-6">
                    <div>
                      <p className="font-display font-black text-lg text-indigo-900">Login com Biometria</p>
                      <p className="text-xs text-indigo-600 font-medium">Use o seu rosto ou impressão digital para entrar.</p>
                    </div>
                    <button 
                      onClick={() => handleToggleBiometrics(!userProfile?.biometriaHabilitada)}
                      disabled={isSubmitting}
                      className={`w-14 h-8 rounded-full transition-all relative ${userProfile?.biometriaHabilitada ? 'bg-indigo-600' : 'bg-slate-300'}`}
                    >
                      <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${userProfile?.biometriaHabilitada ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>
                  <div className="mt-8 p-6 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-4">
                    <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0" />
                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                      A biometria é processada localmente no seu dispositivo. Nós não armazenamos os seus dados biométricos reais, apenas uma chave de verificação segura.
                    </p>
                  </div>
                </section>
              </div>
            )}


            <div className="text-center pb-8 pt-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full">
                <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">SAPS Angola • Versão 2.4.0 (UX Prime)</p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-gray-200 px-6 py-3 z-20">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <button 
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'home' ? 'text-blue-600 scale-110' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <LayoutDashboard className={`w-6 h-6 ${activeTab === 'home' ? 'fill-blue-50' : ''}`} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Início</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('history')}
            className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'history' ? 'text-blue-600 scale-110' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <History className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Pedidos</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'profile' ? 'text-blue-600 scale-110' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <UserIcon className={`w-6 h-6 ${activeTab === 'profile' ? 'fill-blue-50' : ''}`} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Perfil</span>
          </button>
        </div>
      </nav>
    </div>
    </>
  );
}

