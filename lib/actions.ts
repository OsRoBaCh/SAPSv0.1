'use server';

import db from './db';
import crypto from 'crypto';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from './supabase/server';

import bcrypt from 'bcryptjs';

export async function syncUserWithLocalDB(userId: string, email: string, name: string, type: string, phone: string) {
  try {
    const existing = db.prepare('SELECT uuidUtilizador, tipoUtilizador FROM utilizador WHERE uuidUtilizador = ? OR email = ?').get(userId, email) as any;
    
    if (!existing) {
      let finalType = type;
      if (email === 'orchicomo@gmail.com') {
        finalType = 'Admin';
      }

      const estadoInicial = finalType === 'Prestador' ? 'Em Análise' : 'Ativo';

      db.prepare(`
        INSERT INTO utilizador (uuidUtilizador, email, senhaHash, nomeCompleto, nTelefone, tipoUtilizador, dataCadastro, estadoConta)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(userId, email, 'supabase_auth', name, phone, finalType, new Date().toISOString(), estadoInicial);
      
      if (finalType === 'Cliente') {
        db.prepare('INSERT OR IGNORE INTO cliente (uuidUtilizador) VALUES (?)').run(userId);
      } else if (finalType === 'Prestador') {
        db.prepare('INSERT OR IGNORE INTO prestador (uuidUtilizador, estado, classificacao, saldo) VALUES (?, ?, ?, ?)')
          .run(userId, 'Inativo', 5.0, 0);
      }
      return finalType;
    } else if (email === 'orchicomo@gmail.com') {
      // Force update to Admin for this specific user if already exists
      db.prepare("UPDATE utilizador SET tipoUtilizador = 'Admin' WHERE email = ?").run(email);
      return 'Admin';
    }
    return existing.tipoUtilizador;
  } catch (error) {
    console.error('Local sync error:', error);
    return type;
  }
}

export async function getSession() {
  // Authentication bypass: Return session based on cookie or default to Admin
  const cookieStore = await cookies();
  const roleOverride = cookieStore.get('saps_role_override')?.value;

  if (roleOverride === 'Prestador') {
    return {
      userId: 'provider-1',
      userType: 'Prestador',
      userName: 'Maria Prestadora (Acesso Aberto)'
    };
  }

  if (roleOverride === 'Cliente') {
    return {
      userId: 'client-1',
      userType: 'Cliente',
      userName: 'João Cliente (Acesso Aberto)'
    };
  }

  // Default to Guest if no override
  return {
    userId: 'guest-id',
    userType: 'Guest',
    userName: 'Visitante',
    isGuest: true
  };
}

export async function setRoleOverride(role: 'Admin' | 'Prestador' | 'Cliente') {
  const cookieStore = await cookies();
  cookieStore.set('saps_role_override', role, { maxAge: 60 * 60 * 24 * 7 });
  revalidatePath('/');
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete('saps_role_override');
  redirect('/');
}

export async function toggleBiometrics(userId: string, enabled: boolean, credentialId?: string, publicKey?: string) {
  try {
    const stmt = db.prepare('UPDATE utilizador SET biometriaHabilitada = ?, biometriaCredentialId = ?, biometriaPublicKey = ? WHERE uuidUtilizador = ?');
    stmt.run(enabled ? 1 : 0, credentialId || null, publicKey || null, userId);
    revalidatePath('/client');
    revalidatePath('/provider');
    return { success: true };
  } catch (error: any) {
    console.error('Toggle biometrics error:', error);
    return { success: false, error: error.message };
  }
}

export async function getCategories() {
  const stmt = db.prepare('SELECT uuidCategoria, nomeCategoria, descricao, precoBase FROM categoria WHERE ativo = 1');
  return stmt.all() as any[];
}

export async function getProvidersByCategory(categoryId: string) {
  try {
    const stmt = db.prepare(`
      SELECT 
        u.uuidUtilizador, 
        u.nomeCompleto, 
        u.nTelefone,
        p.portfolio,
        p.bio,
        p.classificacao,
        tp.precoBase as precoSugerido
      FROM utilizador u
      JOIN prestador p ON u.uuidUtilizador = p.uuidUtilizador
      JOIN tarifa_prestador tp ON p.uuidUtilizador = tp.uuidUtilizador
      WHERE tp.uuidCategoria = ? AND tp.ativo = 1 AND p.estado = 'Em Serviço'
    `);
    
    return stmt.all(categoryId) as any[];
  } catch (error) {
    console.error('Error fetching providers by category:', error);
    return [];
  }
}

// --- HELPER FUNCTIONS ---

function applyDynamicPricing(request: any) {
  if (request.estadoSolicitacao !== 'Pendente') {
    return { ...request, precoExibicao: request.precoFinal };
  }

  const now = new Date();
  const created = new Date(request.dataCriacao);
  const diffMinutes = (now.getTime() - created.getTime()) / (1000 * 60);
  
  let dynamicPrice = request.precoFinal;
  let priceLabel = '';
  let priceTrend: 'up' | 'down' | 'stable' = 'stable';

  if (request.tipoAtendimento === 'Imediato') {
    if (diffMinutes >= 3 && diffMinutes < 6) {
      dynamicPrice = request.precoFinal * 1.15;
      priceLabel = 'Urgência (+15%)';
      priceTrend = 'up';
    } else if (diffMinutes >= 6 && diffMinutes < 10) {
      dynamicPrice = request.precoFinal * 1.30;
      priceLabel = 'Crítico (+30%)';
      priceTrend = 'up';
    } else if (diffMinutes >= 10) {
      // Fluctuates to find a taker
      const fluctuation = 1.30 + (Math.sin(diffMinutes) * 0.05);
      dynamicPrice = request.precoFinal * fluctuation;
      priceLabel = 'Ajuste de Mercado';
      priceTrend = Math.sin(diffMinutes) > 0 ? 'up' : 'down';
    }
  } else {
    // Scheduled services might decrease to attract fill-in work if not taken
    if (diffMinutes >= 15) {
      const discount = Math.min(0.20, Math.floor(diffMinutes / 10) * 0.05);
      if (discount > 0) {
        dynamicPrice = request.precoFinal * (1 - discount);
        priceLabel = `Incentivo (-${Math.round(discount * 100)}%)`;
        priceTrend = 'down';
      }
    }
  }

  return { 
    ...request, 
    precoExibicao: dynamicPrice, 
    priceLabel, 
    priceTrend,
    isBoosted: dynamicPrice > request.precoFinal,
    isDiscounted: dynamicPrice < request.precoFinal
  };
}

export async function getClientRequests(clientId: string) {
  const stmt = db.prepare(`
    SELECT s.*, c.nomeCategoria, u.nomeCompleto as prestadorNome, u.nTelefone as prestadorTelefone,
           (SELECT pontuacao FROM avaliacao a WHERE a.uuidSolicitacao = s.uuidSolicitacao AND a.tipoAutor = 'C') as avaliacaoCliente
    FROM solicitacao s
    JOIN categoria c ON s.uuidCategoria = c.uuidCategoria
    LEFT JOIN utilizador u ON s.uuidPrestador = u.uuidUtilizador
    WHERE s.uuidCliente = ?
    ORDER BY s.dataCriacao DESC
  `);
  const requests = stmt.all(clientId) as any[];
  return requests.map(applyDynamicPricing);
}

export async function getProviderRequests(providerId: string) {
  const stmt = db.prepare(`
    SELECT s.*, c.nomeCategoria, u.nomeCompleto as clienteNome, u.nTelefone as clienteTelefone
    FROM solicitacao s
    JOIN categoria c ON s.uuidCategoria = c.uuidCategoria
    JOIN utilizador u ON s.uuidCliente = u.uuidUtilizador
    WHERE (s.uuidPrestador = ? OR s.uuidPrestador IS NULL)
    AND s.uuidSolicitacao NOT IN (SELECT uuidSolicitacao FROM rejeicao_solicitacao WHERE uuidPrestador = ?)
    ORDER BY s.dataCriacao DESC
  `);
  const requests = stmt.all(providerId, providerId) as any[];
  return requests.map(applyDynamicPricing);
}

export async function getUserProfile(userId: string) {
  try {
    const user = db.prepare('SELECT uuidUtilizador, email, nomeCompleto, nTelefone, tipoUtilizador, estadoConta, dataCadastro FROM utilizador WHERE uuidUtilizador = ?').get(userId) as any;
    
    if (user && user.tipoUtilizador === 'Prestador') {
      const pData = db.prepare('SELECT urlBilheteIdentidade, urlRegistoCriminal, urlCertificadoFormacao, bio, portfolio FROM prestador WHERE uuidUtilizador = ?').get(userId) as any;
      return { ...user, ...pData };
    }
    return user;
  } catch (error) {
    console.error('Get profile error:', error);
    return null;
  }
}

export async function updateTechnicianDocuments(userId: string, paths: { urlBI?: string; urlCriminal?: string; urlCertificado?: string }) {
  try {
    const stmt = db.prepare(`
      UPDATE prestador 
      SET 
        urlBilheteIdentidade = COALESCE(?, urlBilheteIdentidade), 
        urlRegistoCriminal = COALESCE(?, urlRegistoCriminal), 
        urlCertificadoFormacao = COALESCE(?, urlCertificadoFormacao)
      WHERE uuidUtilizador = ?
    `);
    
    stmt.run(paths.urlBI || null, paths.urlCriminal || null, paths.urlCertificado || null, userId);
    revalidatePath('/provider');
    return { success: true };
  } catch (error: any) {
    console.error('Update documents error:', error);
    return { success: false, error: error.message };
  }
}

export async function updateUserProfile(userId: string, data: { nomeCompleto: string; nTelefone: string; nContaBancaria?: string }) {
  try {
    db.transaction(() => {
      const stmt = db.prepare('UPDATE utilizador SET nomeCompleto = ?, nTelefone = ? WHERE uuidUtilizador = ?');
      stmt.run(data.nomeCompleto, data.nTelefone, userId);
      
      if (data.nContaBancaria !== undefined) {
        const stmtPrestador = db.prepare('UPDATE prestador SET nContaBancaria = ? WHERE uuidUtilizador = ?');
        stmtPrestador.run(data.nContaBancaria, userId);
      }
    })();
    
    const cookieStore = await cookies();
    cookieStore.set('userName', data.nomeCompleto, { path: '/' });
    
    revalidatePath('/client');
    revalidatePath('/provider');
    return { success: true };
  } catch (error: any) {
    console.error('Update profile error:', error);
    return { success: false, error: error.message };
  }
}

export async function updateUserPassword(userId: string, currentPasswordHash: string, newPasswordHash: string) {
  try {
    const user = db.prepare('SELECT senhaHash FROM utilizador WHERE uuidUtilizador = ?').get(userId) as any;
    if (user.senhaHash !== currentPasswordHash) {
      return { success: false, error: 'Senha atual incorreta' };
    }
    
    const stmt = db.prepare('UPDATE utilizador SET senhaHash = ? WHERE uuidUtilizador = ?');
    stmt.run(newPasswordHash, userId);
    
    return { success: true };
  } catch (error: any) {
    console.error('Update password error:', error);
    return { success: false, error: error.message };
  }
}

export async function updateUserPrivacy(userId: string, estadoConta: string) {
  try {
    const stmt = db.prepare('UPDATE utilizador SET estadoConta = ? WHERE uuidUtilizador = ?');
    stmt.run(estadoConta, userId);
    
    revalidatePath('/client');
    revalidatePath('/provider');
    return { success: true };
  } catch (error: any) {
    console.error('Update privacy error:', error);
    return { success: false, error: error.message };
  }
}

export async function createRequest(data: {
  uuidCliente: string;
  uuidCategoria: string;
  descricaoProblema: string;
  lat: number;
  lon: number;
  tipoAtendimento: string;
  dataProgramada: string;
  complexidade: string;
  zonaAtendimento: string;
  precoFinal: number;
  uuidPrestador?: string;
  iaJustificativaPreco?: string;
}) {
  try {
    const uuidSolicitacao = crypto.randomUUID();
    const dataCriacao = new Date().toISOString();

    // Safety Check: Ensure the client exists in the client table (prevent FK error)
    const clientExists = db.prepare('SELECT 1 FROM cliente WHERE uuidUtilizador = ?').get(data.uuidCliente);
    if (!clientExists) {
      const userExists = db.prepare('SELECT 1 FROM utilizador WHERE uuidUtilizador = ?').get(data.uuidCliente);
      if (userExists) {
        db.prepare('INSERT OR IGNORE INTO cliente (uuidUtilizador) VALUES (?)').run(data.uuidCliente);
      } else {
        db.prepare('INSERT OR IGNORE INTO utilizador (uuidUtilizador, email, nomeCompleto, dataCadastro, tipoUtilizador) VALUES (?, ?, ?, ?, ?)')
          .run(data.uuidCliente, `tmp_${data.uuidCliente}@saps.com`, 'Utilizador Temporário', new Date().toISOString(), 'Cliente');
        db.prepare('INSERT OR IGNORE INTO cliente (uuidUtilizador) VALUES (?)').run(data.uuidCliente);
      }
    }
    
    const stmt = db.prepare(`
      INSERT INTO solicitacao (
        uuidSolicitacao, uuidCliente, uuidCategoria, lat, lon, 
        descricaoProblema, tipoAtendimento, dataProgramada, dataCriacao, complexidade, zonaAtendimento, precoFinal, uuidPrestador, estadoSolicitacao, iaJustificativaPreco
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const estadoInicial = data.uuidPrestador ? 'Aceite' : 'Pendente';
    
    stmt.run(
      uuidSolicitacao,
      data.uuidCliente,
      data.uuidCategoria,
      data.lat,
      data.lon,
      data.descricaoProblema,
      data.tipoAtendimento,
      data.dataProgramada,
      dataCriacao,
      data.complexidade,
      data.zonaAtendimento,
      data.precoFinal,
      data.uuidPrestador || null,
      estadoInicial,
      data.iaJustificativaPreco || null
    );

    // Se um prestador foi selecionado via matching, notificar o prestador
    if (data.uuidPrestador) {
      const clienteInfo = db.prepare('SELECT nomeCompleto FROM utilizador WHERE uuidUtilizador = ?').get(data.uuidCliente) as any;
      const categoria = db.prepare('SELECT nomeCategoria FROM categoria WHERE uuidCategoria = ?').get(data.uuidCategoria) as any;

      db.prepare(`
        INSERT INTO notificacao (uuidNotificacao, uuidUtilizador, titulo, mensagem, dataCriacao)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        crypto.randomUUID(),
        data.uuidPrestador,
        'Novo Match Direto',
        `Foi selecionado(a) por ${clienteInfo.nomeCompleto} para um serviço de ${categoria.nomeCategoria} via Matching de IA.`,
        dataCriacao
      );
    }
    
    revalidatePath('/client');
    revalidatePath('/provider');
    revalidatePath('/admin');
    return { success: true, uuidSolicitacao };
  } catch (error: any) {
    console.error('Create request error:', error);
    return { success: false, error: 'Erro ao criar solicitação.' };
  }
}

export async function getSmartEstimate(categoryId: string, complexidade: string, zona: string) {
  try {
    const categoria = db.prepare('SELECT precoBase FROM categoria WHERE uuidCategoria = ?').get(categoryId) as any;
    if (!categoria) return null;

    // Base price from category
    let basePrice = categoria.precoBase;
    
    // Historical Adjustment (Simplified AI)
    // Check average price for similar completed requests
    const historical = db.prepare(`
      SELECT AVG(precoFinal) as avgPrice, AVG(duracaoEstimadaHoras) as avgDuration
      FROM solicitacao
      WHERE uuidCategoria = ? AND estadoSolicitacao = 'Concluido' AND complexidade = ?
    `).get(categoryId, complexidade) as any;

    if (historical && historical.avgPrice) {
      // Weight history 40% and base price 60%
      basePrice = (basePrice * 0.6) + (historical.avgPrice * 0.4);
    }

    // Complexity multiplier
    let multiplier = 1;
    if (complexidade === 'Simples') multiplier = 0.8;
    if (complexidade === 'Complexo') multiplier = 1.5;

    const estimatedService = basePrice * multiplier;
    const estimatedTravel = zona === 'Centro' ? 2000 : 3500;
    
    // Range calculation
    const min = (estimatedService + estimatedTravel) * 0.9;
    const max = (estimatedService + estimatedTravel) * 1.3;

    return {
      service: estimatedService,
      travel: estimatedTravel,
      totalMin: Math.round(min / 100) * 100,
      totalMax: Math.round(max / 100) * 100,
      duration: historical?.avgDuration || (complexidade === 'Simples' ? 1 : complexidade === 'Normal' ? 3 : 8)
    };
  } catch (error) {
    console.error('Estimate error:', error);
    return null;
  }
}

export async function updateRequestPrice(requestId: string, providerId: string, newPrice: number, justification: string) {
  try {
    const solicitacao = db.prepare('SELECT uuidCliente, precoFinal FROM solicitacao WHERE uuidSolicitacao = ?').get(requestId) as any;
    
    // RN04: Registration of changes to avoid fraud
    db.prepare(`
      UPDATE solicitacao 
      SET precoFinal = ?, iaJustificativaPreco = ?, estadoSolicitacao = 'Aguardando Aprovação Preço'
      WHERE uuidSolicitacao = ? AND uuidPrestador = ?
    `).run(newPrice, justification, requestId, providerId);

    // Notify Client (RN03)
    db.prepare(`
      INSERT INTO notificacao (uuidNotificacao, uuidUtilizador, titulo, mensagem, dataCriacao)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      crypto.randomUUID(),
      solicitacao.uuidCliente,
      'Ajuste de Preço',
      `O técnico propôs um ajuste de preço para ${newPrice.toLocaleString('pt-AO')} Kz. Motivo: ${justification}. Por favor, aprove para continuar.`,
      new Date().toISOString()
    );

    revalidatePath('/client');
    revalidatePath('/provider');
    revalidatePath('/admin');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function approvePriceChange(requestId: string) {
  try {
    db.prepare("UPDATE solicitacao SET estadoSolicitacao = 'Aceite' WHERE uuidSolicitacao = ?").run(requestId);
    revalidatePath('/client');
    revalidatePath('/provider');
    revalidatePath('/admin');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function acceptRequest(requestId: string, providerId?: string) {
  const cookieStore = await cookies();
  let userId = cookieStore.get('userId')?.value;
  
  // Se não houver cookie, tenta usar o providerId se for um UUID válido
  if (!userId && providerId && providerId !== 'cookie') {
    userId = providerId;
  }

  if (!userId || userId === 'cookie') {
    return { success: false, error: 'Sessão inválida ou expirada.' };
  }

  // Verificar se o utilizador é realmente um prestador para evitar erro de chave estrangeira
  const prestador = db.prepare(`
    SELECT p.uuidUtilizador, u.estadoConta 
    FROM prestador p 
    JOIN utilizador u ON p.uuidUtilizador = u.uuidUtilizador 
    WHERE p.uuidUtilizador = ?
  `).get(userId) as any;
  
  if (!prestador) {
    return { success: false, error: 'Apenas prestadores de serviço podem aceitar solicitações.' };
  }

  if (prestador.estadoConta !== 'Ativo') {
    return { success: false, error: 'A sua conta está suspensa ou em análise. Por favor, complete a sua documentação para ser ativado.' };
  }

  try {
    // Verificar se a solicitação existe e qual o seu estado atual
    const solicitacao = db.prepare('SELECT estadoSolicitacao, uuidPrestador, dataCriacao, precoFinal FROM solicitacao WHERE uuidSolicitacao = ?').get(requestId) as any;
    
    if (!solicitacao) {
      return { success: false, error: 'Solicitação não encontrada.' };
    }

    if (solicitacao.estadoSolicitacao !== 'Pendente') {
      if (solicitacao.uuidPrestador === userId) {
        return { success: false, error: 'Já aceitou esta solicitação anteriormente.' };
      }
      return { success: false, error: `Esta solicitação já não está pendente (Estado: ${solicitacao.estadoSolicitacao}).` };
    }

    // Calcular bónus de urgência ou desconto dinâmico
    let finalPrice = solicitacao.precoFinal;
    const now = new Date();
    const created = new Date(solicitacao.dataCriacao);
    const diffMinutes = (now.getTime() - created.getTime()) / (1000 * 60);

    if (solicitacao.tipoAtendimento === 'Imediato') {
      if (diffMinutes >= 3 && diffMinutes < 6) {
        finalPrice = solicitacao.precoFinal * 1.15;
      } else if (diffMinutes >= 6 && diffMinutes < 10) {
        finalPrice = solicitacao.precoFinal * 1.30;
      } else if (diffMinutes >= 10) {
        const fluctuation = 1.30 + (Math.sin(diffMinutes) * 0.05);
        finalPrice = solicitacao.precoFinal * fluctuation;
      }
    } else {
      if (diffMinutes >= 15) {
        const discount = Math.min(0.20, Math.floor(diffMinutes / 10) * 0.05);
        finalPrice = solicitacao.precoFinal * (1 - discount);
      }
    }

    const stmt = db.prepare(`
      UPDATE solicitacao 
      SET estadoSolicitacao = 'Aceite', uuidPrestador = ?, precoFinal = ?
      WHERE uuidSolicitacao = ? AND estadoSolicitacao = 'Pendente'
    `);
    
    const info = stmt.run(userId, finalPrice, requestId);
    
    if (info.changes === 0) {
      return { success: false, error: 'Não foi possível aceitar o serviço. Pode ter sido alterado por outro utilizador.' };
    }

    // Notify client
    const reqData = db.prepare('SELECT uuidCliente, uuidCategoria FROM solicitacao WHERE uuidSolicitacao = ?').get(requestId) as any;
    const categoria = db.prepare('SELECT nomeCategoria FROM categoria WHERE uuidCategoria = ?').get(reqData.uuidCategoria) as any;
    const prestadorInfo = db.prepare('SELECT nomeCompleto FROM utilizador WHERE uuidUtilizador = ?').get(userId) as any;

    db.prepare(`
      INSERT INTO notificacao (uuidNotificacao, uuidUtilizador, titulo, mensagem, dataCriacao)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      crypto.randomUUID(),
      reqData.uuidCliente,
      'Pedido Aceite',
      `O técnico ${prestadorInfo.nomeCompleto} aceitou o seu pedido de ${categoria.nomeCategoria}.`,
      new Date().toISOString()
    );

    revalidatePath('/client');
    revalidatePath('/provider');
    revalidatePath('/admin');
    return { success: true };
  } catch (error: any) {
    console.error('Accept request error:', error);
    return { success: false, error: 'Erro ao aceitar serviço: ' + error.message };
  }
}

export async function rejectRequest(requestId: string) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;

    if (!userId) {
      return { success: false, error: 'Sessão inválida ou expirada.' };
    }

    const uuidRejeicao = crypto.randomUUID();
    const dataRejeicao = new Date().toISOString();

    db.prepare(`
      INSERT INTO rejeicao_solicitacao (uuidRejeicao, uuidSolicitacao, uuidPrestador, dataRejeicao)
      VALUES (?, ?, ?, ?)
    `).run(uuidRejeicao, requestId, userId, dataRejeicao);

    revalidatePath('/provider');
    return { success: true };
  } catch (error: any) {
    console.error('Reject request error:', error);
    return { success: false, error: 'Erro ao rejeitar serviço: ' + error.message };
  }
}

export async function updateRequestStatus(requestId: string, status: string) {
  try {
    let query = 'UPDATE solicitacao SET estadoSolicitacao = ?';
    const params: any[] = [status];
    
    if (status === 'Em curso') {
      query += ', dataInicio = ?';
      params.push(new Date().toISOString());
    } else if (status === 'Concluido') {
      query += ', dataFim = ?';
      params.push(new Date().toISOString());
    }
    
    query += ' WHERE uuidSolicitacao = ?';
    params.push(requestId);
    
    db.transaction(() => {
      const stmt = db.prepare(query);
      const info = stmt.run(...params);
      
      if (info.changes === 0) {
        throw new Error('Não foi possível atualizar o estado do serviço.');
      }

      if (status === 'Concluido' || status === 'Em curso') {
        const solicitacao = db.prepare('SELECT uuidCliente, uuidPrestador, precoFinal, uuidCategoria FROM solicitacao WHERE uuidSolicitacao = ?').get(requestId) as any;
        const categoria = db.prepare('SELECT nomeCategoria FROM categoria WHERE uuidCategoria = ?').get(solicitacao.uuidCategoria) as any;
        
        // Notify client
        const titulo = status === 'Concluido' ? 'Pedido Concluído' : 'Serviço Iniciado';
        const mensagem = status === 'Concluido' 
          ? `O seu serviço de ${categoria.nomeCategoria} foi concluído com sucesso. Por favor, efetue o pagamento para finalizar.`
          : `O técnico iniciou o serviço de ${categoria.nomeCategoria}.`;

        db.prepare(`
          INSERT INTO notificacao (uuidNotificacao, uuidUtilizador, titulo, mensagem, dataCriacao)
          VALUES (?, ?, ?, ?, ?)
        `).run(
          crypto.randomUUID(),
          solicitacao.uuidCliente,
          titulo,
          mensagem,
          new Date().toISOString()
        );

        if (status === 'Concluido' && solicitacao && solicitacao.uuidPrestador) {
          // Generate payment reference if not already there
          const shortReq = requestId.split('-')[0].toUpperCase();
          const shortTech = solicitacao.uuidPrestador.split('-')[0].toUpperCase();
          const reference = `SAPS-${shortReq}-${shortTech}`;
          
          db.prepare('UPDATE solicitacao SET referenciaPagamento = ? WHERE uuidSolicitacao = ?').run(reference, requestId);
        }
      }
    })();
    
    revalidatePath('/client');
    revalidatePath('/provider');
    revalidatePath('/admin');
    return { success: true };
  } catch (error: any) {
    console.error('Update status error:', error);
    return { success: false, error: 'Erro ao atualizar serviço: ' + error.message };
  }
}

export async function confirmPayment(requestId: string) {
  try {
    const solicitacao = db.prepare(`
      SELECT s.*, p.uuidUtilizador as providerId, p.saldo, c.nomeCategoria
      FROM solicitacao s
      JOIN prestador p ON s.uuidPrestador = p.uuidUtilizador
      JOIN categoria c ON s.uuidCategoria = c.uuidCategoria
      WHERE s.uuidSolicitacao = ?
    `).get(requestId) as any;

    if (!solicitacao) return { success: false, error: 'Solicitação não encontrada ou prestador não atribuído.' };
    if (solicitacao.pagamentoConfirmado) return { success: false, error: 'Pagamento já confirmado.' };

    // Get platform commission from settings
    const settings = db.prepare('SELECT valor FROM configuracao_sistema WHERE chave = ?').get('comissao_plataforma') as any;
    const comissaoPercent = settings ? parseFloat(settings.valor) : 0.15;

    const comissao = solicitacao.precoFinal * comissaoPercent;
    const valorLiquido = solicitacao.precoFinal - comissao;

    db.transaction(() => {
      // 1. Mark as confirmed
      db.prepare('UPDATE solicitacao SET pagamentoConfirmado = 1 WHERE uuidSolicitacao = ?').run(requestId);

      // 2. Credit provider balance
      const newBalance = solicitacao.saldo + valorLiquido;
      db.prepare('UPDATE prestador SET saldo = ? WHERE uuidUtilizador = ?').run(newBalance, solicitacao.providerId);

      // 3. Create transaction record
      db.prepare(`
        INSERT INTO transacao (uuidTransacao, uuidPrestador, tipo, valor, data, descricao, estado)
        VALUES (?, ?, 'Ganho', ?, ?, ?, 'Concluido')
      `).run(
        crypto.randomUUID(),
        solicitacao.providerId,
        valorLiquido,
        new Date().toISOString(),
        `Serviço: ${solicitacao.nomeCategoria} (Bruto: ${solicitacao.precoFinal.toFixed(2)} AOA, Taxa SAPS ${(comissaoPercent * 100).toFixed(0)}%: -${comissao.toFixed(2)} AOA)`
      );

      // 4. Notify provider
      db.prepare(`
        INSERT INTO notificacao (uuidNotificacao, uuidUtilizador, titulo, mensagem, dataCriacao)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        crypto.randomUUID(),
        solicitacao.providerId,
        'Pagamento Confirmado',
        `O pagamento de ${solicitacao.precoFinal.toLocaleString('pt-AO')} Kz foi confirmado. Valor líquido creditado: ${valorLiquido.toLocaleString('pt-AO')} Kz.`,
        new Date().toISOString()
      );
    })();

    revalidatePath('/client');
    revalidatePath('/provider');
    revalidatePath('/admin');
    return { success: true };
  } catch (error: any) {
    console.error('Confirm payment error:', error);
    return { success: false, error: error.message };
  }
}

export async function rateService(requestId: string, pontuacao: number, comentario: string) {
  try {
    const uuidAvaliacao = crypto.randomUUID();
    const dataAvaliacao = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO avaliacao (uuidAvaliacao, uuidSolicitacao, pontuacao, comentario, tipoAutor, dataAvaliacao)
      VALUES (?, ?, ?, ?, 'C', ?)
    `);

    stmt.run(uuidAvaliacao, requestId, pontuacao, comentario, dataAvaliacao);
    
    revalidatePath('/client');
    return { success: true };
  } catch (error: any) {
    console.error('Rating error:', error);
    return { success: false, error: 'Erro ao avaliar serviço: ' + error.message };
  }
}

export async function getProviderEarnings(providerId: string) {
  try {
    const prestador = db.prepare('SELECT saldo FROM prestador WHERE uuidUtilizador = ?').get(providerId) as any;
    const transacoes = db.prepare('SELECT * FROM transacao WHERE uuidPrestador = ? ORDER BY data DESC').all(providerId) as any[];
    const contas = db.prepare('SELECT * FROM conta_bancaria_prestador WHERE uuidPrestador = ? ORDER BY isDefault DESC').all(providerId) as any[];
    
    return {
      saldo: prestador?.saldo || 0,
      contas,
      transacoes
    };
  } catch (error) {
    console.error('Get earnings error:', error);
    return { saldo: 0, contas: [], transacoes: [] };
  }
}

export async function addProviderBankAccount(providerId: string, data: { banco: string, iban: string, titular: string }) {
  try {
    const uuid = crypto.randomUUID();
    // Verify if it's the first account, make it default
    const count = db.prepare('SELECT COUNT(*) as count FROM conta_bancaria_prestador WHERE uuidPrestador = ?').get(providerId) as any;
    const isDefault = count.count === 0 ? 1 : 0;

    db.prepare(`
      INSERT INTO conta_bancaria_prestador (uuidConta, uuidPrestador, banco, iban, titular, isDefault)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(uuid, providerId, data.banco, data.iban, data.titular, isDefault);

    revalidatePath('/provider');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteProviderBankAccount(providerId: string, accountId: string) {
  try {
    db.prepare('DELETE FROM conta_bancaria_prestador WHERE uuidConta = ? AND uuidPrestador = ?').run(accountId, providerId);
    revalidatePath('/provider');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function setDefaultProviderBankAccount(providerId: string, accountId: string) {
  try {
    db.transaction(() => {
      db.prepare('UPDATE conta_bancaria_prestador SET isDefault = 0 WHERE uuidPrestador = ?').run(providerId);
      db.prepare('UPDATE conta_bancaria_prestador SET isDefault = 1 WHERE uuidConta = ? AND uuidPrestador = ?').run(accountId, providerId);
    })();
    revalidatePath('/provider');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function requestWithdrawal(providerId: string, amount: number, accountId?: string) {
  try {
    const prestador = db.prepare('SELECT saldo FROM prestador WHERE uuidUtilizador = ?').get(providerId) as any;
    
    if (!prestador || prestador.saldo < amount) {
      return { success: false, error: 'Saldo insuficiente para o levantamento.' };
    }

    // Get the account to use
    let account;
    if (accountId) {
      account = db.prepare('SELECT * FROM conta_bancaria_prestador WHERE uuidConta = ? AND uuidPrestador = ?').get(accountId, providerId) as any;
    } else {
      account = db.prepare('SELECT * FROM conta_bancaria_prestador WHERE uuidPrestador = ? AND isDefault = 1').get(providerId) as any;
    }

    if (!account) {
      return { success: false, error: 'Configure uma conta bancária para o levantamento.' };
    }

    // Kiwi API Integration (Simulated/Placeholder for real payout logic)
    const kiwiApiKey = process.env.KIWI_API_KEY;
    
    if (kiwiApiKey) {
      console.log(`Iniciando processamento via Kiwi API para a conta ${account.iban}`);
    } else {
      console.warn('KIWI_API_KEY não configurada. O levantamento será processado apenas internamente.');
    }

    db.transaction(() => {
      // Deduct from balance
      db.prepare('UPDATE prestador SET saldo = saldo - ? WHERE uuidUtilizador = ?').run(amount, providerId);
      
      // Record withdrawal transaction
      const uuidTransacao = crypto.randomUUID();
      db.prepare(`
        INSERT INTO transacao (uuidTransacao, uuidPrestador, tipo, valor, data, descricao, estado)
        VALUES (?, ?, 'Levantamento', ?, ?, ?, 'Concluido')
      `).run(
        uuidTransacao, 
        providerId, 
        amount, 
        new Date().toISOString(), 
        `Levantamento via Kiwi API (Banco: ${account.banco}, Conta: ${account.iban})`
      );
    })();

    revalidatePath('/provider');
    return { success: true };
  } catch (error: any) {
    console.error('Withdrawal error:', error);
    return { success: false, error: 'Erro ao processar levantamento: ' + error.message };
  }
}

export async function getNotifications(userId: string) {
  try {
    return db.prepare('SELECT * FROM notificacao WHERE uuidUtilizador = ? ORDER BY dataCriacao DESC').all(userId) as any[];
  } catch (error) {
    console.error('Get notifications error:', error);
    return [];
  }
}

export async function markNotificationAsRead(notificationId: string) {
  try {
    db.prepare('UPDATE notificacao SET lida = 1 WHERE uuidNotificacao = ?').run(notificationId);
    revalidatePath('/client');
    revalidatePath('/provider');
    return { success: true };
  } catch (error) {
    console.error('Mark notification error:', error);
    return { success: false };
  }
}

export async function checkExperimentalSecret() {
  const secret = process.env.EXPERIMENTAL_SECRET;
  if (!secret) {
    return { success: false, message: 'Secret experimental não configurada.' };
  }
  // Em um cenário real, aqui faríamos algo com a secret
  console.log('Secret experimental detectada e pronta para uso.');
  return { success: true, message: 'Secret experimental está ativa!' };
}

// --- ADMIN CRM ACTIONS ---

export async function getAdminStats() {
  try {
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM utilizador').get() as any;
    const totalClients = db.prepare("SELECT COUNT(*) as count FROM utilizador WHERE tipoUtilizador = 'Cliente'").get() as any;
    const totalProviders = db.prepare("SELECT COUNT(*) as count FROM utilizador WHERE tipoUtilizador = 'Prestador'").get() as any;
    const totalRequests = db.prepare('SELECT COUNT(*) as count FROM solicitacao').get() as any;
    const completedRequests = db.prepare("SELECT COUNT(*) as count FROM solicitacao WHERE estadoSolicitacao = 'Concluido'").get() as any;
    
    const earnings = db.prepare('SELECT SUM(precoFinal) as total FROM solicitacao WHERE pagamentoConfirmado = 1').get() as any;
    const totalVolume = earnings?.total || 0;
    
    const configComissao = db.prepare("SELECT valor FROM configuracao_sistema WHERE chave = 'comissao_plataforma'").get() as any;
    const comissaoPercent = parseFloat(configComissao?.valor || '0.15');
    const platformCommission = totalVolume * comissaoPercent;

    const recentRequests = db.prepare(`
      SELECT s.*, u.nomeCompleto as nomeCliente, c.nomeCategoria
      FROM solicitacao s
      JOIN utilizador u ON s.uuidCliente = u.uuidUtilizador
      JOIN categoria c ON s.uuidCategoria = c.uuidCategoria
      ORDER BY s.dataCriacao DESC
      LIMIT 5
    `).all() as any[];

    const logs = db.prepare(`
      SELECT l.*, u.nomeCompleto as nomeUtilizador
      FROM log_sistema l
      LEFT JOIN utilizador u ON l.uuidUtilizador = u.uuidUtilizador
      ORDER BY l.data DESC
      LIMIT 10
    `).all() as any[];

    return {
      stats: {
        totalUsers: totalUsers.count,
        totalClients: totalClients.count,
        totalProviders: totalProviders.count,
        totalRequests: totalRequests.count,
        completedRequests: completedRequests.count,
        totalVolume,
        platformCommission
      },
      recentRequests,
      logs
    };
  } catch (error) {
    console.error('Admin stats error:', error);
    return null;
  }
}

export async function getAllUsers() {
  try {
    return db.prepare(`
      SELECT 
        u.uuidUtilizador, 
        u.email, 
        u.nomeCompleto, 
        u.nTelefone, 
        u.tipoUtilizador, 
        u.estadoConta, 
        u.dataCadastro,
        p.urlBilheteIdentidade,
        p.urlRegistoCriminal,
        p.urlCertificadoFormacao
      FROM utilizador u
      LEFT JOIN prestador p ON u.uuidUtilizador = p.uuidUtilizador
      ORDER BY u.dataCadastro DESC
    `).all() as any[];
  } catch (error) {
    console.error('Get all users error:', error);
    return [];
  }
}

export async function getAllRequests() {
  try {
    return db.prepare(`
      SELECT s.*, uc.nomeCompleto as nomeCliente, up.nomeCompleto as nomePrestador, c.nomeCategoria
      FROM solicitacao s
      JOIN utilizador uc ON s.uuidCliente = uc.uuidUtilizador
      LEFT JOIN utilizador up ON s.uuidPrestador = up.uuidUtilizador
      JOIN categoria c ON s.uuidCategoria = c.uuidCategoria
      ORDER BY s.dataCriacao DESC
    `).all() as any[];
  } catch (error) {
    console.error('Get all requests error:', error);
    return [];
  }
}

async function recordLog(userId: string | undefined, acao: string, detalhes: string) {
  try {
    db.prepare('INSERT INTO log_sistema (uuidLog, uuidUtilizador, acao, detalhes, data) VALUES (?, ?, ?, ?, ?)')
      .run(crypto.randomUUID(), userId || null, acao, detalhes, new Date().toISOString());
  } catch (e) {
    console.error('Log error:', e);
  }
}

export async function updateUserStatus(userId: string, status: 'Ativo' | 'Suspenso' | 'Banido') {
  try {
    const cookieStore = await cookies();
    const adminId = cookieStore.get('userId')?.value;
    
    db.prepare('UPDATE utilizador SET estadoConta = ? WHERE uuidUtilizador = ?').run(status, userId);
    
    await recordLog(adminId, 'ALTERAR_ESTADO_UTILIZADOR', `Utilizador ${userId} alterado para ${status}`);
    
    revalidatePath('/admin');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteUser(userId: string) {
  try {
    const cookieStore = await cookies();
    const adminId = cookieStore.get('userId')?.value;

    db.prepare('DELETE FROM utilizador WHERE uuidUtilizador = ?').run(userId);
    
    await recordLog(adminId, 'ELIMINAR_UTILIZADOR', `Utilizador ${userId} eliminado`);

    revalidatePath('/admin');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function adminUpdateCategory(id: string, data: { nome: string, descricao: string, precoBase: number, ativo: number }) {
  try {
    db.prepare('UPDATE categoria SET nomeCategoria = ?, descricao = ?, precoBase = ?, ativo = ? WHERE uuidCategoria = ?')
      .run(data.nome, data.descricao, data.precoBase, data.ativo, id);
    revalidatePath('/admin');
    revalidatePath('/client');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function adminCreateCategory(data: { nome: string, descricao: string, precoBase: number }) {
  try {
    const uuid = crypto.randomUUID();
    db.prepare('INSERT INTO categoria (uuidCategoria, nomeCategoria, descricao, precoBase, ativo) VALUES (?, ?, ?, ?, 1)')
      .run(uuid, data.nome, data.descricao, data.precoBase);
    revalidatePath('/admin');
    revalidatePath('/client');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function adminDeleteCategory(id: string) {
  try {
    db.prepare('DELETE FROM categoria WHERE uuidCategoria = ?').run(id);
    revalidatePath('/admin');
    revalidatePath('/client');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getSystemSettings() {
  try {
    return db.prepare('SELECT * FROM configuracao_sistema').all() as any[];
  } catch (error) {
    console.error('Get settings error:', error);
    return [];
  }
}

export async function updateSystemSetting(chave: string, valor: string) {
  try {
    db.prepare('UPDATE configuracao_sistema SET valor = ? WHERE chave = ?').run(valor, chave);
    revalidatePath('/admin');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function adminSendNotification(userId: string | 'all', titulo: string, mensagem: string) {
  try {
    if (userId === 'all') {
      const users = db.prepare('SELECT uuidUtilizador FROM utilizador').all() as any[];
      const stmt = db.prepare('INSERT INTO notificacao (uuidNotificacao, uuidUtilizador, titulo, mensagem, dataCriacao) VALUES (?, ?, ?, ?, ?)');
      db.transaction(() => {
        for (const user of users) {
          stmt.run(crypto.randomUUID(), user.uuidUtilizador, titulo, mensagem, new Date().toISOString());
        }
      })();
    } else {
      db.prepare('INSERT INTO notificacao (uuidNotificacao, uuidUtilizador, titulo, mensagem, dataCriacao) VALUES (?, ?, ?, ?, ?)')
        .run(crypto.randomUUID(), userId, titulo, mensagem, new Date().toISOString());
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function adminAssignProvider(solicitacaoId: string, providerId: string) {
  try {
    db.prepare("UPDATE solicitacao SET uuidPrestador = ?, estadoSolicitacao = 'Aceite' WHERE uuidSolicitacao = ?")
      .run(providerId, solicitacaoId);
    revalidatePath('/admin');
    revalidatePath('/client');
    revalidatePath('/provider');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getPlatformAccounts() {
  try {
    return db.prepare('SELECT * FROM conta_bancaria_plataforma').all() as any[];
  } catch (error) {
    console.error('Get platform accounts error:', error);
    return [];
  }
}

export async function adminCreatePlatformAccount(data: { banco: string, iban: string, titular: string }) {
  try {
    const uuid = crypto.randomUUID();
    db.prepare('INSERT INTO conta_bancaria_plataforma (uuidConta, banco, iban, titular) VALUES (?, ?, ?, ?)')
      .run(uuid, data.banco, data.iban, data.titular);
    revalidatePath('/admin');
    revalidatePath('/client');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function adminUpdatePlatformAccount(id: string, data: { banco: string, iban: string, titular: string, ativo: number }) {
  try {
    db.prepare('UPDATE conta_bancaria_plataforma SET banco = ?, iban = ?, titular = ?, ativo = ? WHERE uuidConta = ?')
      .run(data.banco, data.iban, data.titular, data.ativo, id);
    revalidatePath('/admin');
    revalidatePath('/client');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function adminDeletePlatformAccount(id: string) {
  try {
    db.prepare('DELETE FROM conta_bancaria_plataforma WHERE uuidConta = ?').run(id);
    revalidatePath('/admin');
    revalidatePath('/client');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
