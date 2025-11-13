import {
  Component,
  Input,
  OnChanges,
  ViewEncapsulation,
  ViewChild,
  ElementRef,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

Chart.register(...registerables);

export interface ChartDataPoint {
  timestamp: string;
  values: { [key: string]: number };
}

@Component({
  selector: 'app-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="chart-container">
      <canvas #chartCanvas></canvas>
    </div>
  `,
  styles: [
    `
      .chart-container {
        position: relative;
        height: 300px;
        width: 100%;
      }
    `,
  ],
  encapsulation: ViewEncapsulation.None,
})
export class ChartComponent implements OnChanges, AfterViewInit {
  @Input() data: ChartDataPoint[] = [];
  @Input() title = 'OPA Docker Stats';
  @ViewChild('chartCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  private chart: Chart | null = null;
  private viewInitialized = false;
  private showCPU = true;
  private showMem = true;

  ngAfterViewInit() {
    this.viewInitialized = true;
    this.updateChart();
  }
  ngOnChanges() {
    if (this.viewInitialized) {
      this.updateChart();
    }
  }
  private updateChart() {
    if (!this.data || this.data.length === 0 || !this.canvasRef) return;
    const canvas = this.canvasRef.nativeElement;
    if (!canvas) return;
    const labels = this.data.map((d) => d.timestamp);
    const datasets = [...this.getDatasets()];
    if (this.chart) {
      this.chart.data.labels = labels;
      this.chart.data.datasets = datasets;
      this.chart.update('none');
      return;
    }
    const config: ChartConfiguration = {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: { display: false, text: this.title },
          legend: {
            display: true,
            position: 'top',
            onClick: (evt, item, legend) => {
              const label = item.text;
              if (label.startsWith('CPU')) {
                this.showCPU = !this.showCPU;
              } else {
                this.showMem = !this.showMem;
              }
              this.updateChart();
            },
          },
        },
        scales: {
          y: {
            type: 'linear',
            position: 'left',
            stacked: true,
            beginAtZero: true,
            title: { display: true, text: 'CPU %' },
          },
          y1: {
            type: 'linear',
            position: 'right',
            beginAtZero: true,
            max: 8,
            title: { display: true, text: 'Memory (GB)' },
            grid: { drawOnChartArea: false },
          },
        },
      },
    };
    this.chart = new Chart(canvas, config);
  }
  private getDatasets() {
    if (this.data.length === 0) return [];
    const keys = Object.keys(this.data[0].values);
    return keys.map((key, index) => ({
      hidden: key.startsWith('CPU') ? !this.showCPU : key.startsWith('Mem') ? !this.showMem : false,
      label: key,
      data: this.data.map((d) => d.values[key]),
      borderColor: index === 0 ? '#3b82f6' : '#ef4444',
      backgroundColor: (index === 0 ? '#3b82f6' : '#ef4444') + '33',
      fill: true,
      yAxisID: index === 0 ? 'y' : 'y1',
    }));
  }
  ngOnDestroy() {
    if (this.chart) {
      this.chart.destroy();
    }
  }
}
