import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login-senha',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login-senha.component.html',
  styleUrl: './login-senha.component.css',
})
export class LoginSenhaComponent implements OnInit {
  // Preenchido pelo AppComponent só quando a tela de login foi aberta por causa de uma
  // sessão expirada (ver AuthService.sessaoExpirada$) -- em qualquer outro caso vem vazio.
  @Input() mensagemInicial = '';

  @Output() autenticado = new EventEmitter<void>();
  @Output() irParaPrimeiroAcesso = new EventEmitter<void>();

  login = '';
  senha = '';
  carregando = false;
  erro = '';

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.erro = this.mensagemInicial;
  }

  entrar(): void {
    this.erro = '';

    if (!this.login.trim() || !this.senha) {
      this.erro = 'Informe login e senha.';
      return;
    }

    this.carregando = true;
    this.authService.login(this.login.trim(), this.senha).subscribe({
      next: () => {
        this.carregando = false;
        this.autenticado.emit();
      },
      error: (err) => {
        this.carregando = false;
        this.erro = err?.status === 401
          ? 'Login ou senha inválidos.'
          : 'Não foi possível entrar. Tente novamente.';
      },
    });
  }
}
