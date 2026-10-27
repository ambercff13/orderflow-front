import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class NavbarComponent implements OnInit, OnDestroy {
  private readonly auth = inject(AuthService);

  cartItemCount = 0;
  menuOpen = false;

  private readonly onStorage = () => this.updateCartCount();

  ngOnInit(): void {
    this.updateCartCount();
    window.addEventListener('storage', this.onStorage);
  }

  ngOnDestroy(): void {
    window.removeEventListener('storage', this.onStorage);
  }

  get isManager(): boolean {
    return this.auth.isManager();
  }

  updateCartCount(): void {
    const rawCart = localStorage.getItem('cart');
    try {
      const items: { quantity?: number }[] = rawCart ? JSON.parse(rawCart) : [];
      this.cartItemCount = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
    } catch {
      this.cartItemCount = 0;
    }
  }

  logout(): void {
    this.auth.logout();
  }
}
