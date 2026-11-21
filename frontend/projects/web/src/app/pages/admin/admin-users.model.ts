export interface UserSummary {
  id: string;
  email: string;
  fullName: string;
  phoneNumber: string;
  role: 'CUSTOMER' | 'MERCHANT' | 'COURIER' | 'DISPATCHER' | 'ADMIN';
  enabled: boolean;
  zone?: string;
  createdAt: string;
  updatedAt?: string;
}

export type StaffUser = UserSummary;

export interface RoleCounts {
  MERCHANT?: number;
  CUSTOMER?: number;
  DISPATCHER?: number;
  COURIER?: number;
  ADMIN?: number;
  [key: string]: number | undefined;
}

export interface UserListPage {
  content: UserSummary[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
  roleCounts?: RoleCounts;
}

export interface CreateStaffUserRequest {
  email: string;
  password?: string;
  fullName: string;
  phoneNumber: string;
  role: 'COURIER' | 'DISPATCHER';
  zone?: string;
}

export type CreateStaffPayload = CreateStaffUserRequest;

export interface UpdateUserRequest {
  enabled?: boolean;
  fullName?: string;
  phoneNumber?: string;
  email?: string;
  zone?: string;
}

export type UpdateUserStatusRequest = UpdateUserRequest;

export interface AdminUserFilterParams {
  role?: string;
  enabled?: boolean;
  page?: number;
  size?: number;
}

export interface DeliveryZoneOption {
  id: string;
  name: string;
  districts?: string[];
  served?: boolean;
  baseFeeLkr?: number;
}

