import { Component, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.html',
})
export class RegisterComponent {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  name = '';
  email = '';
  password = '';
  isSaving = false;
  errorMessage = '';

  onSubmit(form: NgForm): void {
    if (form.invalid || this.isSaving) {
      form.control.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';

    this.http
      .post(`${environment.apiUrl}/api/auth/register`, {
        name: this.name.trim(),
        email: this.email.trim().toLowerCase(),
        password: this.password,
      })
      .subscribe({
        next: () => {
          this.isSaving = false;
          void this.router.navigate(['/login'], { queryParams: { registered: true } });
        },
        error: (error: HttpErrorResponse) => {
          this.isSaving = false;
          this.errorMessage =
            error.status === 409
              ? 'Este e-mail já está cadastrado.'
              : (error.error?.message ?? 'Não foi possível criar a conta. Tente novamente.');
          this.cdr.detectChanges();
        },
      });
  }
}
