import type {
  AdminCategoryView,
  AdminInventoryItemView,
  AdminOrderDetailView,
  AdminOrderSummaryView,
  AdminProductSummaryView,
  AdminProductView,
  AdminUserView,
  CatalogImportSummaryView,
  InventoryAdjustmentView,
  OrderStatus,
  Permission,
  ProductStatus,
  Role,
  SalesReportView,
} from "@el-tesoro/shared";
import { ApiError } from "./api";

// Mismo patrón que staffApi.ts: requiere sesión con cookies (el panel admin
// siempre está autenticado), reintenta una vez con /auth/refresh ante un 401.
const API_BASE_URL = "/api";

interface Envelope<T> {
  success: boolean;
  data: T;
  error?: { code: string; message: string };
}

interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

async function doFetch<T>(path: string, init?: RequestInit): Promise<{ response: Response; body: Envelope<T> | undefined }> {
  let response: Response;
  try {
    const isFormData = init?.body instanceof FormData;
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      credentials: "include",
      headers: isFormData ? init?.headers : { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new ApiError("No se pudo conectar con el servidor. Revisa tu conexión.", 0);
  }
  const body = (await response.json().catch(() => undefined)) as Envelope<T> | undefined;
  return { response, body };
}

function toResult<T>(response: Response, body: Envelope<T> | undefined): T {
  if (!response.ok || !body?.success) {
    throw new ApiError(body?.error?.message ?? `Error del servidor (${response.status}).`, response.status);
  }
  return body.data;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const first = await doFetch<T>(path, init);
  if (first.response.status === 401) {
    const refresh = await doFetch("/auth/refresh", { method: "POST" }).catch(() => undefined);
    if (refresh?.response.ok) {
      const retried = await doFetch<T>(path, init);
      return toResult(retried.response, retried.body);
    }
  }
  return toResult(first.response, first.body);
}

function qs(params: object): string {
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(params as Record<string, string | number | boolean | undefined>)) {
    if (value !== undefined && value !== "") usp.set(key, String(value));
  }
  const s = usp.toString();
  return s ? `?${s}` : "";
}

export type InternalRole = Extract<Role, "admin" | "staff" | "operador" | "servicio_cliente">;

export function fetchAdminMe() {
  return request<{ role: Role; permissions: Permission[] }>("/admin/me");
}

// --- Categorías ---
export function listCategories() {
  return request<AdminCategoryView[]>("/admin/catalog/categories");
}
export interface CategoryFormInput {
  nombre: string;
  descripcion?: string | null;
  imagenUrl?: string | null;
  orden?: number;
  parentId?: string | null;
}
export function createCategory(input: CategoryFormInput) {
  return request<AdminCategoryView>("/admin/catalog/categories", { method: "POST", body: JSON.stringify(input) });
}
export function updateCategory(id: string, input: CategoryFormInput) {
  return request<AdminCategoryView>(`/admin/catalog/categories/${id}`, { method: "PUT", body: JSON.stringify(input) });
}
export function deleteCategory(id: string) {
  return request<void>(`/admin/catalog/categories/${id}`, { method: "DELETE" });
}

// --- Productos ---
export interface ProductListParams {
  q?: string;
  categoriaId?: string;
  estado?: ProductStatus;
  page?: number;
  limit?: number;
}
export function listProducts(params: ProductListParams) {
  return request<Paginated<AdminProductSummaryView>>(`/admin/catalog/products${qs(params)}`);
}
export function getProduct(id: string) {
  return request<AdminProductView>(`/admin/catalog/products/${id}`);
}
export interface ProductFormInput {
  nombre: string;
  descripcionCorta?: string | null;
  descripcionLarga?: string | null;
  marca?: string | null;
  categoriaId: string;
}
export function createProduct(input: ProductFormInput) {
  return request<AdminProductView>("/admin/catalog/products", { method: "POST", body: JSON.stringify(input) });
}
export function updateProduct(id: string, input: ProductFormInput) {
  return request<AdminProductView>(`/admin/catalog/products/${id}`, { method: "PUT", body: JSON.stringify(input) });
}
export function setProductEstado(id: string, estado: ProductStatus) {
  return request<AdminProductView>(`/admin/catalog/products/${id}/estado`, { method: "PATCH", body: JSON.stringify({ estado }) });
}
export function deleteProduct(id: string) {
  return request<void>(`/admin/catalog/products/${id}`, { method: "DELETE" });
}

