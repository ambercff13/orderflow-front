import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login';
import { ProductList } from './features/products/product-list/product-list';
import { KanbanComponent } from './features/kanban/kanban';
import { authGuard, publicGuard } from './core/guards/auth-guard';
import { CartComponent } from './features/cart/cart/cart';
import { HistoryComponent } from './features/history/history';
import { StockComponent } from './features/stock/stock';
import { RegisterComponent } from './features/auth/register/register';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  { path: 'login', component: LoginComponent, canActivate: [publicGuard] },

  { path: 'register', component: RegisterComponent, canActivate: [publicGuard] },

  { path: 'products', component: ProductList, canActivate: [authGuard] },

  { path: 'kanban', component: KanbanComponent, canActivate: [authGuard] },

  { path: 'cart', component: CartComponent, canActivate: [authGuard] },

  { path: 'history', component: HistoryComponent, canActivate: [authGuard] },

  { path: 'stock', component: StockComponent, canActivate: [authGuard] },

  { path: '**', redirectTo: 'login' },
];
