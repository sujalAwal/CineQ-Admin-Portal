// Banner Interface 
export interface Banner {
    id: string;
    title: string;
    description?: string;
    imageUrl: string;
    targetUrl?: string;
    bannerType: string;
    movieId?: string;
    displayOrder: number;
    isActive: boolean;
    startDate?: string;
    endDate?: string;
}

// Banner Request Interface
export interface BannerRequest {
  id?: string;
  title: string;
  description?: string;
  imageUrl: string;
  targetUrl?: string;
  bannerType: string;
  movieId?: string;
  displayOrder: number;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
}

// Banner Response Interface 
export interface BannerResponse {
  message: string;
  banner: Banner;
}

// Banner Page Request Interface
export interface BannerPageRequest {
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  search?: string;
  active?: boolean;
}

