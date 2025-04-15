
// Simple script to test AWS credentials with Bedrock
const { BedrockRuntimeClient, ListFoundationModelsCommand } = require("@aws-sdk/client-bedrock-runtime");
const { STSClient, GetCallerIdentityCommand } = require("@aws-sdk/client-sts");

async function testAWSCredentials() {
  console.log("Testing AWS credentials...");
  
  try {
    // 1. Test STS identity
    const sts = new STSClient({ region: 'ap-south-1' });
    const identityData = await sts.send(new GetCallerIdentityCommand({}));
    console.log('AWS Identity:', identityData.Arn);
    
    // 2. Test Bedrock access
    const bedrock = new BedrockRuntimeClient({ region: 'ap-south-1' });
    console.log('Bedrock client created successfully');
    
    console.log('Using region:', process.env.AWS_REGION || 'ap-south-1');
    console.log('Testing complete!');
  } catch (error) {
    console.error('AWS Credential error:', error.message);
  }
}

testAWSCredentials();
