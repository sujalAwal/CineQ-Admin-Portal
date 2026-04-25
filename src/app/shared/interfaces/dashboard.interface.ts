export interface KpiCards {
  totalBookings: number;
  todaysBookings: number;
  totalRevenue: number;
  todaysRevenue: number;
  nowShowingMovies: number;
  activeTheatres: number;
}

export interface RevenueTrendItem {
  date: string;
  revenue: number;
  bookings: number;
}

export interface StatusDistributionItem {
  status: string;
  count: number;
}

export interface TopMovieItem {
  movieId: string;
  title: string;
  poster: string;
  totalBookings: number;
  totalRevenue: number;
}

export interface TopTheatreItem {
  theatreId: string;
  name: string;
  city: string;
  totalBookings: number;
  totalRevenue: number;
}

export interface MovieShowcaseItem {
  id: string;
  title: string;
  poster: string;
  duration: number;
  certification: string;
  language: string[];
  releaseDate: string;
}

export interface RecentBookingItem {
  bookingReference: string;
  customerName: string;
  movieTitle: string;
  theatreName: string;
  numberOfSeats: number;
  totalAmount: number;
  paymentStatus: string;
  status: string; // This will be mapped from seatStatusLabel
  bookingDate: string;
  seatStatusLabel?: string; // Optional to handle raw API response
}

export interface PaymentMethodItem {
  method: string;
  count: number;
  amount: number;
}

export interface DashboardStats {
  kpiCards: KpiCards;
  revenueTrend: RevenueTrendItem[];
  bookingsByStatus: StatusDistributionItem[];
  topMovies: TopMovieItem[];
  topTheatres: TopTheatreItem[];
  nowShowingMovies: MovieShowcaseItem[];
  comingSoonMovies: MovieShowcaseItem[];
  recentBookings: RecentBookingItem[];
  paymentMethodDistribution: PaymentMethodItem[];
}

export interface DashboardApiResponse {
  success: boolean;
  data: DashboardStats;
}
