const fs = require('fs');
const { ImageAnnotatorClient } = require('@google-cloud/vision');

// Set up Google Vision client
const visionClient = new ImageAnnotatorClient({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
});

async function testDirectOCR() {
  console.log('🧪 Testing Direct OCR on license.pdf');
  console.log('====================================\n');

  try {
    // Read the PDF file
    const pdfBuffer = fs.readFileSync('test-assets/license.pdf');
    console.log('✅ PDF file loaded:', pdfBuffer.length, 'bytes');

    // Try direct OCR on PDF
    console.log('👁️ Attempting direct OCR on PDF...');

    const request = {
      image: {
        content: pdfBuffer.toString('base64')
      },
      features: [
        {
          type: 'DOCUMENT_TEXT_DETECTION',
          maxResults: 1
        }
      ]
    };

    const [result] = await visionClient.annotateImage(request);

    if (result.error) {
      console.log('❌ Direct PDF OCR failed:', result.error.message);
      console.log('This is expected - PDFs usually need conversion to images first');
      return;
    }

    const detections = result.textAnnotations || [];

    if (detections.length === 0) {
      console.log('❌ No text detected');
      return;
    }

    const fullText = detections[0].description || '';
    console.log('✅ OCR successful!');
    console.log('\n📝 EXTRACTED TEXT:');
    console.log('==================');
    console.log(fullText);

  } catch (error) {
    console.error('❌ Test failed:', error.message);

    // Try reading as image format instead
    console.log('\n🖼️ Trying to read as image format...');

    try {
      const request = {
        image: {
          content: fs.readFileSync('test-assets/license.pdf').toString('base64')
        },
        features: [
          {
            type: 'TEXT_DETECTION',
            maxResults: 1
          }
        ]
      };

      const [result] = await visionClient.annotateImage(request);

      if (result.textAnnotations && result.textAnnotations.length > 0) {
        const fullText = result.textAnnotations[0].description || '';
        console.log('✅ Image format OCR successful!');
        console.log('\n📝 EXTRACTED TEXT:');
        console.log('==================');
        console.log(fullText);
      } else {
        console.log('❌ No text found in image format either');
      }

    } catch (imageError) {
      console.log('❌ Image format also failed:', imageError.message);
      console.log('\nThis suggests the PDF needs proper conversion to image format first.');
    }
  }
}

testDirectOCR();