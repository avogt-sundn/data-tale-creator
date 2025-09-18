import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Play, Pause, Shield, Users, Database, GitBranch, Activity, Lock, Unlock } from "lucide-react";

// Mock data for the demonstration
const mockSources = [
  { id: "hr", name: "HR System", type: "database", status: "active" },
  { id: "ad", name: "Active Directory", type: "ldap", status: "active" },
  { id: "project", name: "Project Management", type: "api", status: "active" },
  { id: "finance", name: "Financial System", type: "database", status: "active" }
];

const mockPolicies = [
  { id: "1", name: "Executive Access", priority: 1, conditions: "role = 'executive' AND department = 'C-level'" },
  { id: "2", name: "Project Lead Access", priority: 2, conditions: "role = 'lead' AND project_active = true" },
  { id: "3", name: "Department Access", priority: 3, conditions: "department = user.department" },
  { id: "4", name: "Default Employee", priority: 4, conditions: "employment_status = 'active'" }
];

const mockUsers = [
  { id: "1", name: "Sarah Chen", role: "executive", department: "C-level", access: ["full", "financial", "strategic"] },
  { id: "2", name: "Mike Johnson", role: "lead", department: "Engineering", access: ["project", "technical", "team"] },
  { id: "3", name: "Alice Brown", role: "analyst", department: "Marketing", access: ["marketing", "reports"] },
  { id: "4", name: "Bob Wilson", role: "developer", department: "Engineering", access: ["code", "documentation"] }
];

interface Slide {
  id: number;
  title: string;
  component: React.ComponentType;
}

const OverviewSlide = () => (
  <div className="space-y-8 animate-fade-in">
    <div className="text-center space-y-4">
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-primary rounded-full text-primary-foreground">
        <Shield className="h-5 w-5" />
        <span className="font-medium">Access Control Engine</span>
      </div>
      <h2 className="text-4xl font-bold text-foreground">Fine-Grained Access Control</h2>
      <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
        Dynamic policy-based access control with real-time attribute evaluation from multiple organizational data sources
      </p>
    </div>
    
    <div className="grid md:grid-cols-3 gap-6">
      <Card className="p-6 space-y-4 animate-scale-in" style={{ animationDelay: '0.2s' }}>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <GitBranch className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-xl font-semibold">Policy Engine</h3>
        </div>
        <p className="text-muted-foreground">Dynamic rule evaluation with priority-based decision making</p>
      </Card>
      
      <Card className="p-6 space-y-4 animate-scale-in" style={{ animationDelay: '0.4s' }}>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-accent/10 rounded-lg">
            <Activity className="h-6 w-6 text-accent" />
          </div>
          <h3 className="text-xl font-semibold">Real-time Data</h3>
        </div>
        <p className="text-muted-foreground">Live attribute feeds from HR, AD, and business systems</p>
      </Card>
      
      <Card className="p-6 space-y-4 animate-scale-in" style={{ animationDelay: '0.6s' }}>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-success/10 rounded-lg">
            <Shield className="h-6 w-6 text-success" />
          </div>
          <h3 className="text-xl font-semibold">Fine Control</h3>
        </div>
        <p className="text-muted-foreground">Granular permissions based on context and attributes</p>
      </Card>
    </div>
  </div>
);

