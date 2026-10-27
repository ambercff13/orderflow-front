import { ChangeDetectorRef, Component, HostListener, OnInit, inject } from '@angular/core';
import { CommonModule, registerLocaleData } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import localePtBr from '@angular/common/locales/pt';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth';
import { environment } from '../../../environments/environment';

registerLocaleData(localePtBr, 'pt-BR');

const API_URL = `${environment.apiUrl}/api/products`;
const API_ORIGIN = environment.apiUrl;
const LOW_STOCK_THRESHOLD = 5;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE = 2 * 1024 * 1024;

interface ProductDTO {
  id: string;
  name: string;
  code: string;
  price: number;
  quantity: number;
  imageUrl: string | null;
}

interface ProductsPage {
  content: ProductDTO[];
}

@Component({
  selector: 'app-stock',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './stock.html',
  styleUrl: './stock.css',
})
export class StockComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  readonly lowStockThreshold = LOW_STOCK_THRESHOLD;

  products: ProductDTO[] = [];
  isLoading = true;
  errorMessage = '';

  isSaving = false;
  formError = '';
  isCreateOpen = false;
  restockProduct: ProductDTO | null = null;

  selectedImage: File | null = null;
  imagePreview: string | null = null;
  imageError = '';

  readonly createForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    code: ['', [Validators.required, Validators.maxLength(50)]],
    price: ['', [Validators.required, Validators.pattern(/^\d+([.,]\d{1,2})?$/)]],
    quantity: [0, [Validators.required, Validators.min(0)]],
  });

  readonly restockForm = this.fb.nonNullable.group({
    amount: [1, [Validators.required, Validators.min(1)]],
  });

  get totalProducts(): number {
    return this.products.length;
  }

  get totalStockValue(): number {
    return this.products.reduce((sum, p) => sum + p.price * p.quantity, 0);
  }

  get lowStockCount(): number {
    return this.products.filter((p) => this.isLowStock(p)).length;
  }

  ngOnInit(): void {
    this.loadProducts();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeCreate();
    this.closeRestock();
  }

  loadProducts(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.http
      .get<ProductsPage>(API_URL, { params: { page: 0, size: 1000 }, headers: this.authHeaders() })
      .subscribe({
        next: (page) => {
          this.products = page.content.map((p) => ({
            ...p,
            imageUrl: p.imageUrl ? `${API_ORIGIN}${p.imageUrl}` : null,
          }));
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: (error: HttpErrorResponse) => {
          console.error('Erro ao carregar estoque:', error);
          this.isLoading = false;
          this.errorMessage = 'Não foi possível carregar o estoque.';
          this.cdr.detectChanges();
        },
      });
  }

  isLowStock(product: ProductDTO): boolean {
    return product.quantity <= LOW_STOCK_THRESHOLD;
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.imageError = '';

    if (!file) {
      this.clearImage();
      return;
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      this.imageError = 'Formato inválido. Use JPG, PNG ou WEBP.';
      this.clearImage(input);
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      this.imageError = 'A imagem deve ter no máximo 2 MB.';
      this.clearImage(input);
      return;
    }

    this.selectedImage = file;
    this.setPreview(file);
  }

  clearImage(input?: HTMLInputElement): void {
    this.selectedImage = null;
    this.imagePreview = null;
    if (input) input.value = '';
    this.cdr.detectChanges();
  }

  private setPreview(file: File): void {
    const reader = new FileReader();
    reader.onload = () => {
      this.imagePreview = reader.result as string;
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);
  }

  openCreate(): void {
    this.formError = '';
    this.createForm.reset();
    this.clearImage();
    this.isCreateOpen = true;
    this.cdr.detectChanges();
  }

  closeCreate(): void {
    if (this.isSaving) return;
    this.isCreateOpen = false;
    this.clearImage();
  }

  submitCreate(): void {
    if (this.createForm.invalid || this.isSaving) {
      this.createForm.markAllAsTouched();
      return;
    }

    const raw = this.createForm.getRawValue();
    const payload = {
      name: raw.name.trim(),
      code: raw.code.trim(),
      price: Number(raw.price.replace(',', '.')),
      quantity: Number(raw.quantity),
    };

    this.isSaving = true;
    this.formError = '';

    this.http.post<ProductDTO>(API_URL, payload, { headers: this.authHeaders() }).subscribe({
      next: (created) => {
        if (!this.selectedImage) {
          this.finishCreate();
          return;
        }
        this.uploadImage(created.id, this.selectedImage, () => this.finishCreate());
      },
      error: (error: HttpErrorResponse) => {
        this.isSaving = false;
        this.formError = error.error?.message ?? 'Não foi possível cadastrar o produto.';
        this.cdr.detectChanges();
      },
    });
  }

  private finishCreate(): void {
    this.isSaving = false;
    this.isCreateOpen = false;
    this.clearImage();
    this.loadProducts();
  }

  openRestock(product: ProductDTO): void {
    this.formError = '';
    this.restockForm.reset({ amount: 1 });
    this.clearImage();
    this.restockProduct = product;
    this.cdr.detectChanges();
  }

  closeRestock(): void {
    if (this.isSaving) return;
    this.restockProduct = null;
    this.clearImage();
    this.cdr.detectChanges();
  }

  submitRestock(): void {
    const product = this.restockProduct;
    if (!product || this.restockForm.invalid || this.isSaving) {
      this.restockForm.markAllAsTouched();
      return;
    }

    const amount = Number(this.restockForm.getRawValue().amount);
    const updated = {
      name: product.name,
      code: product.code,
      price: product.price,
      quantity: product.quantity + amount,
    };

    this.isSaving = true;
    this.formError = '';

    this.http
      .patch<ProductDTO>(`${API_URL}/${product.id}`, updated, { headers: this.authHeaders() })
      .subscribe({
        next: () => {
          if (!this.selectedImage) {
            this.finishRestock();
            return;
          }
          this.uploadImage(product.id, this.selectedImage, () => this.finishRestock());
        },
        error: (error: HttpErrorResponse) => {
          this.isSaving = false;
          this.formError = error.error?.message ?? 'Não foi possível reabastecer o produto.';
          this.cdr.detectChanges();
        },
      });
  }

  private finishRestock(): void {
    this.isSaving = false;
    this.restockProduct = null;
    this.clearImage();
    this.loadProducts();
  }

  private uploadImage(productId: string, file: File, onDone: () => void): void {
    const body = new FormData();
    body.append('file', file);

    this.http
      .post<ProductDTO>(`${API_URL}/${productId}/image`, body, { headers: this.authHeaders() })
      .subscribe({
        next: () => onDone(),
        error: (error: HttpErrorResponse) => {
          this.isSaving = false;
          this.imageError =
            error.error?.message ?? 'Produto salvo, mas não foi possível enviar a imagem.';
          this.cdr.detectChanges();
        },
      });
  }

  private authHeaders(): Record<string, string> {
    return { Authorization: `Bearer ${this.auth.getToken() ?? ''}` };
  }
}
