import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

export interface CartItem {
  id: number | string;
  name: string;
  code: string;
  price: number;
  quantity: number;
}

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './cart.html',
  styleUrl: './cart.css',
})
export class CartComponent implements OnInit {
  private router = inject(Router);
  cartItems: CartItem[] = [];
  private readonly http = inject(HttpClient);
  isSubmitting = false;

  ngOnInit(): void {
    this.loadCart();
  }

  loadCart(): void {
    const rawCart = localStorage.getItem('cart');
    if (rawCart) {
      const items = JSON.parse(rawCart);

      const groupedMap = new Map<string | number, CartItem>();

      for (const item of items) {
        if (groupedMap.has(item.id)) {
          const existing = groupedMap.get(item.id)!;
          existing.quantity += item.quantity || 1;
        } else {
          groupedMap.set(item.id, {
            ...item,
            quantity: item.quantity || 1,
          });
        }
      }

      this.cartItems = Array.from(groupedMap.values());
      this.saveCart();
    }
  }

  saveCart(): void {
    localStorage.setItem('cart', JSON.stringify(this.cartItems));
  }

  increaseQuantity(item: CartItem): void {
    item.quantity++;
    this.saveCart();
  }

  decreaseQuantity(item: CartItem): void {
    if (item.quantity > 1) {
      item.quantity--;
    } else {
      this.removeItem(item.id);
    }
    this.saveCart();
  }

  removeItem(id: number | string): void {
    this.cartItems = this.cartItems.filter((i) => i.id !== id);
    this.saveCart();
  }

  get totalValue(): number {
    return this.cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  }

  checkout(): void {
    if (this.isSubmitting || this.cartItems.length === 0) {
      return;
    }

    const payload = {
      items: this.cartItems.map((item) => ({
        productId: item.id,
        quantity: item.quantity,
      })),
    };

    const token = localStorage.getItem('accessToken');
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    this.isSubmitting = true;

    this.http.post(`${environment.apiUrl}/api/orders`, payload, { headers }).subscribe({
      next: () => {
        this.isSubmitting = false;
        localStorage.removeItem('cart');
        this.cartItems = [];

        window.dispatchEvent(new Event('storage'));

        alert('Pedido realizado com sucesso!');
        void this.router.navigate(['/history']);
      },
      error: (error: HttpErrorResponse) => {
        this.isSubmitting = false;
        alert(error.error?.message ?? 'Não foi possível finalizar o pedido. Tente novamente.');
      },
    });
  }
}
