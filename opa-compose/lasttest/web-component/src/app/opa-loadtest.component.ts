import { Component, ViewEncapsulation, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OpaService } from './opa.service';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'opa-loadtest-ui',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './opa-loadtest.component.html',
  styleUrls: ['./opa-loadtest.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class OpaLoadtestComponent implements OnInit {
  private opaService = inject(OpaService);
  private http = inject(HttpClient);
  private readonly API_BASE = 'http://localhost:3001';

  backendStatus: 'connected' | 'disconnected' | 'checking' = 'checking';
  opaStatus: 'connected' | 'disconnected' | 'checking' = 'checking';
  statusMessage = '';

  teamCount = 5;
  minMembers = 8;
  maxMembers = 12;
  taskCount = 5;
  lastGeneratedData: any = null;
  statusLog: string[] = [];

  regoPolicy = '';
  policyId = 'lasttest';
  policyCounter = 1;
  policies: string[] = [];

  dockerStats: any[] = [];
  dockerStatsInterval: any;

  testPath = 'app/abac/allow';
  parallelRequests = 10;
  iterations = 1;
  isTestRunning = false;
  testResults: any = null;
  testProgress = 0;
  testStatusMessage = '';

  private addLog(message: string) {
    const timestamp = new Date().toLocaleTimeString('de-DE');
    this.statusLog.unshift(`${timestamp} - ${message}`);
  }
  ngOnInit() {
    this.checkBackendHealth();
    this.checkOpaConnection();
    this.queryOpaData();
    this.loadPolicyFromOPA();
    this.getPolicies();
    this.startDockerStatsPolling();
  }
  checkBackendHealth() {
    this.backendStatus = 'checking';
    this.http.get(`${this.API_BASE}/health`).subscribe({
      next: () => {
        this.backendStatus = 'connected';
      },
      error: () => {
        this.backendStatus = 'disconnected';
      },
    });
  }
  restartContainer(containerId: string, containerName: string) {
    const isOpa = containerName.includes('opa') || containerName.includes('openpolicyagent');
    const message = `Container "${containerName}" neustarten?\n\n⚠️ Alle Daten und Policies gehen verloren!`;
    if (!confirm(message)) {
      return;
    }
    this.addLog(`Starte Container ${containerName} neu...`);

    this.http.post(`${this.API_BASE}/docker/restart/${containerId}`, {}).subscribe({
      next: () => {
        this.addLog(`✓ Container ${containerName} neugestartet`);

        this.loadDockerStats();

        if (isOpa) {
          this.addLog('Warte auf OPA...');

          setTimeout(() => {
            if (this.regoPolicy.trim()) {
              this.loadPolicyIntoOPA();
            } else {
              this.loadPolicyFromOPA();
            }
            if (this.lastGeneratedData) {
              this.loadDataIntoOPA();
            }
          }, 2000);
        }
      },
      error: (error) => {
        this.addLog(`✗ Fehler beim Restart: ${error.message}`);
      },
    });
  }
  checkOpaConnection() {
    this.opaStatus = 'checking';
    this.statusMessage = 'Checking OPA connection...';
    this.opaService.ping().subscribe({
      next: (result) => {
        if (result.success) {
          this.opaStatus = 'connected';
          this.statusMessage = result.message;
        } else {
          this.opaStatus = 'disconnected';
          this.statusMessage = result.message;
        }
      },
      error: (error) => {
        this.opaStatus = 'disconnected';
        this.statusMessage = 'Failed to connect to OPA';
      },
    });
  }
  generateData() {
    this.addLog('Generiere Daten...');

    this.http
      .post<any>(`${this.API_BASE}/generate`, {
        teamCount: this.teamCount,
        minMembers: this.minMembers,
        maxMembers: this.maxMembers,
        taskCount: this.taskCount,
      })
      .subscribe({
        next: (result) => {
          if (result.success) {
            this.lastGeneratedData = result.data;
            const filename = 'data.json';

            this.http
              .post(`${this.API_BASE}/data/save`, {
                filename: filename,
                data: result.data,
              })
              .subscribe({
                next: (saveResult: any) => {
                  if (saveResult.success) {
                    const sizeMsg = saveResult.size ? `(${saveResult.size} MB)` : '';
                    this.addLog(`✓ Daten gespeichert: ${filename} ${sizeMsg}`);
                  }
                },
                error: (error) => this.addLog(`✖ Fehler beim Speichern: ${error.message}`),
              });
          }
        },
        error: (error) => this.addLog(`✖ Fehler beim Generieren: ${error.message}`),
      });
  }
  loadDataIntoOPA() {
    if (!this.lastGeneratedData) {
      this.addLog('Keine Daten zum Laden vorhanden');
      return;
    }
    this.addLog('Lade Daten in OPA...');

    this.http
      .post<any>(`${this.API_BASE}/opa/load-data`, {
        data: this.lastGeneratedData,
      })
      .subscribe({
        next: (result) => {
          if (result.success) {
            this.addLog('✓ Daten in OPA geladen');
          } else {
            this.addLog(`✖ Fehler: ${result.message}`);
          }
        },
        error: (error) => this.addLog(`✖ Fehler beim Laden in OPA: ${error.message}`),
      });
  }
  queryOpaData() {
    this.opaService.getAllData().subscribe({
      next: (data) => {
        const teams = data.result?.teams ? Object.keys(data.result.teams).length : 0;
        const tasks = data.result?.tasks ? Object.keys(data.result.tasks).length : 0;
        if (teams > 0 || tasks > 0) {
          this.addLog(`OPA Daten: ${teams} Teams, ${tasks} Tasks`);
          this.lastGeneratedData = {
            teams: data.result.teams || {},
            tasks: data.result.tasks || {},
          };
        } else {
          this.addLog('OPA: Keine Daten geladen');
          this.lastGeneratedData = null;
        }
      },
      error: (error) => this.addLog(`✖ Fehler: ${error.message}`),
    });
  }
  loadPolicyFromOPA() {
    this.http.get<any>(`http://localhost:8181/v1/policies/${this.policyId}`).subscribe({
      next: (data) => {
        if (data.result && data.result.raw) {
          this.regoPolicy = data.result.raw;
          this.addLog(`✓ Policy '${this.policyId}' aus OPA geladen`);
        } else {
          this.addLog(`✖ Keine Policy mit ID '${this.policyId}' in OPA gefunden`);
        }
      },
      error: (error) => {
        this.addLog(`✖ Policy '${this.policyId}' nicht in OPA gefunden`);
      },
    });
  }
  getPolicies() {
    this.http.get(`${this.API_BASE}/policy/get`).subscribe({
      next: (result: any) => {
        if (result.success) {
          this.policies = result.files;
        }
      },
      error: (error) => this.addLog(`✖ Fehler beim Laden: ${error.message}`),
    });
  }
  loadPolicyFile(filename: string) {
    this.http.get<any>(`${this.API_BASE}/policy/load/${filename}`).subscribe({
      next: (result) => {
        if (result.success) {
          this.regoPolicy = result.content;
          this.addLog(`✓ Policy '${filename}' geladen`);
        }
      },
      error: (error) => this.addLog(`✖ Fehler beim Laden: ${error.message}`),
    });
  }
  deletePolicyFile(filename: string) {
    if (!confirm(`Policy '${filename}' wirklich löschen?`)) {
      return;
    }
    this.http.delete(`${this.API_BASE}/policy/delete/${filename}`).subscribe({
      next: () => {
        this.addLog(`✓ Policy '${filename}' gelöscht`);
        this.getPolicies();
      },
      error: (error) => this.addLog(`✖ Fehler beim Löschen: ${error.message}`),
    });
  }
  savePolicy() {
    if (!this.regoPolicy.trim()) {
      this.addLog('Keine Policy zum Speichern vorhanden');
      return;
    }

    this.http
      .post<any>(`${this.API_BASE}/policy/save`, {
        content: this.regoPolicy,
      })
      .subscribe({
        next: (result) => {
          if (result.success) {
            this.addLog(`✓ Policy gespeichert: ${result.filename}`);
            this.getPolicies();
          }
        },
        error: (error) => this.addLog(`✖ Fehler beim Speichern: ${error.message}`),
      });
  }
  loadPolicyIntoOPA() {
    if (!this.regoPolicy.trim()) {
      this.addLog('Keine Policy zum Laden vorhanden');
      return;
    }

    this.addLog('Lade Policy in OPA...');

    this.opaService.loadPolicy(this.regoPolicy, this.policyId).subscribe({
      next: (result) => {
        if (result.success) {
          this.addLog(`✓ Policy in OPA geladen: ${this.policyId}`);
        } else {
          this.addLog(`✖ Fehler: ${result.message}`);
        }
      },
      error: (error) => this.addLog(`✖ Fehler beim Laden in OPA: ${error.message}`),
    });
  }
  startDockerStatsPolling() {
    this.loadDockerStats();
    this.dockerStatsInterval = setInterval(() => {
      this.loadDockerStats();
    }, 5000);
  }
  loadDockerStats() {
    this.opaService.getDockerStats().subscribe({
      next: (result) => {
        if (result.success) {
          this.dockerStats = result.stats;
        }
      },
      error: () => {
        this.dockerStats = [];
      },
    });
  }
  generateTestInputs(count: number): any[] {
    if (!this.lastGeneratedData) {
      this.addLog('Keine Daten vorhanden zum Generieren von Test-Inputs');
      return [];
    }
    const inputs = [];
    const teams = Object.values(this.lastGeneratedData.teams || {}) as any[];
    const tasks = Object.values(this.lastGeneratedData.tasks || {}) as any[];
    if (teams.length === 0 || tasks.length === 0) {
      this.addLog('Keine Teams oder Tasks vorhanden');
      return [];
    }
    const actions = ['read', 'write', 'delete'];
    for (let i = 0; i < count; i++) {
      const team = teams[Math.floor(Math.random() * teams.length)];
      const members = Object.values(team.members || {}) as any[];
      const user = members[Math.floor(Math.random() * members.length)];
      const task = tasks[Math.floor(Math.random() * tasks.length)];
      const action = actions[Math.floor(Math.random() * actions.length)];

      inputs.push({
        input: {
          user: {
            id: user.id,
            name: user.name,
            role: user.role,
            attributes: {
              aufgabenart: user.attributes.aufgabenart,
            },
          },
          task: {
            id: task.id,
            title: task.title,
            attributes: {
              aufgabenart: task.attributes.aufgabenart,
            },
          },
          action: action,
        },
      });
    }
    return inputs;
  }
  executeLoadTest() {
    if (!this.lastGeneratedData || !this.regoPolicy.trim()) {
      return;
    }
    this.isTestRunning = true;
    this.testResults = null;
    this.testStatusMessage = 'Apache Bench Load Test läuft...';
    const testInputs = this.generateTestInputs(Math.min(this.parallelRequests, 100));
    if (testInputs.length === 0) {
      this.isTestRunning = false;
      return;
    }
    this.addLog(`Starte Apache Bench: ${this.parallelRequests} Requests...`);

    this.http
      .post<any>(`${this.API_BASE}/opa/load-test-ab`, {
        path: this.testPath,
        inputs: testInputs,
        iterations: this.iterations,
        parallelRequests: this.parallelRequests,
        concurrency: Math.min(this.parallelRequests, 100),
      })
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.testResults = response.stats;
            console.log('testResults', this.testResults);
          }
          this.isTestRunning = false;
          this.testStatusMessage = '';
        },
        error: (error) => {
          this.addLog(`Test Fehler: ${error.message}`);
          this.isTestRunning = false;
          this.testStatusMessage = '';
        },
      });
  }
  ngOnDestroy() {
    if (this.dockerStatsInterval) {
      clearInterval(this.dockerStatsInterval);
    }
  }
}
