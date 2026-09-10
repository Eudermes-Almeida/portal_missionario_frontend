import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// Mesmos campos do DadosMissionariosDTO do backend (id_planilha e registromembro nunca
// saem pela API, ver DadosMissionariosDTO.java).
export interface DadosMissionarioDTO {
  id: number;
  unidade: string;
  nomecompleto: string;
  nomemissao: string;
  sexo: string;
  idade: string;
  status: string;
  iniciomissao: string;
  finalmissao: string;
  missao: string;
  aniversario: string;
  linkfoto: string;
}

@Injectable({ providedIn: 'root' })
export class MissionarioApiService {

  private readonly baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // "Estaca Betim" traz todos os missionarios (soma de todas as alas/ramos), mesma
  // convencao do backend/projeto irmao.
  buscaDadosMissionarios(unidade: string = 'Estaca Betim'): Observable<DadosMissionarioDTO[]> {
    const params = new HttpParams().set('unidade', unidade);
    return this.http.get<DadosMissionarioDTO[]>(`${this.baseUrl}/dadosmissionarios`, { params });
  }
}
