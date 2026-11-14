import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from 'shared-auth';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin.component.html',
})
export class AdminComponent {
  readonly authService = inject(AuthService, { optional: true });
  private readonly router = inject(Router);

  logout(): void {
    if (!this.authService) {
      void this.router.navigate(['/']);
      return;
    }

    this.authService.logout().subscribe({
      next: () => void this.router.navigate(['/']),
      error: () => void this.router.navigate(['/']),
    });
  }
}