const DataSourcesSlide = () => {
  const [activeSource, setActiveSource] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSource(prev => (prev + 1) % mockSources.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold">Dynamic Data Sources</h2>
        <p className="text-xl text-muted-foreground">Real-time attribute collection from organizational systems</p>
      </div>
      
      <div className="relative">
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h3 className="text-xl font-semibold mb-4">Connected Systems</h3>
            {mockSources.map((source, index) => (
              <Card key={source.id} className={`p-4 transition-all duration-300 ${
                activeSource === index ? 'border-primary shadow-lg animate-pulse-glow' : ''
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      activeSource === index ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}>
                      <Database className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="font-medium">{source.name}</h4>
                      <p className="text-sm text-muted-foreground">{source.type}</p>
                    </div>
                  </div>
                  <Badge variant={source.status === 'active' ? 'default' : 'secondary'}>
                    {source.status}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
          
          <div className="space-y-4">
            <h3 className="text-xl font-semibold mb-4">Live Data Stream</h3>
            <Card className="p-4 bg-gradient-dashboard">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium">Streaming attributes...</span>
                </div>
                <div className="space-y-2 font-mono text-sm">
                  <div className="animate-data-flow">user.department: "Engineering"</div>
                  <div className="animate-data-flow" style={{ animationDelay: '0.5s' }}>user.role: "Lead Developer"</div>
                  <div className="animate-data-flow" style={{ animationDelay: '1s' }}>project.active: true</div>
                  <div className="animate-data-flow" style={{ animationDelay: '1.5s' }}>clearance.level: "Confidential"</div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

const PolicyEngineSlide = () => (
  <div className="space-y-8 animate-fade-in">
    <div className="text-center space-y-4">
      <h2 className="text-3xl font-bold">Policy Rule Engine</h2>
      <p className="text-xl text-muted-foreground">Priority-based rule evaluation with dynamic conditions</p>
    </div>
    
    <div className="space-y-4">
      <h3 className="text-xl font-semibold">Active Policies (Priority Order)</h3>
      {mockPolicies.map((policy, index) => (
        <Card key={policy.id} className="p-4 animate-slide-in" style={{ animationDelay: `${index * 0.2}s` }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="bg-primary text-primary-foreground">
                #{policy.priority}
              </Badge>
              <h4 className="font-semibold">{policy.name}</h4>
            </div>
            <Badge variant="secondary">Active</Badge>
          </div>
          <p className="text-sm text-muted-foreground font-mono bg-muted p-2 rounded">
            {policy.conditions}
          </p>
        </Card>
      ))}
    </div>
    
    <Card className="p-6 bg-gradient-success text-white">
      <div className="flex items-center gap-3 mb-2">
        <GitBranch className="h-6 w-6" />
        <h3 className="text-xl font-semibold">Rule Evaluation Process</h3>
      </div>
      <p className="opacity-90">
        Policies are evaluated in priority order. First matching rule determines access level.
        Real-time attribute updates trigger immediate re-evaluation.
      </p>
    </Card>
  </div>
);

const AccessControlSlide = () => {
  const [selectedUser, setSelectedUser] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setSelectedUser(prev => (prev + 1) % mockUsers.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold">Real-time Access Decisions</h2>
        <p className="text-xl text-muted-foreground">Dynamic permissions based on current user attributes</p>
      </div>
      
      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Users</h3>
          {mockUsers.map((user, index) => (
            <Card key={user.id} className={`p-4 cursor-pointer transition-all ${
              selectedUser === index ? 'border-primary shadow-lg' : ''
            }`} onClick={() => setSelectedUser(index)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${
                    selectedUser === index ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  }`}>
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-medium">{user.name}</h4>
                    <p className="text-sm text-muted-foreground">{user.role} - {user.department}</p>
                  </div>
                </div>
                {selectedUser === index && <Badge variant="default">Selected</Badge>}
              </div>
            </Card>
          ))}
        </div>
        
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Access Granted</h3>
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Unlock className="h-5 w-5 text-success" />
              <span className="font-semibold text-success">Access Authorized</span>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">{mockUsers[selectedUser].name}</h4>
              <div className="flex flex-wrap gap-2">
                {mockUsers[selectedUser].access.map((permission, index) => (
                  <Badge key={index} variant="default" className="bg-success text-white animate-scale-in" 
                         style={{ animationDelay: `${index * 0.1}s` }}>
                    {permission}
                  </Badge>
                ))}
              </div>
            </div>
          </Card>
          
          <Card className="p-4 bg-info/10 border-info">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-4 w-4 text-info" />
              <span className="font-medium text-info">Policy Applied</span>
            </div>
            <p className="text-sm">
              {mockPolicies.find(p => p.priority <= selectedUser + 1)?.name || "Default Policy"}
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
};

export const AccessControlDemo = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const slides: Slide[] = [
    { id: 1, title: "System Overview", component: OverviewSlide },
    { id: 2, title: "Data Sources", component: DataSourcesSlide },
    { id: 3, title: "Policy Engine", component: PolicyEngineSlide },
    { id: 4, title: "Access Control", component: AccessControlSlide },
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentSlide(prev => (prev + 1) % slides.length);
      }, 8000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, slides.length]);

  const nextSlide = () => setCurrentSlide(prev => (prev + 1) % slides.length);
  const prevSlide = () => setCurrentSlide(prev => (prev - 1 + slides.length) % slides.length);

  const CurrentSlideComponent = slides[currentSlide].component;

  return (
    <div className="min-h-screen bg-gradient-dashboard">
      {/* Navigation Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Shield className="h-6 w-6 text-primary" />
                <h1 className="text-xl font-bold">Access Control Demo</h1>
              </div>
              <div className="flex items-center gap-2">
                {slides.map((_, index) => (
                  <div
                    key={index}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      currentSlide === index ? 'bg-primary' : 'bg-muted'
                    }`}
                  />
                ))}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={prevSlide}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPlaying(!isPlaying)}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="sm" onClick={nextSlide}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-muted-foreground">
              {currentSlide + 1}. {slides[currentSlide].title}
            </h2>
          </div>
          
          <div key={currentSlide} className="min-h-[600px]">
            <CurrentSlideComponent />
          </div>
        </div>
      </div>
    </div>
  );
};