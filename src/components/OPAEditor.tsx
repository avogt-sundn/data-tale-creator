import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Play, CheckCircle, XCircle, AlertTriangle, Code, TestTube, FileText } from 'lucide-react';

interface PolicyTemplate {
  name: string;
  description: string;
  policy: string;
  testData: string;
}

const policyTemplates: PolicyTemplate[] = [
  {
    name: "RBAC Authorization",
    description: "Role-based access control for API endpoints",
    policy: `package authz

default allow = false

allow {
    input.method == "GET"
    input.path[0] == "api"
    input.path[1] == "users"
    input.user.role == "admin"
}

allow {
    input.method == "GET"
    input.path[0] == "api"
    input.path[1] == "profile"
    input.user.id == input.path[2]
}`,
    testData: `{
  "method": "GET",
  "path": ["api", "users"],
  "user": {
    "id": "123",
    "role": "admin",
    "department": "engineering"
  }
}`
  },
  {
    name: "Time-based Access",
    description: "Access control based on time windows",
    policy: `package timeauth

import future.keywords.in

default allow = false

allow {
    input.resource == "sensitive_data"
    time.hour(time.now_ns()) >= 9
    time.hour(time.now_ns()) <= 17
    input.user.clearance_level >= 3
}

business_hours {
    hour := time.hour(time.now_ns())
    hour >= 9
    hour <= 17
}`,
    testData: `{
  "resource": "sensitive_data",
  "user": {
    "id": "user123",
    "clearance_level": 4,
    "department": "security"
  },
  "timestamp": "2024-01-15T14:30:00Z"
}`
  },
  {
    name: "Attribute-based Access",
    description: "Complex ABAC policy with multiple attributes",
    policy: `package abac

default allow = false

allow {
    input.action == "read"
    input.resource.type == "document"
    input.user.department == input.resource.owner_department
    input.resource.classification != "top_secret"
}

allow {
    input.action == "write"
    input.resource.type == "document"
    input.user.id == input.resource.owner
    valid_time_window
}

valid_time_window {
    time.hour(time.now_ns()) >= 8
    time.hour(time.now_ns()) <= 18
}`,
    testData: `{
  "action": "read",
  "resource": {
    "type": "document",
    "id": "doc_456",
    "classification": "confidential",
    "owner": "user789",
    "owner_department": "finance"
  },
  "user": {
    "id": "user123",
    "department": "finance",
    "role": "analyst"
  }
}`
  }
];

interface EvaluationResult {
  allow: boolean;
  trace?: string[];
  errors?: string[];
  evaluationTime: number;
}

