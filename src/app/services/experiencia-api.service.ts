import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AutorReacao, ReacaoResposta, ReacaoResumo, TipoReacao } from './mensagem-api.service';

// Mesmos campos do ExperienciaDTO do backend. Sem remetente/destinatario (diferente de
// MensagemDTO) -- o autor de uma experiência é sempre o próprio missionário dono do perfil
// (ver ExperienciaEntity/ExperienciaService), então basta missionarioId.
export interface ExperienciaDTO {
  id: number;
  missionarioId: number;
  experiencia: string;
  dia: string;
  hora: string;
  reacoes: ReacaoResumo[];
  minhaReacao: TipoReacao | null;
}

export interface EscreverExperienciaRequest {
  experiencia: string;
}

@Injectable({ providedIn: 'root' })
export class ExperienciaApiService {

  private readonly baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  escreverExperiencia(missionarioId: number, request: EscreverExperienciaRequest): Observable<ExperienciaDTO> {
    return this.http.post<ExperienciaDTO>(`${this.baseUrl}/experiencias/missionario/${missionarioId}`, request);
  }

  buscaExperienciasPorMissionario(missionarioId: number): Observable<ExperienciaDTO[]> {
    return this.http.get<ExperienciaDTO[]>(`${this.baseUrl}/experiencias/missionario/${missionarioId}`);
  }

  reagir(experienciaId: number, tipoReacao: TipoReacao): Observable<ReacaoResposta> {
    return this.http.post<ReacaoResposta>(`${this.baseUrl}/experiencias/${experienciaId}/reacao`, { tipoReacao });
  }

  listaAutoresReacao(experienciaId: number, tipoReacao: TipoReacao): Observable<AutorReacao[]> {
    return this.http.get<AutorReacao[]>(`${this.baseUrl}/experiencias/${experienciaId}/reacao/${tipoReacao}`);
  }
}
