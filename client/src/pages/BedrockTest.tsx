import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function BedrockTest() {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
      
      if (!result.ok) {
        throw new Error(`Error ${result.status}: ${result.statusText}`);
      }
      
      const data = await result.json();
      setResponse(data.response);
      console.log("Received response:", data.response);
    } catch (err) {
      console.error("Error testing AWS Bedrock:", err);
      setError("Failed to get response from AWS Bedrock API");
    } finally {
      setLoading(false);
    }
  };

  // Alternative direct query handler (in case the form submit isn't working)
  const handleDirectQuery = () => {
    if (!query.trim()) {
      setError("Please enter a query");
      return;
    }
    
    setLoading(true);
    setError("");
    
    fetch("/api/test-bedrock", {
      method: "POST",
      body: JSON.stringify({ query }),
      headers: {
        "Content-Type": "application/json"
      }
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      return response.json();
    })
    .then(data => {
      setResponse(data.response);
      console.log("Received response:", data.response);
    })
    .catch(err => {
      console.error("Error testing AWS Bedrock (direct):", err);
      setError("Failed to get response from AWS Bedrock API");
    })
    .finally(() => {
      setLoading(false);
    });
  };

  return (
    <div className="container max-w-4xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-center">AWS Bedrock API Test</h1>
      
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
            <Button type="submit" disabled={loading}>
              {loading ? "Generating response..." : "Submit Query (Form)"}
            </Button>
            <Button 
              type="button" 
              onClick={handleDirectQuery} 
              disabled={loading}
              variant="outline"
            >
              Try Direct Query
            </Button>
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