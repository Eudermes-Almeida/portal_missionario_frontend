import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DadosMissionarioDTO, MissionarioApiService } from '../../services/missionario-api.service';
import { MensagemApiService, MensagemDTO } from '../../services/mensagem-api.service';

// 4 opcoes fixas de status (nao derivadas do dado carregado): "Finalizada" e mantida mesmo
// sem nenhum missionario com esse status hoje, decisao explicita do usuario pensando em
// missionarios retornados no futuro (ver protótipo aprovado).
const STATUSES = ['No Campo', 'Sede da Igreja', 'Preenchendo', 'Finalizada'];

// Opcao extra no filtro de unidade: representa a estaca inteira, nao uma ala/ramo
// especifica, entao selecionar ela equivale a nao filtrar por unidade nenhuma.
const ESTACA_BETIM = 'Estaca Betim';

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

@Component({
  selector: 'app-carrossel-missionarios',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './carrossel-missionarios.component.html',
  styleUrl: './carrossel-missionarios.component.css',
})
export class CarrosselMissionariosComponent implements OnInit {

  todos: DadosMissionarioDTO[] = [];
  lista: DadosMissionarioDTO[] = [];
  index = 0;

  carregando = false;
  erroCarregamento: string | null = null;

  filtroUnidade: string | null = null;
  filtroStatus: string | null = null;
  painelUnidadeAberto = false;
  painelStatusAberto = false;

  detalheAberto = false;
  selecionado: DadosMissionarioDTO | null = null;
  fotoQuebrada = false;

  toastMsg: string | null = null;
  private toastTimer?: ReturnType<typeof setTimeout>;

  readonly MENSAGEM_MAX = 1000;
  modalMensagemAberto = false;
  textoMensagem = '';
  enviandoMensagem = false;
  erroMensagem: string | null = null;

  modalLerMensagensAberto = false;
  carregandoMensagens = false;
  erroCarregarMensagens: string | null = null;
  mensagensCarregadas: MensagemDTO[] = [];

  readonly statuses = STATUSES;

  constructor(
    private missionarioApi: MissionarioApiService,
    private mensagemApi: MensagemApiService,
  ) {}

  ngOnInit(): void {
    this.buscarDados();
  }

  // Unidades vem do proprio dado carregado (nao hardcoded) -- se uma ala/ramo novo aparecer
  // na planilha, a lista de filtro acompanha sem precisar mexer no codigo. "Estaca Betim" é
  // adicionada à parte, no topo, como opção para ver todas as unidades de uma vez.
  get unidades(): string[] {
    const wards = Array.from(new Set(this.todos.map(m => m.unidade))).sort((a, b) => a.localeCompare(b));
    return [ESTACA_BETIM, ...wards];
  }

  private buscarDados(): void {
    this.carregando = true;
    this.erroCarregamento = null;

    this.missionarioApi.buscaDadosMissionarios().subscribe({
      next: (dados) => {
        this.todos = dados;
        this.carregando = false;
        this.aplicarFiltros();
      },
      error: (err) => {
        this.carregando = false;
        this.erroCarregamento = 'Não foi possível carregar os missionários.';
        console.error('Erro ao buscar dadosmissionarios:', err);
      },
    });
  }

  aplicarFiltros(): void {
    this.lista = this.todos.filter(m =>
      (!this.filtroUnidade || this.filtroUnidade === ESTACA_BETIM || m.unidade === this.filtroUnidade) &&
      (!this.filtroStatus || m.status === this.filtroStatus)
    );
    this.index = 0;
  }

  get atual(): DadosMissionarioDTO | null {
    return this.lista.length ? this.lista[this.index] : null;
  }

  get temFiltroAtivo(): boolean {
    return !!(this.filtroUnidade || this.filtroStatus);
  }

  anterior(): void {
    if (!this.lista.length) return;
    this.index = (this.index - 1 + this.lista.length) % this.lista.length;
    this.fotoQuebrada = false;
  }

  proximo(): void {
    if (!this.lista.length) return;
    this.index = (this.index + 1) % this.lista.length;
    this.fotoQuebrada = false;
  }

  onFotoErro(): void {
    this.fotoQuebrada = true;
  }

