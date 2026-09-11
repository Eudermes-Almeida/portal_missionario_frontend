import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CarrosselMissionariosComponent } from '../carrossel-missionarios/carrossel-missionarios.component';
import { AuthService } from '../../services/auth.service';

// Componente "pai" da aplicacao -- por enquanto so hospeda o carrossel de missionarios
// (Portal Missionario), mas e o lugar natural pra entrar futuramente uma navegacao entre
// os outros blocos do diagrama (Mini-Podcast, Rede Social, Gamificacao, Valor Pratico),
// mesmo papel que pai.component tem no projeto irmao RAIO_X_UNIDADE. Tambem e quem hospeda
// a identidade/logout do usuario logado (barra fina acima do hero do carrossel).
@Component({
  selector: 'app-pai',
  standalone: true,
  imports: [CommonModule, CarrosselMissionariosComponent],
  templateUrl: './pai.component.html',
  styleUrl: './pai.component.css',
})
export class PaiComponent {
  @Output() sair = new EventEmitter<void>();

  constructor(private authService: AuthService) {}

  get nomeLogado(): string {
    return this.authService.getNome();
  }
}
