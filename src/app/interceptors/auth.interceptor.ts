import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

// Anexa X-Auth-Token em toda chamada quando existe sessão, e detecta quando o backend rejeita
// esse token (401) -- normalmente porque a sessão expirou (ver SessaoService/AutorizacaoFilter).
// Um 401 só é tratado como "sessão expirada" quando ESTA requisição tinha token anexado -- um
// 401 de /auth/login com login/senha errados nunca tem token (usuário ainda não está logado),
// então não deve disparar esse fluxo.
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  const reqComToken = token ? req.clone({ setHeaders: { 'X-Auth-Token': token } }) : req;

  return next(reqComToken).pipe(
    catchError((erro: HttpErrorResponse) => {
      if (token && erro.status === 401) {
        authService.marcarSessaoExpirada();
      }
      return throwError(() => erro);
    })
  );
};
