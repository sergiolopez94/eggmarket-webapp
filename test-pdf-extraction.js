const pdf = require('pdf-parse');
const { fromBuffer } = require('pdf2pic');
const fs = require('fs');
const { ImageAnnotatorClient } = require('@google-cloud/vision');

// Set up Google Vision client
const visionClient = new ImageAnnotatorClient({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
});

async function testPDFExtraction() {
  console.log('🧪 Testing PDF Extraction with license.pdf');
  console.log('============================================\n');

  try {
    // Read the PDF file
    const pdfBuffer = fs.readFileSync('test-assets/license.pdf');
    console.log('✅ PDF file loaded:', pdfBuffer.length, 'bytes\n');

    // Step 1: Try direct text extraction
    console.log('📄 STEP 1: Direct Text Extraction');
    console.log('----------------------------------');

    try {
      const pdfData = await pdf(pdfBuffer);
      console.log('Pages:', pdfData.numpages);
      console.log('Text length:', pdfData.text?.length || 0);

      if (pdfData.text && pdfData.text.length > 50) {
        console.log('✅ Direct text extraction successful!');
        console.log('\n📝 EXTRACTED TEXT:');
        console.log('==================');
        console.log(pdfData.text);
        return; // Success, no need for OCR
      } else {
        console.log('⚠️ Insufficient text found, proceeding to OCR...\n');
      }
    } catch (textError) {
      console.log('❌ Direct text extraction failed:', textError.message);
      console.log('⚠️ Proceeding to OCR...\n');
    }

    // Step 2: Convert PDF to images for OCR
    console.log('🖼️ STEP 2: PDF to Image Conversion');
    console.log('-----------------------------------');

    const convertOptions = {
      density: 200,
      saveFilename: 'page',
      format: 'png',
      width: 2000,
      height: 3000,
      quality: 90
    };

    const conversion = fromBuffer(pdfBuffer, convertOptions);
    console.log('✅ PDF converter initialized');

    // Convert first page
    const pageResult = await conversion(1, { responseType: 'buffer' });

    if (!pageResult || !pageResult.buffer) {
      throw new Error('Failed to convert PDF to image');
    }

    console.log('✅ Page 1 converted to image:', pageResult.buffer.length, 'bytes\n');

    // Step 3: OCR with Google Vision
    console.log('👁️ STEP 3: Google Vision OCR');
    console.log('-----------------------------');

    const request = {
      image: {
        content: pageResult.buffer.toString('base64')
      },
      features: [
        {
          type: 'TEXT_DETECTION',
          maxResults: 1
        }
      ],
      imageContext: {
        languageHints: ['en']
      }
    };

    const [result] = await visionClient.annotateImage(request);

    if (result.error) {
      throw new Error(`Google Vision API error: ${result.error.message}`);
    }

    const detections = result.textAnnotations || [];

    if (detections.length === 0) {
      console.log('❌ No text detected in PDF');
      return;
    }

    // First annotation contains the full text
    const fullText = detections[0].description || '';

    // Calculate confidence
    const wordDetections = detections.slice(1);
    let totalConfidence = 0;
    let confidenceCount = 0;

    for (const detection of wordDetections) {
      if (detection.confidence !== undefined) {
        totalConfidence += detection.confidence;
        confidenceCount++;
      }
    }

    const averageConfidence = confidenceCount > 0
      ? (totalConfidence / confidenceCount * 100).toFixed(1)
      : 'N/A';

    console.log('✅ OCR completed successfully!');
    console.log('Confidence:', averageConfidence + '%');
    console.log('Text length:', fullText.length);
    console.log('Word detections:', wordDetections.length);

    console.log('\n📝 EXTRACTED TEXT:');
    console.log('==================');
    console.log(fullText);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
  }
}

// Run the test
testPDFExtraction();