export const OPAEditor: React.FC = () => {
  const [selectedTemplate, setSelectedTemplate] = useState<PolicyTemplate>(policyTemplates[0]);
  const [policy, setPolicy] = useState(selectedTemplate.policy);
  const [testData, setTestData] = useState(selectedTemplate.testData);
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  const handleTemplateSelect = (template: PolicyTemplate) => {
    setSelectedTemplate(template);
    setPolicy(template.policy);
    setTestData(template.testData);
    setResult(null);
  };

  const evaluatePolicy = async () => {
    setIsEvaluating(true);
    
    // Simulate policy evaluation with realistic delays and results
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200));
    
    try {
      const inputData = JSON.parse(testData);
      
      // Mock evaluation logic based on policy content
      let allow = false;
      const trace: string[] = [];
      const evaluationTime = Math.round((Math.random() * 50 + 10) * 100) / 100;

      if (policy.includes('input.user.role == "admin"') && inputData.user?.role === 'admin') {
        allow = true;
        trace.push('✓ User has admin role');
        trace.push('✓ Access granted via admin rule');
      } else if (policy.includes('input.user.department == input.resource.owner_department')) {
        if (inputData.user?.department === inputData.resource?.owner_department) {
          allow = true;
          trace.push('✓ User department matches resource owner department');
          trace.push('✓ Resource classification check passed');
        } else {
          trace.push('✗ User department does not match resource owner department');
        }
      } else if (policy.includes('time.hour')) {
        const currentHour = new Date().getHours();
        if (currentHour >= 9 && currentHour <= 17) {
          allow = inputData.user?.clearance_level >= 3;
          trace.push(`✓ Current time (${currentHour}:00) is within business hours`);
          trace.push(allow ? '✓ User clearance level sufficient' : '✗ User clearance level insufficient');
        } else {
          trace.push(`✗ Current time (${currentHour}:00) is outside business hours`);
        }
      }

      setResult({
        allow,
        trace,
        evaluationTime
      });
    } catch (error) {
      setResult({
        allow: false,
        errors: ['Invalid JSON in test data'],
        evaluationTime: 0
      });
    }
    
    setIsEvaluating(false);
  };

  return (
    <div className="min-h-screen bg-gradient-subtle p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-enterprise-primary">OPA Policy Editor</h1>
          <p className="text-xl text-muted-foreground">
            Write, test, and validate Open Policy Agent rules
          </p>
        </div>

        {/* Policy Templates */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Policy Templates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {policyTemplates.map((template, index) => (
                <Card
                  key={index}
                  className={`cursor-pointer transition-all hover:shadow-elegant ${
                    selectedTemplate.name === template.name 
                      ? 'ring-2 ring-enterprise-primary bg-enterprise-accent/10' 
                      : 'hover:bg-accent/50'
                  }`}
                  onClick={() => handleTemplateSelect(template)}
                >
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-enterprise-primary mb-2">{template.name}</h3>
                    <p className="text-sm text-muted-foreground">{template.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Policy Editor */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                Rego Policy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={policy}
                onChange={(e) => setPolicy(e.target.value)}
                placeholder="Write your Rego policy here..."
                className="font-mono text-sm min-h-[400px] resize-none"
              />
            </CardContent>
          </Card>

          {/* Test Data & Results */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TestTube className="h-5 w-5" />
                  Test Data
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={testData}
                  onChange={(e) => setTestData(e.target.value)}
                  placeholder="Enter test JSON data..."
                  className="font-mono text-sm min-h-[200px] resize-none"
                />
                <Button 
                  onClick={evaluatePolicy}
                  disabled={isEvaluating}
                  className="w-full bg-gradient-primary hover:opacity-90"
                  size="lg"
                >
                  <Play className="h-4 w-4 mr-2" />
                  {isEvaluating ? 'Evaluating...' : 'Evaluate Policy'}
                </Button>
              </CardContent>
            </Card>

            {/* Results */}
            {result && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {result.allow ? (
                      <CheckCircle className="h-5 w-5 text-success" />
                    ) : (
                      <XCircle className="h-5 w-5 text-destructive" />
                    )}
                    Evaluation Result
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge 
                      variant={result.allow ? "default" : "destructive"}
                      className={result.allow ? "bg-success hover:bg-success/80" : ""}
                    >
                      {result.allow ? "ALLOW" : "DENY"}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {result.evaluationTime}ms
                    </span>
                  </div>

                  {result.trace && result.trace.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold">Evaluation Trace:</h4>
                      <div className="bg-muted/30 rounded-lg p-3 space-y-1">
                        {result.trace.map((step, index) => (
                          <div key={index} className="font-mono text-sm flex items-center gap-2">
                            {step.startsWith('✓') ? (
                              <CheckCircle className="h-3 w-3 text-success flex-shrink-0" />
                            ) : (
                              <XCircle className="h-3 w-3 text-destructive flex-shrink-0" />
                            )}
                            <span>{step.substring(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.errors && result.errors.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-destructive flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Errors:
                      </h4>
                      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                        {result.errors.map((error, index) => (
                          <div key={index} className="text-sm text-destructive">
                            {error}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Policy Documentation */}
        <Card>
          <CardHeader>
            <CardTitle>Policy Documentation</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="syntax" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="syntax">Rego Syntax</TabsTrigger>
                <TabsTrigger value="functions">Built-in Functions</TabsTrigger>
                <TabsTrigger value="examples">Examples</TabsTrigger>
              </TabsList>
              
              <TabsContent value="syntax" className="space-y-4">
                <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                  <h4 className="font-semibold">Basic Rego Syntax:</h4>
                  <div className="font-mono text-sm space-y-1">
                    <div><code>package authz</code> - Package declaration</div>
                    <div><code>default allow = false</code> - Default decision</div>
                    <div><code>allow {'{ ... }'}</code> - Rule definition</div>
                    <div><code>input.user.role</code> - Input data access</div>
                    <div><code>==, !=, {'>'}, {'<'}</code> - Comparison operators</div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="functions" className="space-y-4">
                <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                  <h4 className="font-semibold">Common Built-in Functions:</h4>
                  <div className="font-mono text-sm space-y-1">
                    <div><code>time.now_ns()</code> - Current timestamp</div>
                    <div><code>time.hour(ns)</code> - Extract hour from timestamp</div>
                    <div><code>startswith(string, prefix)</code> - String prefix check</div>
                    <div><code>regex.match(pattern, string)</code> - Pattern matching</div>
                    <div><code>count(collection)</code> - Collection size</div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="examples" className="space-y-4">
                <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                  <h4 className="font-semibold">Common Patterns:</h4>
                  <div className="font-mono text-sm space-y-1">
                    <div><code>{`input.user.role in {"admin", "manager"}`}</code> - Role check</div>
                    <div><code>input.resource.owner == input.user.id</code> - Ownership</div>
                    <div><code>regex.match("^/api/", input.path)</code> - Path matching</div>
                    <div><code>count(input.user.permissions) {'>'} 0</code> - Permission check</div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};