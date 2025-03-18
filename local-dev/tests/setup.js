require('dotenv').config({ path: '.env.test' });

// Increase test timeout
jest.setTimeout(10000);

// Clean up resources after all tests
afterAll(async () => {
  // Add any cleanup logic here
}); 