const fs = require('fs');

// Test our modular services directly
async function testModularServices() {
  console.log('🧪 Testing Modular Services Directly');
  console.log('====================================\n');

  try {
    // Dynamic imports to avoid require issues
    const { TextExtractionService } = await import('./lib/services/text-extraction/TextExtractionService.ts');

    console.log('📄 Step 1: Testing Text Extraction Service');
    console.log('-------------------------------------------');

    // Create File object from invoice PDF
    const invoiceBuffer = fs.readFileSync('test-assets/Invoice 0000534.pdf');
    const invoiceFile = new File([invoiceBuffer], 'Invoice 0000534.pdf', {
      type: 'application/pdf'
    });

    console.log('✅ Invoice file created:', invoiceFile.name, `(${invoiceFile.size} bytes)`);

    // Test text extraction
    const textExtractor = new TextExtractionService();
    console.log('✅ TextExtractionService instantiated');

    console.log('\n🔍 Extracting text from invoice...');
    const textResult = await textExtractor.extractText(invoiceFile);

    console.log('📊 Text Extraction Results:');
    console.log('===========================');
    console.log('Success:', textResult.success);
    console.log('Processing Method:', textResult.processingMethod);
    console.log('Confidence:', textResult.confidence);
    console.log('Text Length:', textResult.text.length);
    console.log('Estimated Cost: $' + textResult.estimatedCost.toFixed(4));
    console.log('Processing Time:', textResult.processingTimeMs + 'ms');

    if (textResult.success) {
      console.log('\n📝 Extracted Text Preview:');
      console.log('---------------------------');
      console.log(textResult.text.substring(0, 200) + '...');

      console.log('\n🎯 Expected: pdf-text-extraction method (fast & cheap)');
      console.log('🎯 Actual method:', textResult.processingMethod);

      if (textResult.processingMethod === 'pdf-text-extraction') {
        console.log('✅ SUCCESS: PDF text extraction working correctly!');
      } else {
        console.log('⚠️ WARNING: Expected text extraction but got', textResult.processingMethod);
      }
    } else {
      console.log('❌ Text extraction failed:', textResult.error);
    }

    console.log('\n' + '='.repeat(50));
    console.log('✅ Modular Text Extraction Service Test Complete');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

testModularServices().catch(console.error);