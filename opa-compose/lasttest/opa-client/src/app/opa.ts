import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export const OPA_BASE = 'http://localhost:8181';
export const API_BASE = 'http://localhost:3001';

export interface BenchmarkRequest {
  policyPath: string;
  input: any;
  e2e: string;
  mem: string;
}

export interface BenchmarkResult {
  success: boolean;
  results?: {
    nsPerOp: number;
    bytesPerOp: number;
    allocsPerOp: number;
    opsPerSecond: number;
    iterations: number;
    totalTimeNs: number;
    metrics: Record<
      string,
      {
        value: number;
        unit: string;
        samples: number;
      }
    >;
  };
  rawOutput?: string;
  message?: string;
}

@Injectable({
  providedIn: 'root',
})
export class Opa {
  private http = inject(HttpClient);

  ping(): Observable<{ success: boolean; message: string }> {
    return this.http
      .get<any>(`${OPA_BASE}/health`, {
        observe: 'response',
      })
      .pipe(
        map((response: { status: number }) => ({
          success: response.status === 200,
          message: 'OPA ist online',
        })),
        catchError((error: { message: any }) =>
          of({
            success: false,
            message: `OPA nicht erreichbar: ${error.message}`,
          })
        )
      );
  }
  loadPolicy(
    policyContent: string,
    policyId: string
  ): Observable<{ success: boolean; message: string }> {
    const url = `${OPA_BASE}/v1/policies/${policyId}`;

    return this.http
      .put(url, policyContent, {
        headers: new HttpHeaders({
          'Content-Type': 'text/plain',
        }),
        observe: 'response',
        responseType: 'text' as 'json',
      })
      .pipe(
        map((response: { status: number }) => ({
          success: response.status === 200,
          message: `Policy '${policyId}' loaded successfully`,
        })),
        catchError((error) => {
          console.error('Error:', error);
          return of({
            success: false,
            message: error,
          });
        })
      );
  }
  getAllData(): Observable<any> {
    return this.http.get(`${OPA_BASE}/v1/data`);
  }
  getDockerStats(): Observable<any> {
    return this.http.get(`${API_BASE}/docker/stats`).pipe(
      catchError((error: any) => {
        console.error('Docker stats failed:', error);
        return of({ success: false, stats: [] });
      })
    );
  }
  deletePolicy(policyId: string): Observable<any> {
    const url = `${OPA_BASE}/v1/policies/${policyId}`;
    return this.http
      .delete(url, {
        observe: 'response',
      })
      .pipe(
        map((response) => ({
          success: response.status === 200,
          message: `Policy '${policyId}' deleted successfully`,
        })),
        catchError((error) => {
          console.error('Delete error:', error);
          return of({
            success: false,
            message: `Failed to delete policy: ${error.message}`,
          });
        })
      );
  }
  opaBenchmark(request: BenchmarkRequest): Observable<BenchmarkResult> {
    return this.http.post<BenchmarkResult>(`${API_BASE}/opa/benchmark`, request);
  }
}
