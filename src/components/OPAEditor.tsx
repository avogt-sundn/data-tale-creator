import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Code, Play, FileText, CheckCircle, XCircle, AlertCircle } from "lucide-react";

const policyTemplates = {
  "basic-rbac": `package authz

default allow = false

allow {
    user_has_role[role]
    role_permissions[role][_] == input.action
}

user_has_role[role] {
    role := input.user.roles[_]
}

role_permissions := {
    "admin": ["read", "write", "delete"],
    "editor": ["read", "write"],
    "viewer": ["read"]
}`,
  
  "time-based": `package authz

default allow = false

allow {
    input.user.role == "employee"
    is_business_hours
}

is_business_hours {
    hour := time.clock(time.now_ns())[0]
    hour >= 9
    hour < 17
}`,

  "resource-owner": `package authz

default allow = false

allow {
    input.user.id == input.resource.owner
}

allow {
    input.user.role == "admin"
}

allow {
    input.user.department == input.resource.department
    input.action == "read"
}`
};

const testScenarios = {
  "admin-access": {
    input: {
      user: { id: "u1", role: "admin", roles: ["admin"] },
      action: "delete",
      resource: { id: "r1", owner: "u2" }
    }
  },
  "editor-access": {
    input: {
      user: { id: "u2", role: "editor", roles: ["editor"] },
      action: "write",
      resource: { id: "r1", owner: "u1" }
    }
  },
  "viewer-access": {
    input: {
      user: { id: "u3", role: "viewer", roles: ["viewer"] },
      action: "delete",
      resource: { id: "r1", owner: "u1" }
    }
  }
};

interface EvaluationResult {
  allow: boolean;
  errors?: string[];
  duration?: string;
}

export const OPAEditor = () => {
  const [policy, setPolicy] = useState(policyTemplates["basic-rbac"]);
  const [selectedTemplate, setSelectedTemplate] = useState("basic-rbac");
  const [testInput, setTestInput] = useState(JSON.stringify(testScenarios["admin-access"].input, null, 2));
  const [selectedScenario, setSelectedScenario] = useState("admin-access");
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  const handleTemplateChange = (template: string) => {
    setSelectedTemplate(template);
    setPolicy(policyTemplates[template as keyof typeof policyTemplates]);
  };

  const handleScenarioChange = (scenario: string) => {
    setSelectedScenario(scenario);
    setTestInput(JSON.stringify(testScenarios[scenario as keyof typeof testScenarios].input, null, 2));
  };

  const evaluatePolicy = () => {
    setIsEvaluating(true);
    
    // Simulate OPA evaluation (in a real implementation, this would call OPA API)
    setTimeout(() => {
      try {
        const input = JSON.parse(testInput);
        
        // Simple mock evaluation logic
        let allow = false;
        const errors: string[] = [];
        
        if (selectedTemplate === "basic-rbac") {
          const userRoles = input.user?.roles || [];
          const action = input.action;
          
          if (userRoles.includes("admin")) {
            allow = true;
          } else if (userRoles.includes("editor") && ["read", "write"].includes(action)) {
            allow = true;
          } else if (userRoles.includes("viewer") && action === "read") {
            allow = true;
          }
        } else if (selectedTemplate === "resource-owner") {
          if (input.user?.role === "admin" || input.user?.id === input.resource?.owner) {
            allow = true;
          } else if (input.user?.department === input.resource?.department && input.action === "read") {
            allow = true;
          }
        }
        
        setResult({
          allow,
          errors: errors.length > 0 ? errors : undefined,
          duration: "2.3ms"
        });
      } catch (error) {
        setResult({
          allow: false,
          errors: ["Invalid JSON input"]
        });
      }
      
      setIsEvaluating(false);
    }, 500);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Code className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">OPA Rule Designer</h2>
        <Badge variant="secondary">Open Policy Agent</Badge>
      </div>
      
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Policy Editor */}
        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Policy Editor</h3>
              <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic-rbac">Basic RBAC</SelectItem>
                  <SelectItem value="time-based">Time-based Access</SelectItem>
                  <SelectItem value="resource-owner">Resource Owner</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Textarea
              value={policy}
              onChange={(e) => setPolicy(e.target.value)}
              className="font-mono text-sm min-h-[400px]"
              placeholder="Write your Rego policy here..."
            />
          </Card>
          
          <Card className="p-4 bg-info/5 border-info/20">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-info" />
              <h4 className="font-medium text-info">Rego Policy Language</h4>
            </div>
            <p className="text-sm text-muted-foreground">
              Write policies using Rego syntax. Use <code className="bg-muted px-1 rounded">input</code> to access request data,
              define rules with conditions, and set <code className="bg-muted px-1 rounded">allow</code> decisions.
            </p>
          </Card>
        </div>
        
        {/* Test & Evaluation */}
        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Test Input</h3>
              <Select value={selectedScenario} onValueChange={handleScenarioChange}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select scenario" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin-access">Admin Access</SelectItem>
                  <SelectItem value="editor-access">Editor Access</SelectItem>
                  <SelectItem value="viewer-access">Viewer Access</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Textarea
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              className="font-mono text-sm min-h-[200px]"
              placeholder="Enter test JSON input..."
            />
            
            <Button 
              onClick={evaluatePolicy} 
              disabled={isEvaluating}
              className="w-full mt-4"
            >
              <Play className="h-4 w-4 mr-2" />
              {isEvaluating ? "Evaluating..." : "Evaluate Policy"}
            </Button>
          </Card>
          
          {/* Results */}
          {result && (
            <Card className="p-4">
              <h3 className="text-lg font-semibold mb-4">Evaluation Result</h3>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {result.allow ? (
                    <CheckCircle className="h-5 w-5 text-success" />
                  ) : (
                    <XCircle className="h-5 w-5 text-destructive" />
                  )}
                  <span className={`font-medium ${result.allow ? 'text-success' : 'text-destructive'}`}>
                    {result.allow ? 'ALLOW' : 'DENY'}
                  </span>
                  {result.duration && (
                    <Badge variant="secondary" className="ml-auto">
                      {result.duration}
                    </Badge>
                  )}
                </div>
                
                {result.errors && result.errors.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-warning" />
                      <span className="font-medium text-warning">Errors</span>
                    </div>
                    {result.errors.map((error, index) => (
                      <p key={index} className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                        {error}
                      </p>
                    ))}
                  </div>
                )}
                
                <div className="pt-2 border-t">
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p><strong>Policy:</strong> {selectedTemplate}</p>
                    <p><strong>Scenario:</strong> {selectedScenario}</p>
                  </div>
                </div>
              </div>
            </Card>
          )}
          
          <Card className="p-4 bg-warning/5 border-warning/20">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4 text-warning" />
              <h4 className="font-medium text-warning">Testing Guidelines</h4>
            </div>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Test with different user roles and permissions</li>
              <li>Verify edge cases and boundary conditions</li>
              <li>Check policy performance with complex rules</li>
              <li>Validate input structure matches policy expectations</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
};