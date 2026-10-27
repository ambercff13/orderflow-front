import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { NavbarComponent } from './shared/navbar/navbar';
import { filter } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NavbarComponent],
  templateUrl: './app.html',
})
export class App {
  public router = inject(Router);
  showNavbar = false;

  constructor() {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.updateNavbarVisibility(event.url);
      });

    this.updateNavbarVisibility(this.router.url);
  }

  private updateNavbarVisibility(url: string): void {
    const isLogin = url.includes('login') || url === '/' || url === '' || url.includes('register');
    this.showNavbar = !isLogin;
  }
}
