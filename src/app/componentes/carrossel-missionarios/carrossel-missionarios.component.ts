import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { DadosMissionarioDTO, MissionarioApiService } from '../../services/missionario-api.service';
import { AutorReacao, MensagemApiService, MensagemDTO, TipoReacao } from '../../services/mensagem-api.service';
import { ExperienciaApiService, ExperienciaComentarioDTO, ExperienciaDTO } from '../../services/experiencia-api.service';
import { FotoApiService, FotoComentarioDTO, FotoDTO } from '../../services/foto-api.service';
import { comprimirImagem } from '../../utils/compressao-imagem';

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

// As 5 reações fixas do botão "Manifestar" (mesma ordem em que aparecem no seletor), espelhando
// o CHECK ck_mensagem_reacao_tipo no banco.
const REACOES: { tipo: TipoReacao; emoji: string; label: string }[] = [
  { tipo: 'CURTIDA', emoji: '👍', label: 'Curtida' },
  { tipo: 'DESLIKE', emoji: '👎', label: 'Não curti' },
  { tipo: 'CORACAO', emoji: '❤️', label: 'Coração' },
  { tipo: 'SURPRESA', emoji: '😮', label: 'Surpresa' },
  { tipo: 'TRISTEZA', emoji: '😢', label: 'Tristeza' },
];
const EMOJI_POR_TIPO: Record<TipoReacao, string> = Object.fromEntries(
  REACOES.map(r => [r.tipo, r.emoji])
) as Record<TipoReacao, string>;

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

  readonly EMAIL_MENSAGEM_MAX = 10000;
  modalEmailAberto = false;
  textoEmail = '';
  emailRemetenteOpcional = '';
  enviandoEmail = false;
  erroEmail: string | null = null;

  modalLerMensagensAberto = false;
  carregandoMensagens = false;
  erroCarregarMensagens: string | null = null;
  mensagensCarregadas: MensagemDTO[] = [];

  readonly statuses = STATUSES;
  readonly reacoesDisponiveis = REACOES;

  manifestarAbertoId: number | null = null;
  reagindoId: number | null = null;

  detalheReacaoAberto: { mensagemId: number; tipo: TipoReacao } | null = null;
  carregandoDetalheReacao = false;
  erroDetalheReacao: string | null = null;
  autoresReacao: AutorReacao[] = [];

  // "Escrever Experiência" / "Ler Experiências" -- mesma tratativa de mensagens (ver acima),
  // só que o autor é sempre o próprio missionário (ver ExperienciaService no backend) e o
  // limite de caracteres é maior.
  readonly EXPERIENCIA_MAX = 10000;
  modalEscreverExperienciaAberto = false;
  textoExperiencia = '';
  enviandoExperiencia = false;
  erroExperiencia: string | null = null;

  modalLerExperienciasAberto = false;
  carregandoExperiencias = false;
  erroCarregarExperiencias: string | null = null;
  experienciasCarregadas: ExperienciaDTO[] = [];

  manifestarExperienciaAbertoId: number | null = null;
  reagindoExperienciaId: number | null = null;

  detalheReacaoExperienciaAberto: { experienciaId: number; tipo: TipoReacao } | null = null;
  carregandoDetalheReacaoExperiencia = false;
  erroDetalheReacaoExperiencia: string | null = null;
  autoresReacaoExperiencia: AutorReacao[] = [];

  // Comentários numa experiência -- mesma metodologia de fotos (autor congelado, até 100
  // caracteres, múltiplos por pessoa, carregados sob demanda). Diferença: a lista de
  // experiências já mostra todos os cards abertos ao mesmo tempo (não há lightbox de "1 por
  // vez"), então o painel de comentários expande dentro do próprio card -- só um card por vez
  // (mesmo padrão de manifestarExperienciaAbertoId/detalheReacaoExperienciaAberto, que também
  // são singletons apesar de vários cards existirem juntos).
  comentariosExperienciaAbertaId: number | null = null;
  carregandoComentariosExperiencia = false;
  erroComentariosExperiencia: string | null = null;
  comentariosDaExperiencia: ExperienciaComentarioDTO[] = [];
  textoComentarioExperiencia = '';
  enviandoComentarioExperiencia = false;
  erroComentarioExperiencia: string | null = null;

  // "Subir fotos" / "Ver fotos" -- upload nao usa modal (nao ha texto pra digitar, so escolher
  // um arquivo), o <input type="file"> escondido no template dispara direto. "Ver fotos" abre
  // uma grade; clicar numa miniatura amplia em tela cheia (lightbox).
  enviandoFoto = false;
  modalVerFotosAberto = false;
  carregandoFotos = false;
  erroCarregarFotos: string | null = null;
  fotosCarregadas: FotoDTO[] = [];
  fotoAmpliada: FotoDTO | null = null;

  // Manifestar + comentários dentro do lightbox -- como só uma foto fica ampliada por vez (ao
  // contrário da lista de mensagens/experiências, onde vários itens aparecem juntos), não
  // precisa de um Map/id por item, só estado simples "desta foto aberta agora".
  readonly COMENTARIO_MAX = 100;
  manifestarFotoAberto = false;
  reagindoFoto = false;
  detalheReacaoFotoAberto: TipoReacao | null = null;
  carregandoDetalheReacaoFoto = false;
  erroDetalheReacaoFoto: string | null = null;
  autoresReacaoFoto: AutorReacao[] = [];

  carregandoComentariosFoto = false;
  erroComentariosFoto: string | null = null;
  comentariosDaFoto: FotoComentarioDTO[] = [];
  textoComentarioFoto = '';
  enviandoComentarioFoto = false;
  erroComentarioFoto: string | null = null;

  constructor(
    private missionarioApi: MissionarioApiService,
    private mensagemApi: MensagemApiService,
    private experienciaApi: ExperienciaApiService,
    private fotoApi: FotoApiService,
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

  // "temEmail" vem do backend sem o endereço em si (ver DadosMissionarioDTO) -- se o
  // missionário ainda não tem email cadastrado, avisa com toast em vez de abrir o modal pra
  // um envio que sempre falharia.
  abrirModalEmail(): void {
    if (!this.selecionado) {
      return;
    }
    if (!this.selecionado.temEmail) {
      this.mostrarToast('Este missionário ainda não tem email cadastrado.');
      return;
    }
    this.textoEmail = '';
    this.emailRemetenteOpcional = '';
    this.erroEmail = null;
    this.modalEmailAberto = true;
  }

  fecharModalEmail(): void {
    if (this.enviandoEmail) {
      return;
    }
    this.modalEmailAberto = false;
  }

  get caracteresRestantesEmail(): number {
    return this.EMAIL_MENSAGEM_MAX - this.textoEmail.length;
  }

  enviarEmail(): void {
    const texto = this.textoEmail.trim();
    if (!texto || !this.selecionado || this.enviandoEmail) {
      return;
    }

    this.enviandoEmail = true;
    this.erroEmail = null;

    const emailRemetente = this.emailRemetenteOpcional.trim();

    this.missionarioApi
      .enviarEmail(this.selecionado.id, { mensagem: texto, emailRemetente: emailRemetente || undefined })
      .subscribe({
        next: () => {
          this.enviandoEmail = false;
          this.modalEmailAberto = false;
          this.mostrarToast('Email enviado!');
        },
        error: (erro) => {
          this.enviandoEmail = false;
          this.erroEmail = typeof erro?.error === 'string' ? erro.error : 'Não foi possível enviar o email. Tente novamente.';
        },
      });
  }

  // "podeEscreverExperiencia" já vem calculado pelo backend (comparando o registromembro do
  // membro logado com o do missionário -- ver DadosMissionariosDTO) -- o botão fica sempre
  // visível, só desabilitado quando essa flag é false (ver template).
  abrirModalEscreverExperiencia(): void {
    if (!this.selecionado?.podeEscreverExperiencia) {
      return;
    }
    this.textoExperiencia = '';
    this.erroExperiencia = null;
    this.modalEscreverExperienciaAberto = true;
  }

  fecharModalEscreverExperiencia(): void {
    if (this.enviandoExperiencia) {
      return;
    }
    this.modalEscreverExperienciaAberto = false;
  }

  get caracteresRestantesExperiencia(): number {
    return this.EXPERIENCIA_MAX - this.textoExperiencia.length;
  }

  escreverExperiencia(): void {
    const texto = this.textoExperiencia.trim();
    if (!texto || !this.selecionado || this.enviandoExperiencia) {
      return;
    }

    this.enviandoExperiencia = true;
    this.erroExperiencia = null;

    this.experienciaApi.escreverExperiencia(this.selecionado.id, { experiencia: texto }).subscribe({
      next: () => {
        this.enviandoExperiencia = false;
        this.modalEscreverExperienciaAberto = false;
        this.mostrarToast('Experiência publicada!');
      },
      error: (erro) => {
        this.enviandoExperiencia = false;
        this.erroExperiencia = typeof erro?.error === 'string' ? erro.error : 'Não foi possível publicar a experiência. Tente novamente.';
      },
    });
  }

  abrirModalLerExperiencias(): void {
    if (!this.selecionado) {
      return;
    }
    this.modalLerExperienciasAberto = true;
    this.carregandoExperiencias = true;
    this.erroCarregarExperiencias = null;
    this.experienciasCarregadas = [];

    this.experienciaApi.buscaExperienciasPorMissionario(this.selecionado.id).subscribe({
      next: (experiencias) => {
        this.experienciasCarregadas = experiencias;
        this.carregandoExperiencias = false;
      },
      error: () => {
        this.carregandoExperiencias = false;
        this.erroCarregarExperiencias = 'Não foi possível carregar as experiências. Tente novamente.';
      },
    });
  }

  fecharModalLerExperiencias(): void {
    this.modalLerExperienciasAberto = false;
    this.manifestarExperienciaAbertoId = null;
    this.detalheReacaoExperienciaAberto = null;
    this.comentariosExperienciaAbertaId = null;
  }

  toggleManifestarExperiencia(experienciaId: number): void {
    this.detalheReacaoExperienciaAberto = null;
    this.manifestarExperienciaAbertoId = this.manifestarExperienciaAbertoId === experienciaId ? null : experienciaId;
  }

  abrirDetalheReacaoExperiencia(exp: ExperienciaDTO, tipo: TipoReacao): void {
    this.manifestarExperienciaAbertoId = null;

    if (this.detalheReacaoExperienciaAberto?.experienciaId === exp.id && this.detalheReacaoExperienciaAberto?.tipo === tipo) {
      this.detalheReacaoExperienciaAberto = null;
      return;
    }

    this.detalheReacaoExperienciaAberto = { experienciaId: exp.id, tipo };
    this.carregandoDetalheReacaoExperiencia = true;
    this.erroDetalheReacaoExperiencia = null;
    this.autoresReacaoExperiencia = [];

    this.experienciaApi.listaAutoresReacao(exp.id, tipo).subscribe({
      next: (autores) => {
        this.autoresReacaoExperiencia = autores;
        this.carregandoDetalheReacaoExperiencia = false;
      },
      error: () => {
        this.carregandoDetalheReacaoExperiencia = false;
        this.erroDetalheReacaoExperiencia = 'Não foi possível carregar quem reagiu. Tente novamente.';
      },
    });
  }

  reagirExperiencia(exp: ExperienciaDTO, tipo: TipoReacao): void {
    if (this.reagindoExperienciaId === exp.id) {
      return;
    }
    this.reagindoExperienciaId = exp.id;

    this.experienciaApi.reagir(exp.id, tipo).subscribe({
      next: (resposta) => {
        exp.reacoes = resposta.reacoes;
        exp.minhaReacao = resposta.minhaReacao;
        this.reagindoExperienciaId = null;
        this.manifestarExperienciaAbertoId = null;
        if (this.detalheReacaoExperienciaAberto?.experienciaId === exp.id) {
          this.detalheReacaoExperienciaAberto = null;
        }
      },
      error: () => {
        this.reagindoExperienciaId = null;
        this.mostrarToast('Não foi possível registrar sua reação. Tente novamente.');
      },
    });
  }

  // Abre/fecha o painel de comentários dentro do próprio card (não é lightbox) -- clicar de
  // novo no mesmo card fecha; abrir um card fecha qualquer outro painel/picker aberto (mesma
  // regra de exclusividade já usada pelo Manifestar e "quem reagiu" na lista).
  toggleComentariosExperiencia(exp: ExperienciaDTO): void {
    this.manifestarExperienciaAbertoId = null;
    this.detalheReacaoExperienciaAberto = null;

    if (this.comentariosExperienciaAbertaId === exp.id) {
      this.comentariosExperienciaAbertaId = null;
      return;
    }

    this.comentariosExperienciaAbertaId = exp.id;
    this.textoComentarioExperiencia = '';
    this.erroComentarioExperiencia = null;

    this.carregandoComentariosExperiencia = true;
    this.erroComentariosExperiencia = null;
    this.comentariosDaExperiencia = [];

    this.experienciaApi.buscaComentariosPorExperiencia(exp.id).subscribe({
      next: (comentarios) => {
        this.comentariosDaExperiencia = comentarios;
        this.carregandoComentariosExperiencia = false;
      },
      error: () => {
        this.carregandoComentariosExperiencia = false;
        this.erroComentariosExperiencia = 'Não foi possível carregar os comentários. Tente novamente.';
      },
    });
  }

  get caracteresRestantesComentarioExperiencia(): number {
    return this.COMENTARIO_MAX - this.textoComentarioExperiencia.length;
  }

  escreverComentarioExperiencia(exp: ExperienciaDTO): void {
    const texto = this.textoComentarioExperiencia.trim();
    if (!texto || this.enviandoComentarioExperiencia) {
      return;
    }

    this.enviandoComentarioExperiencia = true;
    this.erroComentarioExperiencia = null;

    this.experienciaApi.escreverComentario(exp.id, texto).subscribe({
      next: (comentario) => {
        this.comentariosDaExperiencia = [comentario, ...this.comentariosDaExperiencia];
        exp.quantidadeComentarios = (exp.quantidadeComentarios ?? 0) + 1;
        this.textoComentarioExperiencia = '';
        this.enviandoComentarioExperiencia = false;
      },
      error: (erro) => {
        this.enviandoComentarioExperiencia = false;
        this.erroComentarioExperiencia = typeof erro?.error === 'string' ? erro.error : 'Não foi possível enviar o comentário. Tente novamente.';
      },
    });
  }

  // "podeSubirFoto" vem calculado pelo backend (mesmo cálculo de "podeEscreverExperiencia",
  // ver DadosMissionariosDTO) -- clicar no botão desabilitado nem deveria disparar isto, mas a
  // checagem fica aqui também por segurança (mesmo padrão de abrirModalEscreverExperiencia).
  abrirSeletorFoto(inputFoto: HTMLInputElement): void {
    if (!this.selecionado?.podeSubirFoto || this.enviandoFoto) {
      return;
    }
    inputFoto.click();
  }

  onArquivoFotoSelecionado(event: Event, inputFoto: HTMLInputElement): void {
    const arquivo = (event.target as HTMLInputElement).files?.[0] ?? null;
    inputFoto.value = ''; // permite selecionar o mesmo arquivo de novo depois

    if (!arquivo || !this.selecionado) {
      return;
    }

    this.enviandoFoto = true;
    this.mostrarToast('Enviando foto...');

    comprimirImagem(arquivo)
      .then((blob) => firstValueFrom(this.fotoApi.subirFoto(this.selecionado!.id, blob)))
      .then(() => {
        this.enviandoFoto = false;
        this.mostrarToast('Foto enviada!');
      })
      .catch((erro) => {
        this.enviandoFoto = false;
        const mensagem = typeof erro?.error === 'string' ? erro.error : 'Não foi possível enviar a foto. Tente novamente.';
        this.mostrarToast(mensagem);
      });
  }

  abrirModalVerFotos(): void {
    if (!this.selecionado) {
      return;
    }
    this.modalVerFotosAberto = true;
    this.carregandoFotos = true;
    this.erroCarregarFotos = null;
    this.fotosCarregadas = [];

    this.fotoApi.buscaFotosPorMissionario(this.selecionado.id).subscribe({
      next: (fotos) => {
        this.fotosCarregadas = fotos;
        this.carregandoFotos = false;
      },
      error: () => {
        this.carregandoFotos = false;
        this.erroCarregarFotos = 'Não foi possível carregar as fotos. Tente novamente.';
      },
    });
  }

  fecharModalVerFotos(): void {
    this.modalVerFotosAberto = false;
    this.fotoAmpliada = null;
  }

  ampliarFoto(foto: FotoDTO): void {
    this.fotoAmpliada = foto;
    this.manifestarFotoAberto = false;
    this.detalheReacaoFotoAberto = null;
    this.textoComentarioFoto = '';
    this.erroComentarioFoto = null;

    this.carregandoComentariosFoto = true;
    this.erroComentariosFoto = null;
    this.comentariosDaFoto = [];

    this.fotoApi.buscaComentariosPorFoto(foto.id).subscribe({
      next: (comentarios) => {
        this.comentariosDaFoto = comentarios;
        this.carregandoComentariosFoto = false;
      },
      error: () => {
        this.carregandoComentariosFoto = false;
        this.erroComentariosFoto = 'Não foi possível carregar os comentários. Tente novamente.';
      },
    });
  }

  fecharFotoAmpliada(): void {
    this.fotoAmpliada = null;
    this.manifestarFotoAberto = false;
    this.detalheReacaoFotoAberto = null;
  }

  toggleManifestarFoto(): void {
    this.detalheReacaoFotoAberto = null;
    this.manifestarFotoAberto = !this.manifestarFotoAberto;
  }

  abrirDetalheReacaoFoto(tipo: TipoReacao): void {
    if (!this.fotoAmpliada) {
      return;
    }
    this.manifestarFotoAberto = false;

    if (this.detalheReacaoFotoAberto === tipo) {
      this.detalheReacaoFotoAberto = null;
      return;
    }

    this.detalheReacaoFotoAberto = tipo;
    this.carregandoDetalheReacaoFoto = true;
    this.erroDetalheReacaoFoto = null;
    this.autoresReacaoFoto = [];

    this.fotoApi.listaAutoresReacao(this.fotoAmpliada.id, tipo).subscribe({
      next: (autores) => {
        this.autoresReacaoFoto = autores;
        this.carregandoDetalheReacaoFoto = false;
      },
      error: () => {
        this.carregandoDetalheReacaoFoto = false;
        this.erroDetalheReacaoFoto = 'Não foi possível carregar quem reagiu. Tente novamente.';
      },
    });
  }

  reagirFoto(tipo: TipoReacao): void {
    const foto = this.fotoAmpliada;
    if (!foto || this.reagindoFoto) {
      return;
    }
    this.reagindoFoto = true;

    this.fotoApi.reagir(foto.id, tipo).subscribe({
      next: (resposta) => {
        foto.reacoes = resposta.reacoes;
        foto.minhaReacao = resposta.minhaReacao;
        this.reagindoFoto = false;
        this.manifestarFotoAberto = false;
        if (this.detalheReacaoFotoAberto !== null) {
          this.detalheReacaoFotoAberto = null;
        }
      },
      error: () => {
        this.reagindoFoto = false;
        this.mostrarToast('Não foi possível registrar sua reação. Tente novamente.');
      },
    });
  }

  get caracteresRestantesComentarioFoto(): number {
    return this.COMENTARIO_MAX - this.textoComentarioFoto.length;
  }

  escreverComentarioFoto(): void {
    const foto = this.fotoAmpliada;
    const texto = this.textoComentarioFoto.trim();
    if (!foto || !texto || this.enviandoComentarioFoto) {
      return;
    }

    this.enviandoComentarioFoto = true;
    this.erroComentarioFoto = null;

    this.fotoApi.escreverComentario(foto.id, texto).subscribe({
      next: (comentario) => {
        this.comentariosDaFoto = [comentario, ...this.comentariosDaFoto];
        foto.temComentario = true;
        this.textoComentarioFoto = '';
        this.enviandoComentarioFoto = false;
      },
      error: (erro) => {
        this.enviandoComentarioFoto = false;
        this.erroComentarioFoto = typeof erro?.error === 'string' ? erro.error : 'Não foi possível enviar o comentário. Tente novamente.';
      },
    });
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
    this.manifestarAbertoId = null;
    this.detalheReacaoAberto = null;
  }

  toggleManifestar(mensagemId: number): void {
    this.detalheReacaoAberto = null;
    this.manifestarAbertoId = this.manifestarAbertoId === mensagemId ? null : mensagemId;
  }

  emojiDoTipo(tipo: TipoReacao): string {
    return EMOJI_POR_TIPO[tipo] ?? '';
  }

  // Clicar num pill de reação (👍 3, por exemplo) abre um popover ancorado nele com quem
  // reagiu daquele jeito -- clicar de novo no mesmo pill fecha (mesmo padrão de toggle do
  // seletor "Manifestar").
  abrirDetalheReacao(msg: MensagemDTO, tipo: TipoReacao): void {
    this.manifestarAbertoId = null;

    if (this.detalheReacaoAberto?.mensagemId === msg.id && this.detalheReacaoAberto?.tipo === tipo) {
      this.detalheReacaoAberto = null;
      return;
    }

    this.detalheReacaoAberto = { mensagemId: msg.id, tipo };
    this.carregandoDetalheReacao = true;
    this.erroDetalheReacao = null;
    this.autoresReacao = [];

    this.mensagemApi.listaAutoresReacao(msg.id, tipo).subscribe({
      next: (autores) => {
        this.autoresReacao = autores;
        this.carregandoDetalheReacao = false;
      },
      error: () => {
        this.carregandoDetalheReacao = false;
        this.erroDetalheReacao = 'Não foi possível carregar quem reagiu. Tente novamente.';
      },
    });
  }

  // Clicar de novo no mesmo tipo que já era "minhaReacao" remove a reação (toggle, decisão
  // explícita do usuário); clicar em outro tipo troca. O backend já resolve esse
  // comportamento (MensagemReacaoService.reagir) -- aqui só aplica o resultado devolvido.
  reagir(msg: MensagemDTO, tipo: TipoReacao): void {
    if (this.reagindoId === msg.id) {
      return;
    }
    this.reagindoId = msg.id;

    this.mensagemApi.reagir(msg.id, tipo).subscribe({
      next: (resposta) => {
        msg.reacoes = resposta.reacoes;
        msg.minhaReacao = resposta.minhaReacao;
        this.reagindoId = null;
        this.manifestarAbertoId = null;
        if (this.detalheReacaoAberto?.mensagemId === msg.id) {
          this.detalheReacaoAberto = null;
        }
      },
      error: () => {
        this.reagindoId = null;
        this.mostrarToast('Não foi possível registrar sua reação. Tente novamente.');
      },
    });
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
    if (this.manifestarFotoAberto || this.detalheReacaoFotoAberto !== null) {
      this.manifestarFotoAberto = false;
      this.detalheReacaoFotoAberto = null;
      return;
    }
    if (this.fotoAmpliada !== null) {
      this.fecharFotoAmpliada();
      return;
    }
    if (this.manifestarAbertoId !== null || this.detalheReacaoAberto !== null) {
      this.manifestarAbertoId = null;
      this.detalheReacaoAberto = null;
      return;
    }
    if (this.manifestarExperienciaAbertoId !== null || this.detalheReacaoExperienciaAberto !== null) {
      this.manifestarExperienciaAbertoId = null;
      this.detalheReacaoExperienciaAberto = null;
      return;
    }
    if (this.modalMensagemAberto) {
      this.fecharModalMensagem();
    }
    if (this.modalLerMensagensAberto) {
      this.fecharModalLerMensagens();
    }
    if (this.modalEmailAberto) {
      this.fecharModalEmail();
    }
    if (this.modalEscreverExperienciaAberto) {
      this.fecharModalEscreverExperiencia();
    }
    if (this.modalLerExperienciasAberto) {
      this.fecharModalLerExperiencias();
    }
    if (this.modalVerFotosAberto) {
      this.fecharModalVerFotos();
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
