import { Component } from '@angular/core';
import { PaiComponent } from './componentes/pai/pai.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [PaiComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'portal-missionario-frontend';
}
