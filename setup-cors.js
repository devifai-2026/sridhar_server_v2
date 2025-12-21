// test-cors-fix.js
import { Storage } from '@google-cloud/storage';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = new Storage({
  keyFilename: path.join(__dirname, 'config', 'google-cloud-key.json'),
  projectId: 'sridhar-edu-platform'
});

async function testAndFixCORS() {
  const bucketName = 'sridhar-edu-bucket-2025';
  const bucket = storage.bucket(bucketName);

  console.log('🔍 Testing CORS configuration for:', bucketName);

  // Enhanced CORS configuration
  const corsConfiguration = [
    {
      origin: ['*'],
      method: ['GET', 'HEAD', 'OPTIONS'],
      responseHeader: [
        'Content-Type',
        'Content-Length',
        'Content-Range', 
        'Accept-Ranges',
        'Range',
        'Content-Disposition',
        'Authorization'
      ],
      maxAgeSeconds: 3600
    }
  ];

  try {
    // Set CORS
    await bucket.setCorsConfiguration(corsConfiguration);
    console.log('✅ CORS configuration updated');

    // Wait a moment for propagation
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test with multiple range requests
    await testRangeRequests();
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

async function testRangeRequests() {
  const testUrl = 'http://storage.googleapis.com/sridhar-edu-bucket-2025/test/Express-JS/Intro-To-Express/1764295558538_Intro-to-DC-Circuits.mp4';
  
  console.log('\n🎯 Testing Byte-Range Support...');
  
  const tests = [
    { range: 'bytes=0-999', description: 'First 1KB' },
    { range: 'bytes=1000-1999', description: 'Second 1KB' },
    { range: 'bytes=500000-500999', description: 'Middle chunk' },
    { range: 'bytes=0-1', description: 'Tiny range' }
  ];

  for (const test of tests) {
    try {
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: { 'Range': test.range }
      });

      console.log(`\n📊 ${test.description}:`);
      console.log(`   Status: ${response.status}`);
      console.log(`   Content-Range: ${response.headers.get('content-range')}`);
      console.log(`   Accept-Ranges: ${response.headers.get('accept-ranges')}`);
      console.log(`   Content-Length: ${response.headers.get('content-length')}`);
      
      if (response.status === 206) {
        console.log('   ✅ Byte-range working!');
      } else {
        console.log('   ❌ Byte-range NOT working');
      }
    } catch (error) {
      console.log(`   💥 Error: ${error.message}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

testAndFixCORS();