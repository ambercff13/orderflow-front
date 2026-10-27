import { CommonModule, registerLocaleData } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, ChangeDetectorRef, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import localePtBr from '@angular/common/locales/pt';
import { Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { environment } from '../../../../environments/environment';

registerLocaleData(localePtBr, 'pt-BR');

const API_ORIGIN = environment.apiUrl;

interface Product {
  id: string;
  name: string;
  code: string;
  price: number;
  quantity: number;
  imageUrl: string | null;
}

interface ProductsResponse {
  content: Product[];
  number: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

interface ProductView {
  id: string;
  name: string;
  code: string;
  price: number;
  stock: number;
  selectedQuantity: number;
  imageUrl: string | null;
}

@Component({
  imports: [CommonModule],
  selector: 'app-product-list',
  styleUrl: './product-list.css',
  templateUrl: './product-list.html',
})
export class ProductList implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  products: ProductView[] = [];
  isLoading = true;
  errorMessage = '';
  currentPage = 0;
  totalPages = 0;
  isFirstPage = true;
  isLastPage = true;

  searchInput = '';
  searchTerm = '';

  private readonly search$ = new Subject<string>();

  ngOnInit(): void {
    this.search$
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((term) => this.runSearch(term));

    this.loadProducts(0);
  }

  onSearchInput(event: Event): void {
    this.searchInput = (event.target as HTMLInputElement).value;
    this.search$.next(this.searchInput.trim());
  }

  submitSearch(event: Event): void {
    event.preventDefault();
    this.runSearch(this.searchInput.trim());
  }

  clearSearch(): void {
    this.searchInput = '';
    this.runSearch('');
  }

  private runSearch(term: string): void {
    if (term === this.searchTerm && this.currentPage === 0 && !this.isLoading) {
      return;
    }
    this.searchTerm = term;
    this.loadProducts(0);
  }

  loadProducts(page: number = 0): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    const size = 10;
    const params: Record<string, string | number> = { page, size };
    if (this.searchTerm) {
      params['name'] = this.searchTerm;
      params['code'] = this.searchTerm;
    }

    this.http.get<ProductsResponse>(`${environment.apiUrl}/api/products`, { params }).subscribe({
      next: (response) => {
        try {
          this.products = response.content.map((p) => ({
            id: p.id,
            name: p.name,
            code: p.code,
            price: Number(p.price),
            stock: Number(p.quantity) || 0,
            selectedQuantity: 1,
            imageUrl: p.imageUrl ? `${API_ORIGIN}${p.imageUrl}` : null,
          }));
          this.currentPage = response.number;
          this.totalPages = response.totalPages;
          this.isFirstPage = response.first;
          this.isLastPage = response.last;
        } catch (e) {
          console.error('[produtos] erro ao processar resposta:', e);
        } finally {
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      },
      error: (error: HttpErrorResponse) => {
        console.error('[produtos] erro HTTP:', error);
        this.isLoading = false;
        this.errorMessage =
          error.status === 0
            ? 'Não foi possível conectar ao servidor. Verifique se a API está disponível.'
            : `Não foi possível carregar os produtos (HTTP ${error.status}). Tente novamente.`;
        this.cdr.detectChanges();
      },
    });
  }

  changePage(page: number): void {
    if (page >= 0 && page < this.totalPages && !this.isLoading) {
      this.loadProducts(page);
    }
  }

  increment(product: ProductView): void {
    if (product.selectedQuantity < product.stock) {
      product.selectedQuantity++;
    }
  }

  decrement(product: ProductView): void {
    if (product.selectedQuantity > 1) {
      product.selectedQuantity--;
    }
  }

  addToCart(product: ProductView): void {
    const currentCart: any[] = JSON.parse(localStorage.getItem('cart') || '[]');

    const existing = currentCart.find((item) => item.id === product.id);
    if (existing) {
      existing.quantity = Math.min(existing.quantity + product.selectedQuantity, product.stock);
    } else {
      currentCart.push({
        id: product.id,
        name: product.name,
        code: product.code,
        price: product.price,
        quantity: product.selectedQuantity,
      });
    }

    localStorage.setItem('cart', JSON.stringify(currentCart));
    void this.router.navigate(['/cart']);
  }
}
