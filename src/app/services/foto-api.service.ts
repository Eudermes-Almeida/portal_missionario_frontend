import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AutorReacao, ReacaoResposta, ReacaoResumo, TipoReacao } from './mensagem-api.service';

// Mesmos campos do FotoMissionarioDTO do backend. "caminhoStorage" nunca sai pela API (detalhe
// interno do bucket do Supabase) -- o front so precisa da "url" publica pra exibir a foto.
// "reacoes"/"minhaReacao" seguem o mesmo padrao de MensagemDTO/ExperienciaDTO.
export interface FotoDTO {
  id: number;
  missionarioId: number;
  url: string;
  dia: string;
  hora: string;
  reacoes: ReacaoResumo[];
  minhaReacao: TipoReacao | null;
  temComentario: boolean;
}

// Mesmos campos do FotoComentarioDTO do backend. autorNome/autorUnidade vem congelados
// (resolvidos no momento do comentario), nao ao vivo -- ver FotoComentarioEntity.java.
export interface FotoComentarioDTO {
  id: number;
  fotoId: number;
  autorTipo: string;
  autorNome: string;
  autorUnidade: string;
  comentario: string;
  dia: string;
  hora: string;
}

@Injectable({ providedIn: 'root' })
export class FotoApiService {

  private readonly baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // O arquivo aqui ja deve chegar comprimido (ver utils/compressao-imagem.ts) -- este service
  // so monta o multipart e manda pro backend, que repassa pro Supabase Storage.
  subirFoto(missionarioId: number, arquivo: Blob): Observable<FotoDTO> {
    const form = new FormData();
    form.append('arquivo', arquivo, 'foto.jpg');
    return this.http.post<FotoDTO>(`${this.baseUrl}/fotos/missionario/${missionarioId}`, form);
  }

  buscaFotosPorMissionario(missionarioId: number): Observable<FotoDTO[]> {
    return this.http.get<FotoDTO[]>(`${this.baseUrl}/fotos/missionario/${missionarioId}`);
  }

  reagir(fotoId: number, tipoReacao: TipoReacao): Observable<ReacaoResposta> {
    return this.http.post<ReacaoResposta>(`${this.baseUrl}/fotos/${fotoId}/reacao`, { tipoReacao });
  }

  listaAutoresReacao(fotoId: number, tipoReacao: TipoReacao): Observable<AutorReacao[]> {
    return this.http.get<AutorReacao[]>(`${this.baseUrl}/fotos/${fotoId}/reacao/${tipoReacao}`);
  }

  escreverComentario(fotoId: number, comentario: string): Observable<FotoComentarioDTO> {
    return this.http.post<FotoComentarioDTO>(`${this.baseUrl}/fotos/${fotoId}/comentario`, { comentario });
  }

  buscaComentariosPorFoto(fotoId: number): Observable<FotoComentarioDTO[]> {
    return this.http.get<FotoComentarioDTO[]>(`${this.baseUrl}/fotos/${fotoId}/comentario`);
  }
}
