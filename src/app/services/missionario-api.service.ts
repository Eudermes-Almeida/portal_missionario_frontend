import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// Mesmos campos do DadosMissionariosDTO do backend (id_planilha e registromembro nunca
// saem pela API, ver DadosMissionariosDTO.java). O email em si também não sai -- só
// "temEmail" (booleano), pra saber se o botão "Enviar Email" pode ser oferecido sem o front
// nunca receber o endereço de verdade do missionário. "podeEscreverExperiencia" segue o
// mesmo padrão: o backend já resolve (comparando registromembro do token com o do
// missionário) se o membro logado é o próprio dono deste perfil -- o front só usa o
// resultado pra habilitar/desabilitar o botão "Escrever Experiência Missionário".
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
  temEmail: boolean;
  podeEscreverExperiencia: boolean;
  podeSubirFoto: boolean;
}

export interface EnviarEmailRequest {
  mensagem: string;
  emailRemetente?: string;
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

  enviarEmail(missionarioId: number, request: EnviarEmailRequest): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/dadosmissionarios/${missionarioId}/email`, request);
  }
}
