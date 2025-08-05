const assert = require('assert');
const chatWithLLM = require('./index');

async function runTest() {
  console.log('Running LLM connection test...');
  try {
    const response = await chatWithLLM('Hello, LLM!');
    assert.ok(response && response.length > 0, 'Expected a non-empty response from LLM');
    console.log('Test passed: Received response from LLM.');
    console.log('LLM Response:', response);
  } catch (error) {
    console.error('Test failed: Error during LLM communication.', error.message);
    process.exit(1); // Exit with a non-zero code to indicate failure
  }
}

runTest();
