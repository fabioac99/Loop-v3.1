function getApiUrl() {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== 'undefined') {
    // Auto-detect: same hostname, port 4000
    return `${window.location.protocol}//${window.location.hostname}:4000/api`;
  }
  return 'http://localhost:4000/api';
}

const API_URL = getApiUrl();

class ApiClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  get baseUrl() { return API_URL; }

  constructor() {
    if (typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('loop_access_token');
      this.refreshToken = localStorage.getItem('loop_refresh_token');
    }
  }

  setTokens(access: string, refresh: string) {
    this.accessToken = access;
    this.refreshToken = refresh;
    if (typeof window !== 'undefined') {
      localStorage.setItem('loop_access_token', access);
      localStorage.setItem('loop_refresh_token', refresh);
    }
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('loop_access_token');
      localStorage.removeItem('loop_refresh_token');
    }
  }

  getAccessToken() { return this.accessToken; }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: any = { 'Content-Type': 'application/json', ...options.headers };
    if (this.accessToken) headers['Authorization'] = `Bearer ${this.accessToken}`;

    let res = await fetch(`${API_URL}${path}`, { ...options, headers });

    if (res.status === 401 && this.refreshToken) {
      const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });
      if (refreshRes.ok) {
        const data = await refreshRes.json();
        this.setTokens(data.accessToken, data.refreshToken);
        headers['Authorization'] = `Bearer ${data.accessToken}`;
        res = await fetch(`${API_URL}${path}`, { ...options, headers });
      } else {
        this.clearTokens();
        if (typeof window !== 'undefined') window.location.href = '/auth';
        throw new Error('Session expired');
      }
    }

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${res.status}`);
    }

    return res.json();
  }

  get<T>(path: string) { return this.request<T>(path); }
  post<T>(path: string, body?: any) { return this.request<T>(path, { method: 'POST', body: JSON.stringify(body) }); }
  put<T>(path: string, body?: any) { return this.request<T>(path, { method: 'PUT', body: JSON.stringify(body) }); }
  patch<T>(path: string, body?: any) { return this.request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }); }
  delete<T>(path: string) { return this.request<T>(path, { method: 'DELETE' }); }

  async upload(path: string, file: File, params?: Record<string, string>) {
    const formData = new FormData();
    formData.append('file', file);
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    const headers: any = {};
    if (this.accessToken) headers['Authorization'] = `Bearer ${this.accessToken}`;
    const res = await fetch(`${API_URL}${path}${query}`, { method: 'POST', headers, body: formData });
    if (!res.ok) throw new Error('Upload failed');
    return res.json();
  }

  // Auth
  login(email: string, password: string) { return this.post<any>('/auth/login', { email, password }); }
  getProfile() { return this.get<any>('/auth/me'); }
  logout() { return this.post('/auth/logout', { refreshToken: this.refreshToken }); }

  // Users
  getUsers(params?: Record<string, string>) { return this.get<any>(`/users?${new URLSearchParams(params || {})}`); }
  getUser(id: string) { return this.get<any>(`/users/${id}`); }
  createUser(data: any) { return this.post<any>('/users', data); }
  updateUser(id: string, data: any) { return this.put<any>(`/users/${id}`, data); }
  deleteUser(id: string) { return this.delete<any>(`/users/${id}`); }

  // Departments
  getDepartments() { return this.get<any>('/departments'); }
  getDepartment(id: string) { return this.get<any>(`/departments/${id}`); }
  createDepartment(data: any) { return this.post<any>('/departments', data); }
  updateDepartment(id: string, data: any) { return this.put<any>(`/departments/${id}`, data); }
  deleteDepartment(id: string) { return this.delete<any>(`/departments/${id}`); }

  // Tickets
  getTickets(params?: Record<string, string>) { return this.get<any>(`/tickets?${new URLSearchParams(params || {})}`); }
  getTicket(id: string) { return this.get<any>(`/tickets/${id}`); }
  createTicket(data: any) { return this.post<any>('/tickets', data); }
  updateTicket(id: string, data: any) { return this.patch<any>(`/tickets/${id}`, data); }
  deleteTicket(id: string) { return this.delete<any>(`/admin/tickets/${id}`); }
  addMessage(ticketId: string, data: any) { return this.post<any>(`/tickets/${ticketId}/messages`, data); }
  addNote(ticketId: string, content: string) { return this.post<any>(`/tickets/${ticketId}/notes`, { content }); }
  addWatcher(ticketId: string, userId: string) { return this.post<any>(`/tickets/${ticketId}/watchers`, { userId }); }
  removeWatcher(ticketId: string, userId: string) { return this.delete<any>(`/tickets/${ticketId}/watchers/${userId}`); }
  duplicateTicket(id: string) { return this.post<any>(`/tickets/${id}/duplicate`); }
  executeAction(ticketId: string, action: string) { return this.post<any>(`/tickets/${ticketId}/actions/${action}`); }
  forwardTicket(ticketId: string, toUserId: string, message?: string) { return this.post<any>(`/admin/tickets/${ticketId}/forward`, { toUserId, message }); }
  getTicketForwards(ticketId: string) { return this.get<any>(`/admin/tickets/${ticketId}/forwards`); }
  getDashboard() { return this.get<any>('/tickets/dashboard'); }
  getKpiTickets(type: string, scope: string) { return this.get<any>(`/tickets/dashboard/kpi/${type}?scope=${scope}`); }

  // Admin
  getPermissions() { return this.get<any>('/admin/permissions'); }
  getUserPermissions(userId: string) { return this.get<any>(`/admin/permissions/user/${userId}`); }
  setUserPermissions(userId: string, permissions: string[]) { return this.put<any>(`/admin/permissions/user/${userId}`, { permissions }); }
  getMyPermissions() { return this.get<any>('/admin/permissions/my'); }
  checkPermission(permission: string) { return this.get<any>(`/admin/permissions/check/${permission}`); }
  getCustomStatuses() { return this.get<any>('/admin/statuses'); }
  createCustomStatus(data: any) { return this.post<any>('/admin/statuses', data); }
  updateCustomStatus(id: string, data: any) { return this.put<any>(`/admin/statuses/${id}`, data); }
  deleteCustomStatus(id: string) { return this.delete<any>(`/admin/statuses/${id}`); }
  getCustomPriorities() { return this.get<any>('/admin/priorities'); }
  createCustomPriority(data: any) { return this.post<any>('/admin/priorities', data); }
  updateCustomPriority(id: string, data: any) { return this.put<any>(`/admin/priorities/${id}`, data); }
  deleteCustomPriority(id: string) { return this.delete<any>(`/admin/priorities/${id}`); }

  // Notifications
  getNotifications(params?: any) { return this.get<any>(`/notifications?${new URLSearchParams(params || {})}`); }
  getUnreadTicketIds() { return this.get<string[]>('/notifications/unread-tickets'); }
  markNotificationRead(id: string) { return this.patch<any>(`/notifications/${id}/read`, {}); }
  markNotificationUnread(id: string) { return this.patch<any>(`/notifications/${id}/unread`, {}); }
  markAllNotificationsRead() { return this.post<any>('/notifications/read-all'); }
  getNotificationPreferences() { return this.get<any>('/notifications/preferences'); }
  updateNotificationPreferences(prefs: any[]) { return this.post<any>('/notifications/preferences', { preferences: prefs }); }
  markTicketNotificationsRead(ticketId: string) { return this.post<any>(`/notifications/ticket/${ticketId}/read`); }
  markTicketNotificationsUnread(ticketId: string) { return this.post<any>(`/notifications/ticket/${ticketId}/unread`); }

  // Forms
  getCategories(departmentId?: string) { return this.get<any>(`/forms/categories${departmentId ? `?departmentId=${departmentId}` : ''}`); }
  getSubtype(id: string) { return this.get<any>(`/forms/subtypes/${id}`); }
  getFormHierarchy(departmentId: string) { return this.get<any>(`/forms/hierarchy/${departmentId}`); }
  getFormSchemas() { return this.get<any>('/forms/schemas'); }
  createFormSchema(data: any) { return this.post<any>('/forms/schemas', data); }
  updateFormSchema(id: string, data: any) { return this.put<any>(`/forms/schemas/${id}`, data); }
  createCategory(data: any) { return this.post<any>('/forms/categories', data); }
  updateCategory(id: string, data: any) { return this.put<any>(`/forms/categories/${id}`, data); }
  deleteCategory(id: string) { return this.delete<any>(`/forms/categories/${id}`); }
  createSubtype(data: any) { return this.post<any>('/forms/subtypes', data); }
  updateSubtype(id: string, data: any) { return this.put<any>(`/forms/subtypes/${id}`, data); }
  deleteSubtype(id: string) { return this.delete<any>(`/forms/subtypes/${id}`); }

  // Analytics
  getAnalytics(params?: any) { return this.get<any>(`/analytics?${new URLSearchParams(params || {})}`); }
  exportAnalytics(params?: any) { return this.get<any>(`/analytics/export?${new URLSearchParams(params || {})}`); }

  // Search
  search(q: string) { return this.get<any>(`/search?q=${encodeURIComponent(q)}`); }

  // Audit
  getAuditLogs(params?: any) { return this.get<any>(`/audit?${new URLSearchParams(params || {})}`); }

  // Settings
  getSettings() { return this.get<any>('/settings'); }
  updateSettings(data: any) { return this.put<any>('/settings', data); }

  // Clients
  getClients(params?: any) { return this.get<any>(`/entities/clients?${new URLSearchParams(params || {})}`); }
  getAllClients() { return this.get<any>('/entities/clients/all'); }
  getClient(id: string) { return this.get<any>(`/entities/clients/${id}`); }
  createClient(data: any) { return this.post<any>('/entities/clients', data); }
  updateClient(id: string, data: any) { return this.put<any>(`/entities/clients/${id}`, data); }
  deleteClient(id: string) { return this.delete<any>(`/entities/clients/${id}`); }

  // Suppliers
  getSuppliers(params?: any) { return this.get<any>(`/entities/suppliers?${new URLSearchParams(params || {})}`); }
  getAllSuppliers() { return this.get<any>('/entities/suppliers/all'); }
  getSupplier(id: string) { return this.get<any>(`/entities/suppliers/${id}`); }
  createSupplier(data: any) { return this.post<any>('/entities/suppliers', data); }
  updateSupplier(id: string, data: any) { return this.put<any>(`/entities/suppliers/${id}`, data); }
  deleteSupplier(id: string) { return this.delete<any>(`/entities/suppliers/${id}`); }
}

export const api = new ApiClient();
