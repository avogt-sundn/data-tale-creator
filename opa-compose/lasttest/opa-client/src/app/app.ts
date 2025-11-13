import { CommonModule, formatNumber } from '@angular/common';
import { Component, inject, LOCALE_ID, signal, ViewEncapsulation } from '@angular/core';
import { Accordion } from './components/accordion/accordion';
import { API_BASE, OPA_BASE, Opa } from './opa';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ChartComponent, ChartDataPoint } from './components/chart';
import { NgxJsonViewerModule } from 'ngx-json-viewer';
export interface Policycontent {
  id: string;
  raw: string;
}
@Component({
  selector: 'app-root',
  imports: [CommonModule, FormsModule, Accordion, ChartComponent, NgxJsonViewerModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  encapsulation: ViewEncapsulation.None,
})
export class App {
  protected readonly title = signal('opa-client');
  backendStatus: 'connected' | 'disconnected' | 'checking' = 'checking';
  opaStatus: 'connected' | 'disconnected' | 'checking' = 'checking';
  statusMessage = '';
  teamCount = 6000;
  members = 10;
  taskCount = 500;
  lastGeneratedData: any = null;
  statusLog: string[] = [];

  policyFiles: string[] = [];
  policies: Policycontent[] = [];
  policyId = '';

  dockerStats: any[] = [];
  dockerStatsInterval: any;

  policyPath = 'drv/abac/allow';
  parallelRequests = 2000;
  iterations = 1;
  isTestRunning = false;
  apacheBenchtResults: any = null;
  opaBenchResults: any = null;
  testProgress = 0;
  benchTool: 'apache' | 'opa' = 'opa';

  queryResult: any = null;
  queryPath = 'drv/queries/tasks_by_user';
  teamsInOpa = 0;
  tasksInOpa = 0;
  usersInOpa = 0;

  editorContent = '';

  foundInOPA: Policycontent | undefined;
  foundInFS: string | undefined;
  jsonInput: any = {};
  jsonInputString = '';
  lockUI = false;

  chartData: ChartDataPoint[] = [];
  analyticsSpan = 5;
  dockerstatsIntSpan = 5;
  policySubtitle = '';
  treeviewLimit = 10;
  responseItemLimit = 200;
  responseSizeLimit = 50 * 1024;
  queryDataLock = false;
  treeviewDepth = 0;
  queryResultDepth = 3;
  resultSize = 0;
  dataStructure: any = null;
  e2eFlag = true;
  benchmemFlag = true;

  private opaService = inject(Opa);
  private http = inject(HttpClient);
  private local = inject(LOCALE_ID);

  private addLog(message: string) {
    const timestamp = new Date().toLocaleTimeString('de-DE');
    this.statusLog.unshift(`${timestamp} - ${message}`);
  }
  ngOnInit() {
    this.checkBackendHealth();
    this.checkOpaConnection();
    this.getStoredPolicies();
    // this.queryOpaDataOverview();
    this.queryOpaData();
    this.loadPoliciesFromOPA();
    this.startDockerStatsPolling();
    // this.jsonInputString = JSON.stringify(this.jsonInput, null, 2);
  }
  checkBackendHealth() {
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
        this.dataStructure = null;
        this.loadPoliciesFromOPA();
        // this.queryOpaDataOverview();
        this.queryOpaData();
        this.loadDockerStats();
      },
      error: (error) => {
        this.addLog(`✗ Fehler beim Restart: ${error.message}`);
      },
    });
  }
  checkOpaConnection() {
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
        this.statusMessage = 'OPA Server nicht erreichbar';
      },
    });
  }
  generateData() {
    this.lockUI = true;
    this.addLog('Generiere Daten...');
    this.http
      .post<any>(`${API_BASE}/generate`, {
        teamCount: this.teamCount,
        members: this.members,
        taskCount: this.taskCount,
      })
      .subscribe({
        next: (result) => {
          if (result.success) {
            this.lastGeneratedData = result.data;
            const filename = 'data.json';
            this.lockUI = false;
            this.http
              .post(`${API_BASE}/data/save`, {
                filename: filename,
                data: result.data,
              })
              .subscribe({
                next: (saveResult: any) => {
                  if (saveResult.success) {
                    this.lockUI = false;
                    const sizeMsg = saveResult.size ? `(${saveResult.size} MB)` : '';
                    this.addLog(`✓ Daten gespeichert: ${filename} ${sizeMsg}`);
                  }
                },
                error: (error) => {
                  this.lockUI = false;
                  this.addLog(`✖ Fehler beim Speichern: ${error.message}`);
                },
              });
          }
        },
        error: (error) => {
          this.lockUI = false;
          this.addLog(`✖ Fehler beim Generieren: ${error.message}`);
        },
      });
  }
  loadDataIntoOPA() {
    if (!this.lastGeneratedData || !this.lastGeneratedData.tasks || !this.lastGeneratedData.teams) {
      this.addLog('Keine Daten zum Laden vorhanden');
      return;
    }
    this.addLog('Lade Daten in OPA...');
    this.lockUI = true;
    this.http
      .post<any>(`${API_BASE}/opa/load-data`, {
        data: this.lastGeneratedData,
      })
      .subscribe({
        next: (result) => {
          if (result.success) {
            this.addLog('✓ Daten in OPA geladen');
            this.lockUI = false;
            this.setCounters();
          } else {
            this.addLog(`✖ Fehler: ${result.message}`);
            this.lockUI = false;
          }
        },
        error: (error) => {
          this.lockUI = false;
          this.addLog(`✖ Fehler beim Laden in OPA: ${error.message}`);
        },
      });
  }
  queryOpaDataOverview() {
    this.teamsInOpa = 0;
    this.usersInOpa = 0;
    this.tasksInOpa = 0;
    this.http.get<any>(`${OPA_BASE}/v1/data/queries/overview`).subscribe({
      next: (data) => {
        if (data.result) {
          this.teamsInOpa = data.result.teams;
          this.tasksInOpa = data.result.tasks;
          this.usersInOpa = data.result.users;
        }
      },
    });
  }
  private cloneDeep<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }
  setCounters() {
    if (!this.lastGeneratedData || !this.lastGeneratedData.tasks || !this.lastGeneratedData.teams) {
      this.dataStructure = {};
      this.tasksInOpa = 0;
      this.teamsInOpa = 0;
      this.usersInOpa = 0;
      return;
    }

    this.tasksInOpa = Object.keys(this.lastGeneratedData.tasks).length;
    this.teamsInOpa = Object.keys(this.lastGeneratedData.teams).length;

    if (this.teamsInOpa > 0) {
      const firstTeam = Object.values(this.lastGeneratedData.teams)[0] as any;
      if (firstTeam?.members) {
        const membersCount = Object.keys(firstTeam.members).length;
        this.usersInOpa = membersCount * this.teamsInOpa;
      } else {
        this.usersInOpa = 0;
      }
    } else {
      this.usersInOpa = 0;
    }

    const dataCopy = this.cloneDeep(this.lastGeneratedData);

    if (dataCopy.tasks) {
      this.truncateObject(dataCopy.tasks);
    }
    if (dataCopy.teams) {
      this.truncateObject(dataCopy.teams);
    }
    this.truncateNestedArrays(dataCopy, 0);

    this.dataStructure = dataCopy;

    const tasksObj = dataCopy.tasks || {};
    const teamsObj = dataCopy.teams || {};
  }

  private truncateObject(obj: any): void {
    const keys = Object.keys(obj);
    if (keys.length > this.treeviewLimit) {
      const originalSize = keys.length;
      const keysToDelete = keys.slice(this.treeviewLimit);
      keysToDelete.forEach((key) => delete obj[key]);
      obj['_truncated'] = {
        _original_size: originalSize,
        _limit: this.treeviewLimit,
      };
    }
  }

  private truncateNestedArrays(obj: any, depth: number, maxDepth: number = 5): void {
    if (depth >= maxDepth || obj == null || typeof obj !== 'object') {
      return;
    }

    Object.values(obj).forEach((value) => {
      if (Array.isArray(value)) {
        if (value.length > this.treeviewLimit) {
          const truncated = {
            _truncated: true,
            _original_size: `${value.length}`,
            _limit: `${this.treeviewLimit}`,
          };
          value.splice(this.treeviewLimit);
          value.push(truncated);
        }
        value.forEach((item) => {
          if (typeof item === 'object' && item !== null) {
            this.truncateNestedArrays(item, depth + 1, maxDepth);
          }
        });
      } else if (typeof value === 'object' && value !== null) {
        this.truncateNestedArrays(value, depth + 1, maxDepth);
      }
    });
  }
  queryOpaData() {
    this.teamsInOpa = 0;
    this.usersInOpa = 0;
    this.tasksInOpa = 0;
    this.addLog('Lade OPA Datenbank...');
    this.lockUI = true;
    this.http.get<any>(`${OPA_BASE}/v1/data`).subscribe({
      next: (data) => {
        if (data.result) {
          this.lockUI = false;
          this.lastGeneratedData = data.result;
          this.setCounters();
          this.addLog(
            `✓ OPA Daten geladeen. Teams: ${formatNumber(
              this.teamsInOpa,
              this.local
            )}, User: ${formatNumber(this.usersInOpa, this.local)}, Aufgaben: ${formatNumber(
              this.tasksInOpa,
              this.local
            )}`
          );
        }
      },
      error: (error) => {
        this.lockUI = false;
        this.addLog(`✖ Fehler bei Laden der OPA Datenbank ${error.message}`);
      },
    });
  }
  queryData() {
    try {
      this.jsonInput = JSON.parse(this.jsonInputString);
    } catch (e) {
      this.addLog('✖ Query DB fehlerhafte JSON');
      return;
    }
    if (this.queryPath === '') return;
    this.queryDataLock = true;
    this.http.post<any>(`${OPA_BASE}/v1/data/${this.queryPath}`, this.jsonInput).subscribe({
      next: (data) => {
        this.queryDataLock = false;
        this.queryResult = data.result;
        if (typeof this.queryResult === 'boolean') {
          this.queryResult = {
            allow: data.result,
          };
        }

        const itemCount = Array.isArray(this.queryResult) ? this.queryResult.length : 1;
        // this.addLog(
        //   `✓ Query Results (${this.queryPath.split('/').pop()}): ${formatNumber(
        //     itemCount,
        //     this.local
        //   )} Items`
        // );
        if (Array.isArray(this.queryResult) && this.queryResult.length > this.responseItemLimit) {
          const restCount = this.queryResult.length - this.responseItemLimit;
          this.queryResult.splice(this.responseItemLimit);
          this.queryResult.push({ _truncated: true, _hidden: restCount });
          this.resultSize = restCount;
        } else {
          this.resultSize = new Blob([JSON.stringify(this.queryResult)]).size;

          if (this.resultSize > this.responseSizeLimit) {
            this.queryResult = {
              _error: 'Response zu groß',
              _size: `${Math.round(this.resultSize / 1024)} KB`,
              _limit: `${Math.round(this.responseSizeLimit / 1024)} KB`,
            };
          }
        }
      },
      error: (error) => {
        this.queryDataLock = false;
        this.addLog(`✖ Fehler bei Anfrage auf ${this.queryPath}, ${error.message}`);
      },
    });
  }
  loadPoliciesFromOPA() {
    this.http.get<any>(`${OPA_BASE}/v1/policies`).subscribe({
      next: (data) => {
        if (data.result) {
          this.policies = data.result as Policycontent[];
          this.policies.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
          this.checkPolicies();
          this.policySubtitle = this.policies.length
            ? this.policies.map((p) => p.id).join(' | ')
            : 'keine Policies geladen!';
        }
      },
      error: (error) => {
        this.addLog(`✖ Policy '${this.policyId}' nicht in OPA gefunden`);
      },
    });
  }
  getStoredPolicies() {
    this.http.get(`${API_BASE}/policies`).subscribe({
      next: (result: any) => {
        if (result.success) {
          this.policyFiles = result.files;
          if (this.policyFiles) {
            this.checkPolicies();
            this.addLog(`✓ ${this.policyFiles.length} Policiy Files vom Server geladen.`);
          }
        }
      },
      error: (error) => this.addLog(`✖ Fehler beim Laden: ${error.message}`),
    });
  }
  editPolicy(policy: string) {
    if (policy.includes('.rego')) {
      this.loadPolicyFile(policy);
    } else {
      this.policyId = policy;
      this.checkPolicies();
      if (this.foundInOPA) {
        this.editorContent = this.foundInOPA.raw;
      }
    }
  }
  loadPolicyFile(filename: string) {
    const id = filename.replace(/\.rego$/, '');
    this.http.get<any>(`${API_BASE}/policy/load/${filename}`).subscribe({
      next: (result) => {
        if (result.success) {
          this.policyId = id;
          this.editorContent = result.content;
          this.checkPolicies();
          // this.addLog(`✓ Policyfile '${filename}' geladen`);
        }
      },
      error: (error) => this.addLog(`✖ Fehler beim Laden: ${error.message}`),
    });
  }
  deletePolicyFile(filename: string) {
    if (!filename.endsWith('.rego')) {
      filename = filename + '.rego';
    }
    if (!confirm(`Policy Datei '${filename}' wirklich löschen?`)) {
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
    if (!this.policyId.trim() || !this.editorContent.trim()) {
      this.addLog('Policy ID und Defnition angeben!');
      return;
    }

    const filename = `${this.policyId}.rego`;
    this.http
      .post<any>(`${API_BASE}/policy/save`, {
        filename: filename,
        content: this.editorContent,
      })
      .subscribe({
        next: (result) => {
          if (result.success) {
            this.addLog(`✓ Policy gespeichert: ${this.policyId}.rego`);
            this.getStoredPolicies();
          }
        },
        error: (error) => this.addLog(`✖ Fehler beim Speichern: ${error.message}`),
      });
  }
  loadPolicyIntoOPA() {
    // TODO: "opa check" zum Validieren der Policy
    if (!this.editorContent.trim()) {
      this.addLog('Keine Policy zum Laden vorhanden');
      return;
    }
    this.opaService.loadPolicy(this.editorContent, this.policyId).subscribe({
      next: (result) => {
        const message = result.message as any;
        if (result.success) {
          this.addLog(`✓ Policy in OPA geladen: ${this.policyId}`);
          this.loadPoliciesFromOPA();
        } else {
          this.addLog(`✖ Fehler: ${message.error}`);
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
  checkPolicies() {
    this.foundInFS = this.policyFiles.find((policyfile) => policyfile === this.policyId + '.rego');
    this.foundInOPA = this.policies.find((policy) => policy.id === this.policyId);
  }
  startDockerStatsPolling() {
    this.loadDockerStats();
    this.dockerStatsInterval = setInterval(() => {
      this.checkBackendHealth();
      this.checkOpaConnection();
      this.loadDockerStats();
    }, this.dockerstatsIntSpan * 1000);
  }
  loadDockerStats() {
    this.opaService.getDockerStats().subscribe({
      next: (result) => {
        if (result.success) {
          this.dockerStats = (result.stats as any[]).filter((c) => c.name.includes('-opa')); // um beide container zu sehen nach 'opa' statt '-opa' matchen
          if (this.dockerStats.length > 0) {
            const container = this.dockerStats.find((c) => c.name.includes('-opa'));
            const timestamp = new Date().toLocaleTimeString('de-DE');
            const cpuValue = parseFloat(container?.cpu?.replace('%', '') || '0');
            const memUsage = container?.memUsage || '0B / 0B';

            let memGB = 0;
            const memValue = memUsage.split('/')[0].trim();

            if (memValue.includes('GiB')) {
              memGB = parseFloat(memValue);
            } else if (memValue.includes('MiB')) {
              memGB = parseFloat(memValue) / 1024;
            }
            this.chartData = [
              ...this.chartData,
              {
                timestamp,
                values: { 'CPU %': cpuValue, 'Memory GB': memGB },
              },
            ];
            if (this.chartData.length > (this.analyticsSpan * 60) / this.dockerstatsIntSpan) {
              this.chartData = this.chartData.slice(
                -(this.analyticsSpan * 60) / this.dockerstatsIntSpan
              );
            }
          }
        }
      },
    });
  }
  generateInput(type: 'allow' | 'uid' | 'attr' = 'uid') {
    this.jsonInputString = JSON.stringify(this.generateTestInputs(1, type)[0], null, 2);
  }
  generateTestInputs(count: number, type: 'allow' | 'uid' | 'attr' = 'allow'): any[] {
    if (!this.lastGeneratedData || !this.lastGeneratedData.teams || !this.lastGeneratedData.tasks) {
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
      const matchingTasks = tasks.filter(
        (t) => t.attributes.aufgabenart === user.attributes.aufgabenart
      );
      const task =
        matchingTasks.length > 0 && Math.random() > 0.5
          ? matchingTasks[Math.floor(Math.random() * matchingTasks.length)]
          : tasks[Math.floor(Math.random() * tasks.length)];

      const action = actions[Math.floor(Math.random() * actions.length)];
      switch (type) {
        case 'allow':
          inputs.push({
            input: {
              user_role: user.role,
              user_attributes: user.attributes.aufgabenart,
              task_id: task.id,
              task_attributes: task.attributes.aufgabenart,
              action: action,
            },
          });
          break;
        case 'attr':
          inputs.push({
            input: {
              aufgabenart: user.attributes.aufgabenart,
            },
          });
          break;
        default:
          inputs.push({
            input: {
              user_id: user.id,
            },
          });
      }
    }
    return inputs;
  }
  apacheBenchTest() {
    if (this.teamsInOpa === 0 || this.tasksInOpa === 0 || !this.policies) {
      return;
    }
    this.isTestRunning = true;
    this.apacheBenchtResults = null;
    this.opaBenchResults = null;

    const testInputs = this.generateTestInputs(Math.max(this.parallelRequests, this.iterations));
    if (testInputs.length === 0) {
      this.isTestRunning = false;
      return;
    }
    this.addLog(
      `Starte Apache Bench: ${this.parallelRequests} Requests, ${this.iterations} Iterationen.`
    );
    this.http
      .post<any>(`${API_BASE}/opa/load-test-ab`, {
        path: this.policyPath,
        inputs: testInputs,
        iterations: this.iterations,
        parallelRequests: this.parallelRequests,
        concurrency: Math.min(this.parallelRequests, 100),
      })
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.apacheBenchtResults = response.stats;
            this.addLog(
              `✓ Test abgeschlossen: Erfolgsrate: ${response.stats.successRate}%, Gesamtdauer: ${response.stats.totalDuration}s, Durchschnitt: ${response.stats.avgResponseTime}ms`
            );
          }
          this.isTestRunning = false;
          // setTimeout(() => {
          //   const el = document.getElementById('resultsContainer');
          //   if (el) {
          //     console.log('res defined');
          //     el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          //   }
          // }, 50);
        },
        error: (error) => {
          this.addLog(`✖ Apache Bench Fehler: ${error.message}`);
          this.isTestRunning = false;
        },
      });
  }
  opaBenchmark() {
    if (!this.lastGeneratedData?.teams || !this.lastGeneratedData?.tasks) {
      this.addLog('✖ Keine Daten für Benchmark vorhanden');
      return;
    }

    this.isTestRunning = true;
    this.opaBenchResults = null;
    this.apacheBenchtResults = null;
    this.addLog(`Starte OPA Bench für ${this.policyPath}...`);

    const testInputs = this.generateTestInputs(1, 'allow');
    if (testInputs.length === 0) {
      this.isTestRunning = false;
      return;
    }

    const benchmarkInput = testInputs[0].input;

    this.opaService
      .opaBenchmark({
        policyPath: this.policyPath.replaceAll('/', '.'),
        input: benchmarkInput,
        e2e: this.e2eFlag ? '--e2e' : '',
        mem: this.benchmemFlag ? '--benchmem' : '',
      })
      .subscribe({
        next: (result) => {
          this.isTestRunning = false;
          if (result.success) {
            this.opaBenchResults = result.results;
            this.addLog(
              `✓ OPA Bench abgeschlossen: ${result.results?.opsPerSecond.toLocaleString()} ops/sec, ` +
                `${result.results?.nsPerOp.toFixed(2)} ns/op`
            );
          } else {
            this.addLog(`✖ OPA Bench Fehler: ${result.message}`);
          }
        },
        error: (error) => {
          this.isTestRunning = false;
          this.addLog(`✖ OPA Bench Fehler: ${error.message}`);
        },
      });
  }

  ngOnDestroy() {
    if (this.dockerStatsInterval) {
      clearInterval(this.dockerStatsInterval);
    }
  }
}