  toggleUnidade(): void {
    this.painelUnidadeAberto = !this.painelUnidadeAberto;
  }

  toggleStatus(): void {
    this.painelStatusAberto = !this.painelStatusAberto;
  }

  pickUnidade(v: string): void {
    this.filtroUnidade = this.filtroUnidade === v ? null : v;
    this.aplicarFiltros();
  }

  pickStatus(v: string): void {
    this.filtroStatus = this.filtroStatus === v ? null : v;
    this.aplicarFiltros();
  }

  limparFiltros(): void {
    this.filtroUnidade = null;
    this.filtroStatus = null;
    this.painelUnidadeAberto = false;
    this.painelStatusAberto = false;
    this.aplicarFiltros();
  }

  selecionar(m: DadosMissionarioDTO): void {
    this.selecionado = m;
    this.detalheAberto = true;
    this.fotoQuebrada = false;
  }

  voltarAoCarrossel(): void {
    this.detalheAberto = false;
    this.fotoQuebrada = false;
  }

  // Contexto de cada botao fica para o futuro (deliberado) -- por enquanto so confirma
  // visualmente que o clique registrou.
  acaoFutura(nome: string): void {
    this.mostrarToast(`"${nome}" — em breve`);
  }

  private mostrarToast(msg: string): void {
    this.toastMsg = msg;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => (this.toastMsg = null), 1800);
  }

  abrirModalMensagem(): void {
    this.textoMensagem = '';
    this.erroMensagem = null;
    this.modalMensagemAberto = true;
  }

  fecharModalMensagem(): void {
    if (this.enviandoMensagem) {
      return;
    }
    this.modalMensagemAberto = false;
  }

  abrirModalLerMensagens(): void {
    if (!this.selecionado) {
      return;
    }
    this.modalLerMensagensAberto = true;
    this.carregandoMensagens = true;
    this.erroCarregarMensagens = null;
    this.mensagensCarregadas = [];

    this.mensagemApi.buscaMensagensPorMissionario(this.selecionado.id).subscribe({
      next: (mensagens) => {
        this.mensagensCarregadas = mensagens;
        this.carregandoMensagens = false;
      },
      error: () => {
        this.carregandoMensagens = false;
        this.erroCarregarMensagens = 'Não foi possível carregar as mensagens. Tente novamente.';
      },
    });
  }

  fecharModalLerMensagens(): void {
    this.modalLerMensagensAberto = false;
  }

  formatarDia(dia: string): string {
    const partes = dia?.split('-') ?? [];
    return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : dia;
  }

  formatarHora(hora: string): string {
    return hora?.slice(0, 5) ?? hora;
  }

  @HostListener('document:keydown.escape')
  aoPressionarEsc(): void {
    if (this.modalMensagemAberto) {
      this.fecharModalMensagem();
    }
    if (this.modalLerMensagensAberto) {
      this.fecharModalLerMensagens();
    }
  }

  get caracteresRestantes(): number {
    return this.MENSAGEM_MAX - this.textoMensagem.length;
  }

  enviarMensagem(): void {
    const texto = this.textoMensagem.trim();
    if (!texto || !this.selecionado || this.enviandoMensagem) {
      return;
    }

    this.enviandoMensagem = true;
    this.erroMensagem = null;

    this.mensagemApi
      .enviarMensagem({ destinatarioTipo: 'MISSIONARIO', destinatarioId: this.selecionado.id, mensagem: texto })
      .subscribe({
        next: () => {
          this.enviandoMensagem = false;
          this.modalMensagemAberto = false;
          this.mostrarToast('Mensagem enviada!');
        },
        error: (erro) => {
          this.enviandoMensagem = false;
          this.erroMensagem = typeof erro?.error === 'string' ? erro.error : 'Não foi possível enviar a mensagem. Tente novamente.';
        },
      });
  }

  valorOuADefinir(v: string): string {
    return v === 'Indefinido' ? 'A definir' : v;
  }

  aniversarioFmt(data: string): string {
    const partes = data?.split('/') ?? [];
    if (partes.length !== 3) {
      return data;
    }
    const dia = parseInt(partes[0], 10);
    const mes = MESES[parseInt(partes[1], 10) - 1];
    return mes ? `${dia} de ${mes}` : data;
  }
}
