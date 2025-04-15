import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, AlertTriangle, InfoIcon } from "lucide-react";

export default function BedrockTest() {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [accessError, setAccessError] = useState(false);
  const [serviceStatus, setServiceStatus] = useState<"unchecked" | "checking" | "available" | "unavailable">("unchecked");

  // Check Bedrock API status on component mount
  useEffect(() => {
    checkBedrockStatus();
  }, []);

  // Check if we can access Bedrock API
  const checkBedrockStatus = async () => {
    setServiceStatus("checking");
    try {
      // Use the simple GET endpoint for a quick test
      const testResponse = await fetch(`/api/test-bedrock-simple?q=test`);

      if (testResponse.ok) {
        setServiceStatus("available");
      } else {
        const errorData = await testResponse.json();
        console.error("Bedrock test failed:", errorData);

        // Check if this is an access error
        if (errorData.error && errorData.error.includes("not authorized to perform")) {
          setAccessError(true);
          setServiceStatus("unavailable");
        } else {
          setServiceStatus("unavailable");
        }
      }
    } catch (err) {
      console.error("Error checking Bedrock status:", err);
      setServiceStatus("unavailable");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!query.trim()) {
      setError("Please enter a query");
      return;
    }

    setLoading(true);
    setError("");

    try {
      console.log("Sending query to Bedrock API:", query);

      const result = await fetch("/api/test-bedrock", {
        method: "POST",
        body: JSON.stringify({ query }),
        headers: {
          "Content-Type": "application/json"
        }
      });

      const data = await result.json();

      if (!result.ok) {
        if (data.error && data.error.includes("not authorized")) {
          setAccessError(true);
          throw new Error("AWS Bedrock access denied. You need permission to use this model.");
        }
        throw new Error(data.message || `Error ${result.status}: ${result.statusText}`);
      }

      setResponse(data.response);
      console.log("Received response:", data.response);
    } catch (err: any) {
      console.error("Error testing AWS Bedrock:", err);
      setError(err.message || "Failed to get response from AWS Bedrock API");
    } finally {
      setLoading(false);
    }
  };

  // Check if access error and show appropriate message
  const renderAccessError = () => {
    if (accessError) {
      return (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            Your AWS credentials don't have permission to use the Claude models. 
            Please check your AWS Bedrock permissions and ensure you have access to 
            at least one of the Claude models in your AWS region.
            <ul className="mt-2 list-disc pl-5">
              <li>Verify your AWS credentials are set in Secrets</li>
              <li>Make sure your IAM role has Bedrock access permissions</li>
              <li>Check if Claude models are available in your AWS region</li>
              <li>Consider setting a custom CLAUDE_MODEL_ID in Secrets</li>
            </ul>
          </AlertDescription>
        </Alert>
      );
    }
    return null;
  };

  // Render service status alert
  const renderServiceStatus = () => {
    if (serviceStatus === "checking") {
      return (
        <Alert className="mb-4">
          <InfoIcon className="h-4 w-4" />
          <AlertTitle>Checking AWS Bedrock status...</AlertTitle>
          <AlertDescription>
            Verifying connectivity to AWS Bedrock service.
          </AlertDescription>
        </Alert>
      );
    } else if (serviceStatus === "unavailable" && !accessError) {
      return (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>AWS Bedrock Service Unavailable</AlertTitle>
          <AlertDescription>
            Cannot connect to AWS Bedrock service. Please check your AWS credentials 
            and network connectivity.
          </AlertDescription>
        </Alert>
      );
    }
    return null;
  };

  return (
    <div className="container max-w-4xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-center">AWS Bedrock API Test</h1>

      {renderServiceStatus()}
      {renderAccessError()}

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Test AWS Bedrock Claude Integration</CardTitle>
          <CardDescription>
            Enter a query to test the AWS Bedrock Claude API integration
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent>
            <Textarea
              placeholder="Enter your question here..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="min-h-[100px]"
            />
            {error && <p className="text-red-500 mt-2">{error}</p>}
          </CardContent>
          <CardFooter className="flex gap-2">
            <Button 
              type="submit" 
              disabled={loading || (serviceStatus === "unavailable")}
            >
              {loading ? "Generating response..." : "Submit Query"}
            </Button>
            {serviceStatus === "unavailable" && (
              <Button
                type="button"
                onClick={checkBedrockStatus}
                variant="outline"
              >
                Retry Connection
              </Button>
            )}
          </CardFooter>
        </form>
      </Card>

      {response && (
        <Card>
          <CardHeader>
            <CardTitle>Response</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="whitespace-pre-wrap bg-muted p-4 rounded-md">
              {response}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}