const pdf = require('pdf-parse');
const { fromBuffer } = require('pdf2pic');
const fs = require('fs');
const { ImageAnnotatorClient } = require('@google-cloud/vision');

// Set up Google Vision client
const visionClient = new ImageAnnotatorClient({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
});

async function testCompletePDFSystem() {
  console.log('🧪 Complete PDF Processing System Test');
  console.log('====================================\n');

  try {
    // Step 1: Load PDF
    const pdfBuffer = fs.readFileSync('test-assets/test.pdf');
    console.log('✅ PDF loaded:', pdfBuffer.length, 'bytes');

    // Step 2: Try text extraction (will likely fail)
    console.log('\n📄 STEP 1: Text Extraction Attempt');
    console.log('----------------------------------');

    let textExtractionSuccessful = false;
    let extractedText = '';

    try {
      const pdfData = await pdf(pdfBuffer);
      const textLength = pdfData.text?.length || 0;

      console.log('Pages:', pdfData.numpages);
      console.log('Text length:', textLength);

      if (textLength > 50) {
        console.log('✅ Text extraction successful!');
        extractedText = pdfData.text;
        textExtractionSuccessful = true;
      } else {
        console.log('⚠️ Insufficient text extracted, proceeding to OCR...');
      }
    } catch (textError) {
      console.log('❌ Text extraction failed:', textError.message);
      console.log('⚠️ Proceeding to OCR...');
    }

    if (!textExtractionSuccessful) {
      // Step 3: PDF to Image conversion
      console.log('\n🖼️ STEP 2: PDF to Image Conversion');
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

      let allText = [];
      let pageCount = 0;

      // Convert pages (try up to 5 pages)
      for (let pageNum = 1; pageNum <= 5; pageNum++) {
        try {
          const pageResult = await conversion(pageNum, { responseType: 'buffer' });

          if (!pageResult || !pageResult.buffer || pageResult.buffer.length === 0) {
            if (pageNum === 1) {
              console.log('❌ Failed to convert page 1 - PDF might be corrupted');
              break;
            } else {
              console.log(`✅ Finished processing ${pageCount} pages`);
              break;
            }
          }

          pageCount++;
          console.log(`✅ Page ${pageNum} converted:`, pageResult.buffer.length, 'bytes');

          // Step 4: OCR each page
          console.log(`\n👁️ STEP 3.${pageNum}: OCR Page ${pageNum}`);
          console.log('-------------------------');

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
            console.log(`❌ OCR failed for page ${pageNum}:`, result.error.message);
            continue;
          }

          const detections = result.textAnnotations || [];

          if (detections.length === 0) {
            console.log(`⚠️ No text detected on page ${pageNum}`);
            continue;
          }

          const pageText = detections[0].description || '';

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

          console.log(`✅ OCR successful for page ${pageNum}`);
          console.log(`Confidence: ${averageConfidence}%`);
          console.log(`Text length: ${pageText.length} characters`);

          if (pageText.trim()) {
            allText.push(`--- Page ${pageNum} ---\n${pageText.trim()}`);
          }

        } catch (pageError) {
          console.log(`❌ Failed to process page ${pageNum}:`, pageError.message);
          break;
        }
      }

      // Combine all extracted text
      extractedText = allText.join('\n\n');
    }

    // Final Results
    console.log('\n🎯 FINAL RESULTS');
    console.log('================');

    if (extractedText && extractedText.trim()) {
      console.log('✅ Text extraction successful!');
      console.log('Processing method:', textExtractionSuccessful ? 'Direct text extraction' : 'OCR processing');
      console.log('Total text length:', extractedText.length);

      console.log('\n📝 EXTRACTED TEXT OUTPUT:');
      console.log('=========================');
      console.log(extractedText);
      console.log('=========================');

    } else {
      console.log('❌ No text could be extracted from the PDF');
      console.log('This PDF might be completely blank or severely corrupted');
    }

  } catch (error) {
    console.error('❌ Complete system test failed:', error.message);
    console.error(error);
  }
}

testCompletePDFSystem();
