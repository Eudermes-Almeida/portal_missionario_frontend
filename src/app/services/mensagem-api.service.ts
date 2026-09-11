import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// Mesmos campos do MensagemDTO do backend. remetenteId/remetenteNome/remetenteUnidade vêm
// preenchidos pelo backend (resolvidos a partir do token da sessão), nunca são enviados pelo
// front -- ver EnviarMensagemRequestDTO.java.
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
}

export interface EnviarMensagemRequest {
  destinatarioTipo: 'MEMBRO' | 'MISSIONARIO';
  destinatarioId: number;
  mensagem: string;
  mensagemPaiId?: number | null;
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
}
