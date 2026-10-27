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

interface KanbanColumn {
  status: OrderStatus;
  label: string;
  dotClass: string;
  badgeClass: string;
  emptyText: string;
}

@Component({
  selector: 'app-kanban',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './kanban.html',
  styleUrl: './kanban.css',
})
export class KanbanComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly columns: KanbanColumn[] = [
    {
      status: 'PENDING',
      label: 'Pendente',
      dotClass: 'bg-amber-500',
      badgeClass: 'bg-amber-50 text-amber-700',
      emptyText: 'Nenhum pedido pendente.',
    },
    {
      status: 'ORDERED',
      label: 'Em Separação',
      dotClass: 'bg-blue-500',
      badgeClass: 'bg-blue-50 text-blue-700',
      emptyText: 'Nenhum pedido em separação.',
    },
    {
      status: 'COMPLETED',
      label: 'Concluído',
      dotClass: 'bg-emerald-500',
      badgeClass: 'bg-emerald-50 text-emerald-700',
      emptyText: 'Nenhum pedido concluído.',
    },
  ];

  orders: OrderDTO[] = [];
  isLoading = true;
  errorMessage = '';
  actionError = '';

  draggedOrder: OrderDTO | null = null;
  dragOverStatus: OrderStatus | null = null;

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
      error: (err: HttpErrorResponse) => {
        console.error('Erro ao carregar pedidos:', err);
        this.isLoading = false;
        this.errorMessage = 'Não foi possível carregar o painel de pedidos.';
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
          price: Number(item.product?.price),
          imageUrl: item.product?.imageUrl ? `${API_ORIGIN}${item.product.imageUrl}` : null,
        },
      })),
    };
  }

  ordersByStatus(status: OrderStatus): OrderDTO[] {
    return this.orders.filter((o) => o.orderStatus === status);
  }

  itemsCount(order: OrderDTO): number {
    return order.orderItems.reduce((sum, item) => sum + item.quantity, 0);
  }

  orderTotal(order: OrderDTO): number {
    return order.orderItems.reduce((sum, item) => sum + item.quantity * item.price, 0);
  }

  onDragStart(event: DragEvent, order: OrderDTO): void {
    this.draggedOrder = order;
    event.dataTransfer?.setData('text/plain', order.id);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  onDragEnd(): void {
    this.draggedOrder = null;
    this.dragOverStatus = null;
  }

  onDragOver(event: DragEvent, status: OrderStatus): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    this.dragOverStatus = status;
  }

  onDrop(event: DragEvent, status: OrderStatus): void {
    event.preventDefault();
    const order = this.draggedOrder;
    this.draggedOrder = null;
    this.dragOverStatus = null;

    if (!order || order.orderStatus === status) {
      return;
    }
    this.updateStatus(order, status);
  }

  private updateStatus(order: OrderDTO, newStatus: OrderStatus): void {
    const previousStatus = order.orderStatus;
    this.actionError = '';

    order.orderStatus = newStatus;

    this.http
      .patch<OrderDTO>(
        API_URL,
        { ...order, orderStatus: newStatus },
        { headers: this.authHeaders() },
      )
      .subscribe({
        next: (updated) => {
          const index = this.orders.findIndex((o) => o.id === updated.id);
          if (index >= 0) {
            this.orders[index] = { ...this.orders[index], orderStatus: updated.orderStatus };
          }
          this.cdr.detectChanges();
        },
        error: (err: HttpErrorResponse) => {
          console.error('Erro ao atualizar status:', err);
          order.orderStatus = previousStatus;
          this.actionError = 'Não foi possível atualizar o status do pedido. Tente novamente.';
          this.cdr.detectChanges();
        },
      });
  }

  dismissActionError(): void {
    this.actionError = '';
  }

  changeOrderStatus(order: OrderDTO, event: Event): void {
    if (!(event.target instanceof HTMLSelectElement)) {
      return;
    }

    const value = event.target.value;
    const status = this.columns.find((column) => column.status === value)?.status;

    if (status && status !== order.orderStatus) {
      this.updateStatus(order, status);
    }
  }

  private authHeaders(): Record<string, string> {
    return { Authorization: `Bearer ${localStorage.getItem('accessToken')}` };
  }
}