// --- Variantes ---
export interface VariantFormInput {
  sku: string;
  precio: string;
  precioComparativo?: string | null;
  activo?: boolean;
  cantidadDisponible?: number;
  umbralStockBajo?: number;
}
export function createVariant(productId: string, input: VariantFormInput) {
  return request(`/admin/catalog/products/${productId}/variants`, { method: "POST", body: JSON.stringify(input) });
}
export function updateVariant(variantId: string, input: Omit<VariantFormInput, "cantidadDisponible">) {
  return request(`/admin/catalog/variants/${variantId}`, { method: "PUT", body: JSON.stringify(input) });
}
export function deleteVariant(variantId: string) {
  return request<void>(`/admin/catalog/variants/${variantId}`, { method: "DELETE" });
}

// --- Imágenes ---
export function addProductImage(productId: string, file: File, opts: { textoAlternativo?: string; variantId?: string } = {}) {
  const form = new FormData();
  form.set("imagen", file);
  if (opts.textoAlternativo) form.set("textoAlternativo", opts.textoAlternativo);
  if (opts.variantId) form.set("variantId", opts.variantId);
  return request(`/admin/catalog/products/${productId}/images`, { method: "POST", body: form });
}
export function reorderProductImages(productId: string, orderedImageIds: string[]) {
  return request<void>(`/admin/catalog/products/${productId}/images/reorder`, { method: "PUT", body: JSON.stringify({ orderedImageIds }) });
}
export function deleteProductImage(imageId: string) {
  return request<void>(`/admin/catalog/images/${imageId}`, { method: "DELETE" });
}

// --- Importador de catálogo ---
export function importCatalog(file: File) {
  const form = new FormData();
  form.set("archivo", file);
  return request<CatalogImportSummaryView>("/admin/catalog/import", { method: "POST", body: form });
}

// --- Inventario ---
export interface InventoryListParams {
  q?: string;
  soloStockBajo?: boolean;
  page?: number;
  limit?: number;
}
export function listInventory(params: InventoryListParams) {
  return request<Paginated<AdminInventoryItemView>>(`/admin/inventory${qs(params)}`);
}
export interface AdjustStockInput {
  delta: number;
  motivo: "recepcion" | "merma" | "correccion";
  notas?: string;
}
export function adjustStock(variantId: string, input: AdjustStockInput) {
  return request<InventoryAdjustmentView>(`/admin/inventory/${variantId}`, { method: "PATCH", body: JSON.stringify(input) });
}
export function listAdjustments(variantId: string) {
  return request<InventoryAdjustmentView[]>(`/admin/inventory/${variantId}/adjustments`);
}

// --- Pedidos ---
export interface OrderListParams {
  estado?: OrderStatus;
  desde?: string;
  hasta?: string;
  q?: string;
  page?: number;
  limit?: number;
}
export function listOrders(params: OrderListParams) {
  return request<Paginated<AdminOrderSummaryView>>(`/admin/orders${qs(params)}`);
}
export function getOrder(id: string) {
  return request<AdminOrderDetailView>(`/admin/orders/${id}`);
}
export function confirmPayment(id: string) {
  return request<AdminOrderDetailView>(`/admin/orders/${id}/confirm-payment`, { method: "POST" });
}
export function advanceOrder(id: string, guiaEnvio?: string) {
  return request<AdminOrderDetailView>(`/admin/orders/${id}/advance`, { method: "POST", body: JSON.stringify({ guiaEnvio }) });
}
export function cancelOrder(id: string, motivo: string) {
  return request<AdminOrderDetailView>(`/admin/orders/${id}/cancel`, { method: "POST", body: JSON.stringify({ motivo }) });
}

// --- Reportes ---
export function getSalesSummary(desde: string, hasta: string) {
  return request<SalesReportView>(`/admin/reports/sales${qs({ desde, hasta })}`);
}
export function salesExportCsvUrl(desde: string, hasta: string): string {
  return `${API_BASE_URL}/admin/reports/sales/export.csv${qs({ desde, hasta })}`;
}

// --- Usuarios internos ---
export function listUsers() {
  return request<AdminUserView[]>("/admin/users");
}
export interface CreateUserInput {
  email: string;
  nombre: string;
  password: string;
  role: InternalRole;
}
export function createUser(input: CreateUserInput) {
  return request<AdminUserView>("/admin/users", { method: "POST", body: JSON.stringify(input) });
}
export interface UpdateUserInput {
  role?: InternalRole;
  activo?: boolean;
  password?: string;
}
export function updateUser(id: string, input: UpdateUserInput) {
  return request<AdminUserView>(`/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}
