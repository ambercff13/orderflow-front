import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, registerLocaleData } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import localePtBr from '@angular/common/locales/pt';
import { environment } from '../../../environments/environment';

registerLocaleData(localePtBr, 'pt-BR');

const API_URL = `${environment.apiUrl}/api/orders`;
const API_ORIGIN = environment.apiUrl;

type OrderStatus = 'PENDING' | 'ORDERED' | 'COMPLETED';

interface ProductDTO {
  id: string;
  name: string;
  code: string;
  price: number;
  quantity: number;
  imageUrl: string | null;
}

interface OrderItemDTO {
  product: ProductDTO;
  quantity: number;
  price: number;
}

interface OrderDTO {
  id: string;
  number: number;
  userName: string;
  orderItems: OrderItemDTO[];
  orderStatus: OrderStatus;
  createdAt: string;
}

@Component({
  selector: 'app-order-history',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './history.html',
  styleUrl: './history.css',
})
export class HistoryComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly cdr = inject(ChangeDetectorRef);

  orders: OrderDTO[] = [];
  isLoading = true;
  errorMessage = '';

  readonly statusMap: Record<OrderStatus, { label: string; classes: string }> = {
    PENDING: { label: 'Pendente', classes: 'bg-amber-50 text-amber-700' },
    ORDERED: { label: 'Em separação', classes: 'bg-blue-50 text-blue-700' },
    COMPLETED: { label: 'Concluído', classes: 'bg-emerald-50 text-emerald-700' },
  };

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.http.get<OrderDTO[]>(API_URL, { headers: this.authHeaders() }).subscribe({
      next: (data) => {
        this.orders = data.map((order) => this.normalizeOrder(order));
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error: HttpErrorResponse) => {
        console.error('Erro ao carregar histórico:', error);
        this.isLoading = false;
        this.errorMessage =
          error.status === 0
            ? 'Não foi possível conectar ao servidor.'
            : `Não foi possível carregar o histórico (HTTP ${error.status}).`;
        this.cdr.detectChanges();
      },
    });
  }

  private normalizeOrder(order: OrderDTO): OrderDTO {
    return {
      ...order,
      orderItems: order.orderItems.map((item) => ({
        ...item,
        quantity: Number(item.quantity),
        price: Number(item.price),
        product: {
          ...item.product,
          imageUrl: item.product?.imageUrl ? `${API_ORIGIN}${item.product.imageUrl}` : null,
        },
      })),
    };
  }

  itemsCount(order: OrderDTO): number {
    return order.orderItems.reduce((sum, item) => sum + item.quantity, 0);
  }

  orderTotal(order: OrderDTO): number {
    return order.orderItems.reduce((sum, item) => sum + item.quantity * item.price, 0);
  }

  private authHeaders(): Record<string, string> {
    return { Authorization: `Bearer ${localStorage.getItem('access_token') ?? ''}` };
  }
}
