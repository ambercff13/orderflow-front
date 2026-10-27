import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.html',
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  email = '';
  password = '';
  errorMessage = '';
  isLoading = false;

  onSubmit(form: NgForm): void {
    if (form.invalid) {
      form.control.markAllAsTouched();
      this.errorMessage = 'Revise os campos e informe um e-mail válido e uma senha.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.login({ email: this.email, password: this.password }).subscribe({
      next: (response: any) => {
        this.isLoading = false;

        const userRole = response?.user?.role;

        const targetRoute = userRole === 'MANAGER' ? '/kanban' : '/products';

        void this.router
          .navigateByUrl(targetRoute)
          .then((navigated) => {
            if (!navigated) {
              this.errorMessage =
                'Login realizado, mas não foi possível abrir a página de destino.';
            }
          })
          .catch((error: unknown) => {
            this.errorMessage =
              error instanceof Error
                ? `Login realizado, mas ocorreu um erro ao abrir a página: ${error.message}`
                : 'Login realizado, mas ocorreu um erro ao abrir a página de destino.';
          });
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || err.message || 'E-mail ou senha inválidos.';
      },
    });
  }
}
