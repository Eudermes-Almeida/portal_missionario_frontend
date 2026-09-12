import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// Mesmos campos do FotoMissionarioDTO do backend. "caminhoStorage" nunca sai pela API (detalhe
// interno do bucket do Supabase) -- o front so precisa da "url" publica pra exibir a foto.
export interface FotoDTO {
  id: number;
  missionarioId: number;
  url: string;
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
}
