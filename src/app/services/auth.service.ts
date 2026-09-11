import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface LoginResponse {
  token: string;
  nome: string;
  unidade: string;
  escopo: string;
}

export interface IdentificacaoResponse {
  id: number;
  nome: string;
}

const CHAVE_SESSAO = 'portalmissionario_sessao';

// Sessão simples (token opaco em header X-Auth-Token), não JWT -- mesmo desenho já validado
// em produção no projeto irmão RAIO_X_UNIDADE (ver memória project-raiox-auth-design).
// Guardada em localStorage (sobrevive a fechar o navegador, já que a sessão no backend não
// expira automaticamente até os 60min fixos definidos no SessaoService).
@Injectable({ providedIn: 'root' })
export class AuthService {
  private sessao: LoginResponse | null = null;

  // Emitido pelo authInterceptor quando uma chamada autenticada volta 401 (sessão expirada
  // no backend). AppComponent escuta isso pra voltar pra tela de login com uma mensagem, em
  // vez de deixar o carrossel simplesmente falhar sem explicação.
  private sessaoExpiradaSubject = new Subject<void>();
  sessaoExpirada$ = this.sessaoExpiradaSubject.asObservable();

  constructor(private http: HttpClient) {
    this.carregarSessaoSalva();
  }

  estaAutenticado(): boolean {
    return !!this.sessao?.token;
  }

  getToken(): string | null {
    return this.sessao?.token ?? null;
  }

  getNome(): string {
    return this.sessao?.nome ?? '';
  }

  getUnidade(): string {
    return this.sessao?.unidade ?? '';
  }

  getEscopo(): string {
    return this.sessao?.escopo ?? '';
  }

  login(login: string, senha: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/login`, { login, senha })
      .pipe(tap(resposta => this.salvarSessao(resposta)));
  }

  logout(): void {
    const token = this.getToken();
    this.limparSessaoLocal();
    if (token) {
      this.http.post(`${environment.apiUrl}/auth/logout`, {}, { headers: { 'X-Auth-Token': token } }).subscribe();
    }
  }

  // Chamado só pelo authInterceptor quando o backend rejeita um token que a gente achava
  // válido -- diferente do logout normal, não faz sentido chamar POST /auth/logout aqui (o
  // próprio motivo de estar aqui é o backend já ter descartado essa sessão sozinho).
  marcarSessaoExpirada(): void {
    this.limparSessaoLocal();
    this.sessaoExpiradaSubject.next();
  }

  private limparSessaoLocal(): void {
    this.sessao = null;
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(CHAVE_SESSAO);
    }
  }

  identificar(nascimento: string, ultimosQuatroRegistro: string): Observable<IdentificacaoResponse> {
    return this.http.post<IdentificacaoResponse>(`${environment.apiUrl}/matriz-acesso/identificar`, {
      nascimento,
      ultimosQuatroRegistro,
    });
  }

  cadastrarCredenciais(id: number, login: string, senha: string): Observable<void> {
    return this.http.post<void>(`${environment.apiUrl}/matriz-acesso/cadastrar-credenciais`, { id, login, senha });
  }

  private carregarSessaoSalva(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }
    const bruto = localStorage.getItem(CHAVE_SESSAO);
    if (!bruto) {
      return;
    }
    try {
      this.sessao = JSON.parse(bruto);
    } catch {
      this.sessao = null;
    }
  }

  private salvarSessao(resposta: LoginResponse): void {
    this.sessao = resposta;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(CHAVE_SESSAO, JSON.stringify(resposta));
    }
  }
}
