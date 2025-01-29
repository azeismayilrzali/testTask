export interface IUser {
  id: number;
  username: string;
  balance: number;
  created_at: Date;
  password_hash: string;
}

export interface IUserResponse {
    id: number;
    username: string;
    balance: number;
}

export interface ISkinportItem {
  market_hash_name: string;
  currency: string;
  suggested_price: number;
  item_page: string;
  market_page: string;
  min_price: number | null;
  max_price: number | null;
  mean_price: number | null;
  median_price: number | null;
  quantity: number;
  created_at: number;
  updated_at: number;
}

export interface IMarketplaceItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  created_at: Date;
}

export interface IGenericResponse<T> {
    success: boolean;
    data: T;
    error?: string;
}
