import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://ivumtyhdkjurerknjnpt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2dW10eWhka2p1cmVya25qbnB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzNjUyMjMsImV4cCI6MjA2NTk0MTIyM30.rbkqMbSYczGbJdGSjUvARGLIU3Gf-B9q0RWm0vW99Bs';

// Inicializar cliente Supabase com configurações otimizadas
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

// Debug: Verificar se o Supabase está inicializado corretamente
console.log('🔧 Supabase URL:', supabaseUrl);
console.log('🔧 Cliente Supabase inicializado:', !!supabase);

const FinancialControlApp = () => {
  const [lancamentos, setLancamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  
  // Função para obter o primeiro dia do mês atual
  const getFirstDayOfCurrentMonth = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    return firstDay.toISOString().split('T')[0];
  };

  const [filters, setFilters] = useState({
    categoria: '',
    tipo: '',
    status: '',
    dataInicio: getFirstDayOfCurrentMonth(),
    dataFim: '',
    busca: ''
  });

  // Função para obter data atual no formato correto
  const getCurrentDate = () => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  };

  // Estado para novo lançamento
  const [newLancamento, setNewLancamento] = useState({
    descricao: '',
    observacao: '',
    categoria: '',
    tipo: 'Saida',
    valor: '',
    status: 'Aberto',
    data_vencimento: getCurrentDate()
  });

  // Lista de categorias para reutilização
  const categorias = [
    "Loja",
    "Mercado",
    "Vendas",
    "Casa",
    "Estoque",
    "Pessoal",
    "Servidor",
    "Carro",
    "Pet",
    "Outros",
  ];

  // Testar conexão com Supabase
  const testConnection = async () => {
    try {
      console.log('🔗 Testando conexão com Supabase...');
      const { data, error } = await supabase
        .from('financeiro_lancamentos')
        .select('count', { count: 'exact', head: true });
      
      if (error) {
        throw error;
      }
      
      console.log('✅ Conexão estabelecida com sucesso');
      setConnectionStatus('connected');
      return true;
    } catch (error) {
      console.error('❌ Erro de conexão:', error);
      setConnectionStatus('error');
      setError(`Erro de conexão: ${error.message}`);
      return false;
    }
  };

  // Carregar lançamentos
  const fetchLancamentos = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📥 Carregando lançamentos...');
      console.log('🔍 Filtros aplicados:', filters);
      
      let query = supabase
        .from('financeiro_lancamentos')
        .select('*')
        .order('data_vencimento', { ascending: false });

      // Aplicar filtros
      if (filters.categoria) {
        query = query.eq('categoria', filters.categoria);
        console.log('🏷️ Filtro categoria:', filters.categoria);
      }
      if (filters.tipo) {
        query = query.eq('tipo', filters.tipo);
        console.log('📊 Filtro tipo:', filters.tipo);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
        console.log('📋 Filtro status:', filters.status);
      }
      if (filters.dataInicio) {
        query = query.gte('data_vencimento', filters.dataInicio);
        console.log('📅 Filtro data início:', filters.dataInicio);
      }
      if (filters.dataFim) {
        query = query.lte('data_vencimento', filters.dataFim);
        console.log('📅 Filtro data fim:', filters.dataFim);
      }
      if (filters.busca) {
        query = query.or(`descricao.ilike.%${filters.busca}%,observacao.ilike.%${filters.busca}%`);
        console.log('🔍 Filtro busca:', filters.busca);
      }

      const { data, error } = await query;
      
      if (error) {
        throw error;
      }
      
      console.log('📊 Dados carregados do Supabase:', data);
      console.log('📈 Quantidade de registros:', data ? data.length : 0);
      
      // Verificar estrutura dos dados
      if (data && data.length > 0) {
        console.log('🔍 Primeiro registro:', data[0]);
        console.log('🏗️ Campos disponíveis:', Object.keys(data[0]));
        
        // Verificar especificamente os campos valor e tipo
        data.slice(0, 3).forEach((item, index) => {
          console.log(`📝 Registro ${index + 1}:`, {
            id: item.id,
            descricao: item.descricao,
            tipo: item.tipo,
            valor: item.valor,
            valorType: typeof item.valor
          });
        });
      }
      
      setLancamentos(data || []);
      setConnectionStatus('connected');
    } catch (error) {
      console.error('❌ Erro ao carregar lançamentos:', error);
      setError(`Erro ao carregar dados: ${error.message}`);
      setConnectionStatus('error');
      setLancamentos([]);
    } finally {
      setLoading(false);
    }
  };

  // Inicializar conexão e carregar dados
  useEffect(() => {
    const initializeApp = async () => {
      console.log('🚀 Inicializando aplicação...');
      const isConnected = await testConnection();
      if (isConnected) {
        await fetchLancamentos();
      }
    };
    
    initializeApp();
  }, []);

  // Recarregar quando filtros mudarem
  useEffect(() => {
    if (connectionStatus === 'connected') {
      console.log('🔄 Filtros mudaram, recarregando dados...');
      fetchLancamentos();
    }
  }, [filters]);

  // Calcular resumo financeiro baseado nos dados filtrados carregados
  const resumoFinanceiro = React.useMemo(() => {
    console.log('💰 Calculando resumo financeiro...');
    console.log('📊 Total de lançamentos para calcular:', lancamentos.length);
    
    if (lancamentos.length === 0) {
      console.log('⚠️ Nenhum lançamento para calcular');
      return { receitas: 0, despesas: 0, saldo: 0 };
    }

    // Verificar os tipos únicos nos dados
    const tiposUnicos = [...new Set(lancamentos.map(l => l.tipo))];
    console.log('🏷️ Tipos encontrados nos dados:', tiposUnicos);

    // Filtrar receitas e calcular receitas
    const receitas_list = lancamentos.filter(l => {
      const isReceita = l.tipo === 'Receita';
      if (isReceita) {
        console.log('💚 Receita encontrada:', {
          descricao: l.descricao,
          valor: l.valor,
          valorType: typeof l.valor,
          valorParsed: parseFloat(l.valor)
        });
      }
      return isReceita;
    });
    
    const receitas = receitas_list.reduce((sum, l) => {
      // Tentar múltiplas formas de converter o valor
      let valor = 0;
      if (typeof l.valor === 'number') {
        valor = l.valor;
      } else if (typeof l.valor === 'string') {
        // Remover caracteres não numéricos exceto ponto e vírgula
        const cleanValue = l.valor.replace(/[^\d.,-]/g, '').replace(',', '.');
        valor = parseFloat(cleanValue) || 0;
      }
      console.log('➕ Somando receita:', {
        original: l.valor,
        converted: valor,
        description: l.descricao
      });
      return sum + valor;
    }, 0);

    // Filtrar saidas e calcular despesas
    const saidas = lancamentos.filter(l => {
      const isSaida = l.tipo === 'Saida';
      if (isSaida) {
        console.log('🔴 Saida encontrada:', {
          descricao: l.descricao,
          valor: l.valor,
          valorType: typeof l.valor,
          valorParsed: parseFloat(l.valor)
        });
      }
      return isSaida;
    });
    
    const despesas = saidas.reduce((sum, l) => {
      // Tentar múltiplas formas de converter o valor
      let valor = 0;
      if (typeof l.valor === 'number') {
        valor = l.valor;
      } else if (typeof l.valor === 'string') {
        // Remover caracteres não numéricos exceto ponto e vírgula
        const cleanValue = l.valor.replace(/[^\d.,-]/g, '').replace(',', '.');
        valor = parseFloat(cleanValue) || 0;
      }
      console.log('➖ Somando despesa:', {
        original: l.valor,
        converted: valor,
        description: l.descricao
      });
      return sum + valor;
    }, 0);

    const saldo = receitas - despesas;

    console.log('✅ Resumo calculado:', { 
      receitas, 
      despesas, 
      saldo,
      totalReceitas: receitas_list.length,
      totalSaidas: saidas.length
    });

    return {
      receitas,
      despesas,
      saldo
    };
  }, [lancamentos]);

  // Função para gerar UUID simples
  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  // Salvar lançamento
  const saveLancamento = async () => {
    try {
      setError(null);
      
      let data;
      let result;
      
      if (editingItem) {
        // Para update, não incluímos o ID
        data = {
          descricao: newLancamento.descricao,
          observacao: newLancamento.observacao,
          categoria: newLancamento.categoria,
          tipo: newLancamento.tipo,
          valor: parseFloat(newLancamento.valor) || 0,
          status: newLancamento.status,
          data_vencimento: newLancamento.data_vencimento
        };
        
        console.log('💾 Atualizando lançamento:', data);
        result = await supabase
          .from('financeiro_lancamentos')
          .update(data)
          .eq('id', editingItem.id);
      } else {
        // Para insert, incluímos um ID gerado
        data = {
          id: generateUUID(),
          descricao: newLancamento.descricao,
          observacao: newLancamento.observacao,
          categoria: newLancamento.categoria,
          tipo: newLancamento.tipo,
          valor: parseFloat(newLancamento.valor) || 0,
          status: newLancamento.status,
          data_vencimento: newLancamento.data_vencimento,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        console.log('💾 Inserindo novo lançamento:', data);
        result = await supabase
          .from('financeiro_lancamentos')
          .insert([data]);
      }

      if (result.error) {
        throw result.error;
      }

      console.log('✅ Lançamento salvo com sucesso');
      setShowModal(false);
      setEditingItem(null);
      setNewLancamento({
        descricao: '',
        observacao: '',
        categoria: '',
        tipo: 'Saida',
        valor: '',
        status: 'Aberto',
        data_vencimento: getCurrentDate()
      });
      await fetchLancamentos();
    } catch (error) {
      console.error('❌ Erro ao salvar:', error);
      setError(`Erro ao salvar: ${error.message}`);
    }
  };

  // Deletar lançamento
  const deleteLancamento = async (id) => {
    if (confirm('Deseja realmente excluir este lançamento?')) {
      try {
        setError(null);
        console.log('🗑️ Deletando lançamento:', id);
        
        const { error } = await supabase
          .from('financeiro_lancamentos')
          .delete()
          .eq('id', id);

        if (error) {
          throw error;
        }

        console.log('✅ Lançamento deletado com sucesso');
        await fetchLancamentos();
      } catch (error) {
        console.error('❌ Erro ao deletar:', error);
        setError(`Erro ao deletar: ${error.message}`);
      }
    }
  };

  // Duplicar lançamento
  const duplicateLancamento = (item) => {
    setEditingItem(null);
    // Garantir que usamos a data atual no formato correto
    const today = new Date();
    const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    setNewLancamento({
      descricao: item.descricao + ' (Cópia)',
      observacao: item.observacao,
      categoria: item.categoria,
      tipo: item.tipo,
      valor: item.valor,
      status: 'Aberto',
      data_vencimento: todayString
    });
    setShowModal(true);
  };

  // Editar lançamento
  const editLancamento = (item) => {
    setEditingItem(item);
    setNewLancamento({
      descricao: item.descricao,
      observacao: item.observacao || '',
      categoria: item.categoria,
      tipo: item.tipo,
      valor: item.valor.toString(),
      status: item.status,
      data_vencimento: item.data_vencimento // Manter formato original YYYY-MM-DD
    });
    setShowModal(true);
  };

  // Fechar lançamento (mudar status de Aberto para Fechado)
  const fecharLancamento = async (id) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('financeiro_lancamentos')
        .update({ status: 'Fechado' })
        .eq('id', id);

      if (error) throw error;

      console.log('✅ Lançamento fechado com sucesso');
      await fetchLancamentos(); // Recarregar a lista
    } catch (error) {
      console.error('❌ Erro ao fechar lançamento:', error);
      setError(`Erro ao fechar lançamento: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Exportar para CSV
  const exportToCSV = () => {
    const headers = ['data_vencimento', 'descricao', 'observacao', 'categoria', 'tipo', 'valor', 'status'];
    const csvContent = [
      headers.join(','),
      ...lancamentos.map(item => [
        item.data_vencimento,
        `"${item.descricao}"`,
        `"${item.observacao || ''}"`,
        item.categoria,
        item.tipo,
        item.valor,
        item.status
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `lancamentos_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString) => {
    // Evitar problemas de timezone criando a data corretamente
    const [year, month, day] = dateString.split('-');
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Lançamentos</h1>
            <div className="flex items-center gap-3">
              <p className="text-slate-400">Gerencie suas receitas e despesas</p>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  connectionStatus === 'connected' ? 'bg-green-400' :
                  connectionStatus === 'connecting' ? 'bg-yellow-400' : 'bg-red-400'
                }`}></div>
                <span className="text-xs text-slate-400">
                  {connectionStatus === 'connected' ? 'Conectado' :
                   connectionStatus === 'connecting' ? 'Conectando...' : 'Erro de conexão'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
            <button
              onClick={() => setShowModal(true)}
              disabled={connectionStatus !== 'connected'}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-4 py-2 rounded-lg font-medium transition-colors"
            >
              + Novo Lançamento
            </button>
            <button
              onClick={exportToCSV}
              disabled={lancamentos.length === 0}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Exportar CSV
            </button>

          </div>
        </div>

        {/* Filtros */}
        <div className="bg-slate-800 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <span className="mr-2">🔍</span> Filtros
          </h3>
          
          {/* Campo de busca em destaque */}
          <div className="mb-4">
            <input
              type="text"
              value={filters.busca}
              onChange={(e) => setFilters({...filters, busca: e.target.value})}
              className="w-full bg-slate-700 border border-slate-600 rounded px-4 py-3 text-white placeholder-slate-400"
              placeholder="🔍 Buscar por descrição ou observação..."
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <select
              value={filters.categoria}
              onChange={(e) => setFilters({...filters, categoria: e.target.value})}
              className="bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
            >
              <option value="">Todas Categorias</option>
              {categorias.map(categoria => (
                <option key={categoria} value={categoria}>{categoria}</option>
              ))}
            </select>

            <select
              value={filters.tipo}
              onChange={(e) => setFilters({...filters, tipo: e.target.value})}
              className="bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
            >
              <option value="">Todos os Tipos</option>
              <option value="Receita">Receita</option>
              <option value="Saida">Saida</option>
            </select>

            <select
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
              className="bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
            >
              <option value="">Todos Status</option>
              <option value="Aberto">Aberto</option>
              <option value="Fechado">Fechado</option>
            </select>

            <input
              type="date"
              value={filters.dataInicio}
              onChange={(e) => setFilters({...filters, dataInicio: e.target.value})}
              className="bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
              placeholder="Data Início"
            />

            <input
              type="date"
              value={filters.dataFim}
              onChange={(e) => setFilters({...filters, dataFim: e.target.value})}
              className="bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
              placeholder="Data Fim"
            />
          </div>
        </div>

        {/* Resumo Financeiro */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-slate-800 rounded-lg p-6">
            <h3 className="text-slate-400 text-sm mb-2">Total Receitas (Filtrado)</h3>
            <p className="text-2xl font-bold text-green-400">
              {formatCurrency(resumoFinanceiro.receitas)}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {lancamentos.filter(l => l.tipo === 'Receita').length} receita(s)
            </p>
          </div>
          <div className="bg-slate-800 rounded-lg p-6">
            <h3 className="text-slate-400 text-sm mb-2">Total Saídas (Filtrado)</h3>
            <p className="text-2xl font-bold text-red-400">
              {formatCurrency(resumoFinanceiro.despesas)}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {lancamentos.filter(l => l.tipo === 'Saida').length} saida(s)
            </p>
          </div>
          <div className="bg-slate-800 rounded-lg p-6">
            <h3 className="text-slate-400 text-sm mb-2">Saldo (Filtrado)</h3>
            <p className={`text-2xl font-bold ${resumoFinanceiro.saldo >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {formatCurrency(resumoFinanceiro.saldo)}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {lancamentos.length} total de lançamentos
            </p>
          </div>
        </div>

        {/* Status e contador de lançamentos */}
        <div className="mb-4">
          {error && (
            <div className="bg-red-900/50 border border-red-700 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-red-400">⚠️</span>
                <span className="text-red-300 font-medium">Erro:</span>
                <span className="text-red-200">{error}</span>
                <button
                  onClick={() => {
                    setError(null);
                    fetchLancamentos();
                  }}
                  className="ml-auto bg-red-700 hover:bg-red-600 px-2 py-1 rounded text-xs transition-colors"
                >
                  Tentar novamente
                </button>
              </div>
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <p className="text-slate-400">
              {lancamentos.length} lançamento(s) encontrado(s)
            </p>
            {connectionStatus === 'connected' && (
              <div className="flex flex-col text-right">
                <p className="text-xs text-green-400">
                  ✅ Dados carregados do Supabase
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Tabela de Lançamentos */}
        <div className="bg-slate-800 rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
              <p className="mt-2 text-slate-400">
                {connectionStatus === 'connecting' ? 'Conectando ao Supabase...' : 'Carregando dados...'}
              </p>
            </div>
          ) : connectionStatus === 'error' && !error ? (
            <div className="p-8 text-center">
              <div className="text-red-400 text-4xl mb-4">⚠️</div>
              <h3 className="text-lg font-medium text-red-300 mb-2">Erro de Conexão</h3>
              <p className="text-slate-400 mb-4">Não foi possível conectar ao banco de dados</p>
              <button
                onClick={() => {
                  setConnectionStatus('connecting');
                  testConnection().then(success => {
                    if (success) fetchLancamentos();
                  });
                }}
                className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition-colors"
              >
                Tentar Reconectar
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Data Vencimento</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Descrição</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Categoria</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Tipo</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Valor</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {lancamentos.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-700">
                      <td className="px-4 py-3 text-sm">{formatDate(item.data_vencimento)}</td>
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-medium">{item.descricao}</div>
                          {item.observacao && (
                            <div className="text-sm text-slate-400">{item.observacao}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="bg-slate-600 px-2 py-1 rounded text-sm">
                          {item.categoria}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-sm ${
                          item.tipo === 'Receita' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
                        }`}>
                          {item.tipo}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {formatCurrency(item.valor)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-sm ${
                          item.status === 'Fechado' ? 'bg-green-900 text-green-300' : 'bg-yellow-900 text-yellow-300'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => editLancamento(item)}
                            className="text-blue-400 hover:text-blue-300 p-1"
                            title="Editar"
                          >
                            ✏️
                          </button>
                          {item.status === 'Aberto' && (
                            <button
                              onClick={() => fecharLancamento(item.id)}
                              className="text-green-400 hover:text-green-300 p-1"
                              title="Fechar"
                            >
                              ✅
                            </button>
                          )}
                          <button
                            onClick={() => deleteLancamento(item.id)}
                            className="text-red-400 hover:text-red-300 p-1"
                            title="Excluir"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {lancamentos.length === 0 && !loading && (
                <div className="p-8 text-center text-slate-400">
                  Nenhum lançamento encontrado
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 rounded-lg w-full max-w-md">
              <div className="p-6">
                <h2 className="text-xl font-bold mb-4">
                  {editingItem ? 'Editar Lançamento' : 'Novo Lançamento'}
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Data de Vencimento</label>
                    <input
                      type="date"
                      value={newLancamento.data_vencimento}
                      onChange={(e) => setNewLancamento({...newLancamento, data_vencimento: e.target.value})}
                      className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Descrição</label>
                    <div className="flex gap-2">
                      <select
                        value={newLancamento.descricao}
                        onChange={(e) => setNewLancamento({...newLancamento, descricao: e.target.value})}
                        className="w-1/2 bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                      >
                        <option value="">Selecione ou digite</option>
                        {categorias.map(categoria => (
                          <option key={categoria} value={categoria}>{categoria}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={newLancamento.descricao}
                        onChange={(e) => setNewLancamento({...newLancamento, descricao: e.target.value})}
                        className="w-1/2 bg-slate-700 border border-slate-600 rounded px-3 py-2"
                        placeholder="Ou digite a descrição"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Observação</label>
                    <textarea
                      value={newLancamento.observacao}
                      onChange={(e) => setNewLancamento({...newLancamento, observacao: e.target.value})}
                      className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2"
                      rows="2"
                      placeholder="Observações adicionais"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Categoria</label>
                    <select
                      value={newLancamento.categoria}
                      onChange={(e) => setNewLancamento({...newLancamento, categoria: e.target.value})}
                      className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2"
                    >
                      <option value="">Selecione uma categoria</option>
                      {categorias.map(categoria => (
                        <option key={categoria} value={categoria}>{categoria}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Tipo</label>
                      <select
                        value={newLancamento.tipo}
                        onChange={(e) => setNewLancamento({...newLancamento, tipo: e.target.value})}
                        className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2"
                      >
                        <option value="Receita">Receita</option>
                        <option value="Saida">Saida</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Status</label>
                      <select
                        value={newLancamento.status}
                        onChange={(e) => setNewLancamento({...newLancamento, status: e.target.value})}
                        className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2"
                      >
                        <option value="Aberto">Aberto</option>
                        <option value="Fechado">Fechado</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Valor</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newLancamento.valor}
                      onChange={(e) => setNewLancamento({...newLancamento, valor: e.target.value})}
                      className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2"
                      placeholder="0,00"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2 mt-6">
                  <button
                    onClick={() => {
                      setShowModal(false);
                      setEditingItem(null);
                      setNewLancamento({
                        descricao: '',
                        observacao: '',
                        categoria: '',
                        tipo: 'Saida',
                        valor: '',
                        status: 'Aberto',
                        data_vencimento: getCurrentDate()
                      });
                    }}
                    className="px-4 py-2 bg-slate-600 hover:bg-slate-700 rounded transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={saveLancamento}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded transition-colors"
                  >
                    {editingItem ? 'Atualizar' : 'Salvar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FinancialControlApp;
