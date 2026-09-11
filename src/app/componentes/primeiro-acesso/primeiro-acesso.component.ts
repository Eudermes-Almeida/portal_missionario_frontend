import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

type Etapa = 'identificacao' | 'confirmacao' | 'cadastro';

@Component({
  selector: 'app-primeiro-acesso',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './primeiro-acesso.component.html',
  styleUrl: './primeiro-acesso.component.css',
})
export class PrimeiroAcessoComponent {
  @Output() autenticado = new EventEmitter<void>();
  @Output() voltarParaLogin = new EventEmitter<void>();

  etapa: Etapa = 'identificacao';
  carregando = false;
  erro = '';

  // Etapa 1: identificação
  nascimento = ''; // ddmmaaaa, só dígitos
  ultimosQuatroRegistro = '';

  // Preenchidos após identificação bem-sucedida
  membroId: number | null = null;
  membroNome = '';

  // Etapa 3: cadastro
  login = '';
  senha = '';
  confirmarSenha = '';

  constructor(private authService: AuthService) {}

  identificar(): void {
    this.erro = '';

    const nascimentoISO = this.converterParaISO(this.nascimento);
    const ultimos4 = this.ultimosQuatroRegistro.trim();

    if (!nascimentoISO) {
      this.erro = 'Informe a data de nascimento no formato DDMMAAAA.';
      return;
    }
    if (ultimos4.length !== 4) {
      this.erro = 'Informe os últimos 4 caracteres do seu registro de membro.';
      return;
    }

    this.carregando = true;
    this.authService.identificar(nascimentoISO, ultimos4).subscribe({
      next: (resposta) => {
        this.carregando = false;
        this.membroId = resposta.id;
        this.membroNome = resposta.nome;
        this.etapa = 'confirmacao';
      },
      error: () => {
        this.carregando = false;
        this.erro = 'Usuário não encontrado. Procure a Presidência da Estaca.';
      },
    });
  }

  confirmarIdentidade(): void {
    this.erro = '';
    this.etapa = 'cadastro';
  }

  negarIdentidade(): void {
    this.erro = '';
    this.membroId = null;
    this.membroNome = '';
    this.nascimento = '';
    this.ultimosQuatroRegistro = '';
    this.etapa = 'identificacao';
  }

  cadastrar(): void {
    this.erro = '';

    if (!this.login.trim()) {
      this.erro = 'Escolha um login.';
      return;
    }
    if (!this.senha || this.senha.length < 4) {
      this.erro = 'A senha precisa ter pelo menos 4 caracteres.';
      return;
    }
    if (this.senha !== this.confirmarSenha) {
      this.erro = 'As senhas não são iguais.';
      return;
    }
    if (this.membroId === null) {
      this.erro = 'Usuário não encontrado. Procure a Presidência da Estaca.';
      return;
    }

    this.carregando = true;
    const loginEscolhido = this.login.trim();
    const senhaEscolhida = this.senha;

    this.authService.cadastrarCredenciais(this.membroId, loginEscolhido, senhaEscolhida).subscribe({
      next: () => this.entrarAutomaticamente(loginEscolhido, senhaEscolhida),
      error: (err) => {
        this.carregando = false;
        this.erro = err?.status === 409
          ? (err?.error ?? 'Este login já está em uso, escolha outro.')
          : 'Não foi possível concluir o cadastro. Tente novamente.';
      },
    });
  }

  private entrarAutomaticamente(login: string, senha: string): void {
    this.authService.login(login, senha).subscribe({
      next: () => {
        this.carregando = false;
        this.autenticado.emit();
      },
      error: () => {
        this.carregando = false;
        // Cadastro salvou certo, mas o login automático falhou por algum motivo raro --
        // manda para a tela de login normal em vez de travar aqui.
        this.voltarParaLogin.emit();
      },
    });
  }

  private converterParaISO(ddmmaaaa: string): string | null {
    const valor = ddmmaaaa.trim();
    if (!/^\d{8}$/.test(valor)) {
      return null;
    }
    const dia = valor.substring(0, 2);
    const mes = valor.substring(2, 4);
    const ano = valor.substring(4, 8);
    if (Number(dia) < 1 || Number(dia) > 31 || Number(mes) < 1 || Number(mes) > 12) {
      return null;
    }
    return `${ano}-${mes}-${dia}`;
  }
}
