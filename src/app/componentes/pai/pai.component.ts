import { Component } from '@angular/core';
import { CarrosselMissionariosComponent } from '../carrossel-missionarios/carrossel-missionarios.component';

// Componente "pai" da aplicacao -- por enquanto so hospeda o carrossel de missionarios
// (Portal Missionario), mas e o lugar natural pra entrar futuramente uma navegacao entre
// os outros blocos do diagrama (Mini-Podcast, Rede Social, Gamificacao, Valor Pratico),
// mesmo papel que pai.component tem no projeto irmao RAIO_X_UNIDADE.
@Component({
  selector: 'app-pai',
  standalone: true,
  imports: [CarrosselMissionariosComponent],
  templateUrl: './pai.component.html',
  styleUrl: './pai.component.css',
})
export class PaiComponent {}
