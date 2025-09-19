import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, CheckCircle, Code, FileText, Play, XCircle } from "lucide-react";
import { useState } from "react";
const exampleData = {

};

const policyTemplates = {
    "basic-rbac": `
package app.abac

default allow := false

allow if user_is_owner

allow if {
	user_is_employee
	action_is_read
}

allow if {
	user_is_employee
	user_is_senior
	action_is_update
}

allow if {
	user_is_customer
	action_is_read
	not pet_is_adopted
}

user_is_owner if data.user_attributes[input.user].title == "owner"

user_is_employee if data.user_attributes[input.user].title == "employee"

user_is_customer if data.user_attributes[input.user].title == "customer"

user_is_senior if data.user_attributes[input.user].tenure > 8

action_is_read if input.action == "read"

action_is_update if input.action == "update"

pet_is_adopted if data.pet_attributes[input.resource].adopted == true
`
};

const testScenarios = {
    "owner-full-access": {
        input: {
            user: "alice",
            action: "update",
            resource: "dog123"
        },
        data: {
            user_attributes: {
                alice: { tenure: 20, title: "owner" },
                bob: { tenure: 15, title: "employee" },
                eve: { tenure: 5, title: "employee" },
                dave: { tenure: 5, title: "customer" }
            },
            pet_attributes: {
                dog123: { adopted: true, age: 2, breed: "terrier", name: "toto" },
                dog456: { adopted: false, age: 3, breed: "german-shepherd", name: "rintintin" },
                dog789: { adopted: false, age: 2, breed: "collie", name: "lassie" },
                cat123: { adopted: false, age: 1, breed: "fictitious", name: "cheshire" }
            }
        }
    },
    "senior-employee-update": {
        input: {
            user: "bob",
            action: "update", 
            resource: "dog456"
        },
        data: {
            user_attributes: {
                alice: { tenure: 20, title: "owner" },
                bob: { tenure: 15, title: "employee" },
                eve: { tenure: 5, title: "employee" },
                dave: { tenure: 5, title: "customer" }
            },
            pet_attributes: {
                dog123: { adopted: true, age: 2, breed: "terrier", name: "toto" },
                dog456: { adopted: false, age: 3, breed: "german-shepherd", name: "rintintin" },
                dog789: { adopted: false, age: 2, breed: "collie", name: "lassie" },
                cat123: { adopted: false, age: 1, breed: "fictitious", name: "cheshire" }
            }
        }
    },
    "junior-employee-read": {
        input: {
            user: "eve",
            action: "read",
            resource: "dog789"
        },
        data: {
            user_attributes: {
                alice: { tenure: 20, title: "owner" },
                bob: { tenure: 15, title: "employee" },
                eve: { tenure: 5, title: "employee" },
                dave: { tenure: 5, title: "customer" }
            },
            pet_attributes: {
                dog123: { adopted: true, age: 2, breed: "terrier", name: "toto" },
                dog456: { adopted: false, age: 3, breed: "german-shepherd", name: "rintintin" },
                dog789: { adopted: false, age: 2, breed: "collie", name: "lassie" },
                cat123: { adopted: false, age: 1, breed: "fictitious", name: "cheshire" }
            }
        }
    },
    "customer-adopted-pet": {
        input: {
            user: "dave",
            action: "read",
            resource: "dog123"
        },
        data: {
            user_attributes: {
                alice: { tenure: 20, title: "owner" },
                bob: { tenure: 15, title: "employee" },
                eve: { tenure: 5, title: "employee" },
                dave: { tenure: 5, title: "customer" }
            },
            pet_attributes: {
                dog123: { adopted: true, age: 2, breed: "terrier", name: "toto" },
                dog456: { adopted: false, age: 3, breed: "german-shepherd", name: "rintintin" },
                dog789: { adopted: false, age: 2, breed: "collie", name: "lassie" },
                cat123: { adopted: false, age: 1, breed: "fictitious", name: "cheshire" }
            }
        }
    },
    "customer-available-pet": {
        input: {
            user: "dave",
            action: "read",
            resource: "cat123"
        },
        data: {
            user_attributes: {
                alice: { tenure: 20, title: "owner" },
                bob: { tenure: 15, title: "employee" },
                eve: { tenure: 5, title: "employee" },
                dave: { tenure: 5, title: "customer" }
            },
            pet_attributes: {
                dog123: { adopted: true, age: 2, breed: "terrier", name: "toto" },
                dog456: { adopted: false, age: 3, breed: "german-shepherd", name: "rintintin" },
                dog789: { adopted: false, age: 2, breed: "collie", name: "lassie" },
                cat123: { adopted: false, age: 1, breed: "fictitious", name: "cheshire" }
            }
        }
    },
    "unauthorized-action": {
        input: {
            user: "dave",
            action: "update",
            resource: "dog456"
        },
        data: {
            user_attributes: {
                alice: { tenure: 20, title: "owner" },
                bob: { tenure: 15, title: "employee" },
                eve: { tenure: 5, title: "employee" },
                dave: { tenure: 5, title: "customer" }
            },
            pet_attributes: {
                dog123: { adopted: true, age: 2, breed: "terrier", name: "toto" },
                dog456: { adopted: false, age: 3, breed: "german-shepherd", name: "rintintin" },
                dog789: { adopted: false, age: 2, breed: "collie", name: "lassie" },
                cat123: { adopted: false, age: 1, breed: "fictitious", name: "cheshire" }
            }
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
    const [testInput, setTestInput] = useState(JSON.stringify(testScenarios["owner-full-access"].input, null, 2));
    const [selectedScenario, setSelectedScenario] = useState("owner-full-access");
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

    // OPA server base URL
    const OPA_BASE_URL = "http://localhost:8181";

    // Upload policy to OPA server, with error handling for bad syntax
    // Upload policy to OPA server, with error handling for bad syntax
    const uploadPolicy = async (policyText: string, policyName = "example") => {
        const res = await fetch(`${OPA_BASE_URL}/v1/policies/${policyName}`, {
            method: "PUT",
            headers: {
                "Content-Type": "text/plain"
            },
            body: policyText
        });
        if (!res.ok) {
            console.log(res);
            // Try to parse OPA error response
            let errorMsg = "Failed to upload policy";
            let errorDetails: any[] = [];
            try {
                const errJson = await res.json();
                if (errJson.message) errorMsg = errJson.message;
                if (Array.isArray(errJson.errors)) {
                    errorDetails = errJson.errors.map((e: any) => {
                        return {
                            message: e.message,
                            location: e.location || null,
                            details: e.details || null
                        };
                    });
                }
            } catch { }
            // Pass structured error info for UI rendering
            throw new Error(JSON.stringify({ errorMsg, errorDetails }));
        }
        return res;
    };

    // Evaluate policy using OPA server
    const evaluatePolicy = async () => {
        setIsEvaluating(true);
        let start = performance.now();
        try {
            // Upload policy first
            await uploadPolicy(policy);

            // Parse input and data from the selected scenario
            const scenario = testScenarios[selectedScenario as keyof typeof testScenarios];
            const inputObj = scenario.input;
            const dataObj = scenario.data;

            // Upload data to OPA server first
            if (dataObj) {
                const dataRes = await fetch(`${OPA_BASE_URL}/v1/data`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(dataObj)
                });
                if (!dataRes.ok) {
                    throw new Error("Failed to upload data to OPA server");
                }
            }

            // POST to OPA policy endpoint
            const res = await fetch(`${OPA_BASE_URL}/v1/data/app/abac/allow`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ input: inputObj })
            });
            const data = await res.json();

            let allow = false;
            let errors: string[] = [];
            if (res.ok && data && typeof data.result !== "undefined") {
                allow = !!data.result;
            } else {
                errors.push("OPA server error or invalid response");
            }
            setResult({
                allow,
                errors: errors.length > 0 ? errors : undefined,
                duration: `${(performance.now() - start).toFixed(1)}ms`
            });
        } catch (error: any) {
            // Try to parse structured error info
            let errors: any[] = [];
            try {
                const parsed = JSON.parse(error.message);
                errors.push(parsed.errorMsg);
                if (Array.isArray(parsed.errorDetails)) {
                    errors = errors.concat(parsed.errorDetails);
                }
            } catch {
                errors = (error.message || "Unknown error").split("\n");
            }
            setResult({
                allow: false,
                errors
            });
        }
        setIsEvaluating(false);
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
                            <div className="flex gap-4 items-center">
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
                                {/* Test Data input field */}
                                <div>
                                    <label htmlFor="testData" className="mr-2 text-sm font-medium">Test Data:</label>
                                    <Select value={"custom-data"} onValueChange={() => { }}>
                                        <SelectTrigger className="w-32">
                                            <SelectValue placeholder="Test Data" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="custom-data">Custom Test Data</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <input
                                        id="testData"
                                        type="text"
                                        placeholder="Enter Test Data..."
                                        className="border rounded px-2 py-1 text-sm w-32 mt-1"
                                        onChange={() => { }}
                                    />
                                </div>
                            </div>
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
                                    <SelectItem value="owner-full-access">Owner Full Access</SelectItem>
                                    <SelectItem value="senior-employee-update">Senior Employee Update</SelectItem>
                                    <SelectItem value="junior-employee-read">Junior Employee Read</SelectItem>
                                    <SelectItem value="customer-adopted-pet">Customer Adopted Pet</SelectItem>
                                    <SelectItem value="customer-available-pet">Customer Available Pet</SelectItem>
                                    <SelectItem value="unauthorized-action">Unauthorized Action</SelectItem>
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
                                            <span className="font-medium text-warning">Policy Syntax Errors</span>
                                        </div>
                                        {result.errors.map((error, index) => {
                                            // If error is a string, just show it
                                            if (typeof error === "string") {
                                                return (
                                                    <div key={index} className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                                                        <span className="font-bold">Message:</span> {error}
                                                    </div>
                                                );
                                            }
                                            // If error is an object, show all details using type casting
                                            const errObj = error as any;
                                            return (
                                                <div key={index} className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                                                    {errObj.message && (
                                                        <>
                                                            <span className="font-bold">Message:</span> {errObj.message}
                                                        </>
                                                    )}
                                                    {errObj.location && (
                                                        <div className="text-xs text-muted-foreground mt-1">
                                                            <span className="font-bold">Location:</span> File: {errObj.location.file}, Line: {errObj.location.row}, Col: {errObj.location.col}
                                                        </div>
                                                    )}
                                                    {errObj.details && (
                                                        <div className="text-xs text-muted-foreground mt-1">
                                                            <span className="font-bold">Line:</span> <code>{errObj.details.line}</code> <span className="font-bold">Idx:</span> {errObj.details.idx}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
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