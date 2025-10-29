import { Component, ViewEncapsulation, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OPA_BASE, API_BASE, OpaService } from './opa.service';
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

  backendStatus: 'connected' | 'disconnected' | 'checking' = 'checking';
  opaStatus: 'connected' | 'disconnected' | 'checking' = 'checking';
  statusMessage = '';

  teamCount = 5;
  minMembers = 8;
  maxMembers = 12;
  taskCount = 5;
  lastGeneratedData: any = null;
  statusLog: string[] = [];

  policyFiles: string[] = [];
  policies: any[] = [];
  selectedPolicy: { id: string; raw: string } | null = null;

  dockerStats: any[] = [];
  dockerStatsInterval: any;

  testPath = 'app/abac/allow';
  parallelRequests = 10;
  iterations = 1;
  isTestRunning = false;
  testResults: any = null;
  testProgress = 0;
  testStatusMessage = '';

  queryResult = '';
  queryPath = 'v1/data/teams/team-0/members/u-0';
  teamsInOpa = 0;
  tasksInOpa = 0;

  private addLog(message: string) {
    const timestamp = new Date().toLocaleTimeString('de-DE');
    this.statusLog.unshift(`${timestamp} - ${message}`);
  }
  ngOnInit() {
    this.checkBackendHealth();
    this.checkOpaConnection();
    this.getStoredPolicies();
    this.queryOpaData();
    this.loadPoliciesFromOPA();
    this.startDockerStatsPolling();
  }
  checkBackendHealth() {
    this.backendStatus = 'checking';
    this.http.get(`${API_BASE}/health`).subscribe({
      next: () => {
        this.backendStatus = 'connected';
      },
      error: () => {
        this.backendStatus = 'disconnected';
      },
    });
  }
  restartContainer(containerId: string, containerName: string) {
    const message = `Container "${containerName}" neustarten?\n\n⚠️ Alle Daten und Policies gehen verloren!`;
    if (!confirm(message)) {
      return;
    }
    this.addLog(`Starte Container ${containerName} neu...`);

    this.http.post(`${API_BASE}/docker/restart/${containerId}`, {}).subscribe({
      next: () => {
        this.addLog(`✓ Container ${containerName} neugestartet`);
        this.loadPoliciesFromOPA();
        this.queryOpaData();
        this.loadDockerStats();
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
      .post<any>(`${API_BASE}/generate`, {
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
              .post(`${API_BASE}/data/save`, {
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
      .post<any>(`${API_BASE}/opa/load-data`, {
        data: this.lastGeneratedData,
      })
      .subscribe({
        next: (result) => {
          if (result.success) {
            this.addLog('✓ Daten in OPA geladen');
            this.queryOpaData();
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
        this.teamsInOpa = data.result?.teams ? Object.keys(data.result.teams).length : 0;
        this.tasksInOpa = data.result?.tasks ? Object.keys(data.result.tasks).length : 0;
        if (this.teamsInOpa > 0 || this.tasksInOpa > 0) {
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
  queryData() {
    this.http.get<any>(`${OPA_BASE}/${this.queryPath}`).subscribe({
      next: (data) => {
        this.queryResult = data.result;
      },
      error: (error) => {
        console.log(error);
        this.addLog(`✖ Error`);
      },
    });
  }
  loadPoliciesFromOPA() {
    this.http.get<any>(`${OPA_BASE}/v1/policies`).subscribe({
      next: (data) => {
        if (data.result) {
          this.policies = data.result;
        }
      },
      error: (error) => {
        this.addLog(`✖ Policy '${this.selectedPolicy?.id}' nicht in OPA gefunden`);
      },
    });
  }
  getStoredPolicies() {
    this.http.get(`${API_BASE}/policies`).subscribe({
      next: (result: any) => {
        if (result.success) {
          this.policyFiles = result.files;
          if (this.policyFiles) {
            this.addLog(`✓ ${this.policyFiles.length} Policiy Files vom Server geladen.`);
            this.policyFiles.forEach((policy) => {
              this.loadPolicyFile(policy);
            });
          }
        }
      },
      error: (error) => this.addLog(`✖ Fehler beim Laden: ${error.message}`),
    });
  }
  loadPolicyFile(filename: string) {
    const id = filename.split('.')[0];
    this.http.get<any>(`${API_BASE}/policy/load/${filename}`).subscribe({
      next: (result) => {
        if (result.success) {
          this.selectedPolicy = { id, raw: result.content };
          this.addLog(`✓ Policyfile '${filename}' geladen`);
        }
      },
      error: (error) => this.addLog(`✖ Fehler beim Laden: ${error.message}`),
    });
  }
  deletePolicyFile(filename: string) {
    if (!confirm(`Policy '${filename}' wirklich löschen?`)) {
      return;
    }
    this.http.delete(`${API_BASE}/policy/delete/${filename}`).subscribe({
      next: () => {
        this.addLog(`✓ Policyfile '${filename}' gelöscht`);
        this.getStoredPolicies();
      },
      error: (error) => this.addLog(`✖ Fehler beim Löschen: ${error.message}`),
    });
  }
  savePolicy() {
    if (!this.selectedPolicy?.id.trim() || !this.selectedPolicy.raw.trim()) {
      this.addLog('Policy ID und Defnition angeben!');
      return;
    }
    const filename = `${this.selectedPolicy.id}.rego`;
    this.http
      .post<any>(`${API_BASE}/policy/save`, {
        filename: filename,
        content: this.selectedPolicy.raw,
      })
      .subscribe({
        next: (result) => {
          if (result.success) {
            this.addLog(`✓ Policy gespeichert: ${result.filename}`);
            this.getStoredPolicies();
          }
        },
        error: (error) => this.addLog(`✖ Fehler beim Speichern: ${error.message}`),
      });
  }
  loadPolicyIntoOPA() {
    if (!this.selectedPolicy?.raw.trim()) {
      this.addLog('Keine Policy zum Laden vorhanden');
      return;
    }

    this.opaService.loadPolicy(this.selectedPolicy.raw, this.selectedPolicy.id).subscribe({
      next: (result) => {
        if (result.success) {
          this.addLog(`✓ Policy in OPA geladen: ${this.selectedPolicy?.id}`);
          this.loadPoliciesFromOPA();
        } else {
          this.addLog(`✖ Fehler: ${result.message}`);
        }
      },
      error: (error) => this.addLog(`✖ Fehler beim Laden in OPA: ${error.message}`),
    });
  }
  deletePolicyInOpa(policyId: string) {
    if (!confirm(`Policy '${policyId}' in OPA wirklich löschen?`)) {
      return;
    }
    this.opaService.deletePolicy(policyId).subscribe({
      next: (result) => {
        if (result.success) {
          this.addLog(`✓ Policy in OPA gelöscht: ${policyId}`);
          this.loadPoliciesFromOPA();
        } else {
          this.addLog(`✖ Fehler: ${result.message}`);
        }
      },
      error: (error) => this.addLog(`✖ Fehler: ${error.message}`),
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
          this.dockerStats = (result.stats as any[]).filter((container) =>
            container.name.includes('opa')
          );
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
    if (!this.lastGeneratedData || !this.policies) {
      return;
    }

    this.isTestRunning = true;
    this.testResults = null;
    this.testStatusMessage = 'Apache Bench Test läuft...';

    const testInputs = this.generateTestInputs(this.parallelRequests);
    if (testInputs.length === 0) {
      this.isTestRunning = false;
      return;
    }

    this.addLog(`Starte Apache Bench: ${this.parallelRequests} Requests...`);

    this.http
      .post<any>(`${API_BASE}/opa/load-test-ab`, {
        path: this.testPath,
        inputs: testInputs,
        iterations: this.iterations,
        parallelRequests: this.parallelRequests,
        concurrency: Math.min(this.parallelRequests, 100),
      })
      .subscribe({
        next: (response) => {
          console.log('resp', response);

          if (response.success) {
            this.testResults = response.stats;
            this.addLog(
              `✓ Test abgeschlossen: Erfolgsrate: ${response.stats.successRate}%, Gesamtdauer: ${response.stats.totalDuration}s, Durchschnitt: ${response.stats.avgResponseTime}ms`
            );
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
