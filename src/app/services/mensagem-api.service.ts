import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// Mesmos campos do MensagemDTO do backend. remetenteId/remetenteNome/remetenteUnidade vêm
// preenchidos pelo backend (resolvidos a partir do token da sessão), nunca são enviados pelo
// front -- ver EnviarMensagemRequestDTO.java.
export type TipoReacao = 'CURTIDA' | 'DESLIKE' | 'CORACAO' | 'SURPRESA' | 'TRISTEZA';

export interface ReacaoResumo {
  tipoReacao: TipoReacao;
  quantidade: number;
}

export interface MensagemDTO {
  id: number;
  mensagemPaiId: number | null;
  remetenteTipo: string;
  remetenteId: number;
  remetenteNome: string;
  remetenteUnidade: string;
  destinatarioTipo: string;
  destinatarioId: number;
  destinatarioNome: string;
  destinatarioUnidade: string;
  mensagem: string;
  dia: string;
  hora: string;
  lida: boolean;
  reacoes: ReacaoResumo[];
  minhaReacao: TipoReacao | null;
}

export interface EnviarMensagemRequest {
  destinatarioTipo: 'MEMBRO' | 'MISSIONARIO';
  destinatarioId: number;
  mensagem: string;
  mensagemPaiId?: number | null;
}

// Resposta do POST de reação: não é um MensagemDTO inteiro, só o que muda a cada clique no
// seletor de ícones (ver MensagemResource.ReacaoRespostaDTO no backend).
export interface ReacaoResposta {
  reacoes: ReacaoResumo[];
  minhaReacao: TipoReacao | null;
}

// Um item da lista "quem reagiu com este ícone" (popover aberto ao clicar num pill de
// reação). autorNome/autorUnidade resolvidos ao vivo pelo backend, não congelados (ver
// ReacaoAutorDTO.java).
export interface AutorReacao {
  autorTipo: string;
  autorNome: string;
  autorUnidade: string | null;
  reagidoEm: string;
}

@Injectable({ providedIn: 'root' })
export class MensagemApiService {

  private readonly baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  enviarMensagem(request: EnviarMensagemRequest): Observable<MensagemDTO> {
    return this.http.post<MensagemDTO>(`${this.baseUrl}/mensagens`, request);
  }

  buscaMensagensPorMissionario(missionarioId: number): Observable<MensagemDTO[]> {
    return this.http.get<MensagemDTO[]>(`${this.baseUrl}/mensagens/missionario/${missionarioId}`);
  }

  reagir(mensagemId: number, tipoReacao: TipoReacao): Observable<ReacaoResposta> {
    return this.http.post<ReacaoResposta>(`${this.baseUrl}/mensagens/${mensagemId}/reacao`, { tipoReacao });
  }

  listaAutoresReacao(mensagemId: number, tipoReacao: TipoReacao): Observable<AutorReacao[]> {
    return this.http.get<AutorReacao[]>(`${this.baseUrl}/mensagens/${mensagemId}/reacao/${tipoReacao}`);
  }
}
