import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, ViewChild } from '@angular/core';
import { NgApexchartsModule } from 'ng-apexcharts';
import {
  ApexAxisChartSeries,
  ApexChart,
  ChartComponent,
  ApexDataLabels,
  ApexPlotOptions,
  ApexYAxis,
  ApexXAxis,
  ApexFill,
  ApexTooltip,
  ApexStroke,
  ApexLegend,
  ApexTitleSubtitle,
  ApexGrid,
  ApexNoData
} from 'ng-apexcharts';

import { SharedModule } from 'src/app/theme/shared/shared.module';
import { MasterDataService } from 'src/app/shared/services/master-data.service';
import { DashboardService } from 'src/app/shared/services/dashboard.service';
import {
  DashboardStats,
  RevenueTrendItem,
  StatusDistributionItem,
  PaymentMethodItem
} from 'src/app/shared/interfaces/dashboard.interface';

export type ChartOptions = {
  series: ApexAxisChartSeries | any[];
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis | ApexYAxis[];
  title: ApexTitleSubtitle;
  labels: string[];
  stroke: any;
  dataLabels: any;
  fill: ApexFill;
  tooltip: ApexTooltip;
  legend: ApexLegend;
  colors: string[];
  markers: any;
  grid: ApexGrid;
  plotOptions: ApexPlotOptions;
  noData: ApexNoData;
};

@Component({
  selector: 'app-default',
  standalone: true,
  imports: [NgApexchartsModule, SharedModule],
  templateUrl: './default.component.html',
  styleUrls: ['./default.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DefaultComponent implements OnInit {
  @ViewChild('chart') chart: ChartComponent;
  
  dashboardData: DashboardStats | null = null;
  isLoading = true;
  isRevenueChartLoading = false;
  selectedPeriod: number = 7;

  revenueChartOptions: Partial<ChartOptions>;
  bookingStatusChartOptions: Partial<ChartOptions>;
  paymentMethodChartOptions: Partial<ChartOptions>;

  constructor(
    private masterDataService: MasterDataService,
    private dashboardService: DashboardService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadDashboardStats();
    this.masterDataService.fetchMasterData().subscribe({
    });
  }

  loadDashboardStats(forceRefresh = false): void {
    this.isLoading = true;
    const request = forceRefresh 
      ? this.dashboardService.refresh(this.selectedPeriod)
      : this.dashboardService.getDashboardStats(this.selectedPeriod);

    request.subscribe({
      next: (data) => {
        this.dashboardData = {
          ...data,
          recentBookings: data.recentBookings.map(b => ({...b, status: b.seatStatusLabel || 'Unknown' }))
        };
        if (this.dashboardData) {
          this.buildRevenueChart(this.dashboardData.revenueTrend);
          this.buildBookingStatusChart(this.dashboardData.bookingsByStatus);
          this.buildPaymentMethodChart(this.dashboardData.paymentMethodDistribution);
        }
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  onPeriodChange(period: number): void {
    this.selectedPeriod = period;
    this.isRevenueChartLoading = true;
    this.dashboardService.refresh(period).subscribe({
      next: (data) => {
        if (this.dashboardData) {
          this.dashboardData.revenueTrend = data.revenueTrend;
          this.buildRevenueChart(data.revenueTrend);
        }
        this.isRevenueChartLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isRevenueChartLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  refreshDashboard(): void {
    this.loadDashboardStats(true);
  }

  private buildRevenueChart(data: RevenueTrendItem[]): void {
    if (!data) return;
    this.revenueChartOptions = {
      chart: {
        type: 'bar', // Changed from 'area' to 'bar'
        height: 350,
        toolbar: { show: false }
      },
      series: [{
        name: 'Revenue',
        data: data.map(item => item.revenue)
      }],
      xaxis: {
        categories: data.map(item => new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
      },
      yaxis: {
        min: 0 // Ensure y-axis starts at 0
      },
      colors: ['#4680ff'],
      dataLabels: { enabled: false },
      stroke: { curve: 'smooth', width: 2 },
    };
  }

  private buildBookingStatusChart(data: StatusDistributionItem[]): void {
    if (!data) return;
    this.bookingStatusChartOptions = {
      chart: {
        type: 'donut',
        height: 350
      },
      series: data.map(item => item.count),
      labels: data.map(item => item.status),
      colors: ['#2ca87f', '#e58a00', '#dc2626'], // Confirmed, Pending, Cancelled
      legend: { position: 'bottom' },
      dataLabels: {
        formatter: function (_val, opts) {
          return opts.w.config.series[opts.seriesIndex]
        },
      },
    };
  }

  private buildPaymentMethodChart(data: PaymentMethodItem[]): void {
    if (!data || data.length === 0) {
      this.paymentMethodChartOptions = {
        series: [],
        chart: {
          type: 'pie',
          height: 350
        },
        labels: [],
        noData: { text: 'No payment data available.' }
      };
      return;
    }

    const total = data.reduce((acc, item) => acc + item.amount, 0);

    this.paymentMethodChartOptions = {
      chart: {
        type: 'pie',
        height: 350
      },
      series: data.map((item) => item.amount),
      labels: data.map((item) => item.method),
      colors: ['#d30943', '#60bb46', '#4680ff', '#e58a00'],
      legend: {
        position: 'bottom'
      },
      dataLabels: {
        enabled: true,
        formatter: function (val) {
          if (total === 0) return '0%';
          return ((Number(val) / total) * 100).toFixed(1) + '%';
        }
      },
      tooltip: {
        y: {
          formatter: function (val) {
            return `Rs. ${val.toLocaleString()}`;
          }
        }
      }
    };
  }
}
