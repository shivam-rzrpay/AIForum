import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "./context/AuthContext";
import { useEffect, useState } from "react";

// Pages
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Forum from "@/pages/Forum";
import AiAssistant from "@/pages/AiAssistant";
import DocumentManagement from "@/pages/DocumentManagement";
import BedrockTest from "@/pages/BedrockTest";

// Components
import { ThemeProvider } from "@/components/ui/theme-provider";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/forums/:category" component={Forum} />
      <Route path="/ai-assistant/:category" component={AiAssistant} />
      <Route path="/documents" component={DocumentManagement} />
      <Route path="/test-bedrock" component={BedrockTest} />
      <Route path="/bedrock-test" component={BedrockTest} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [mounted, setMounted] = useState(false);

  // Update mounted state
  useEffect(() => {
    setMounted(true);
  }, []);

  // To avoid hydration mismatch, only render app client-side
  if (!mounted) {
    return null;
  }

  return (
    <ThemeProvider defaultTheme="light">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Router />
          <Toaster />
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
