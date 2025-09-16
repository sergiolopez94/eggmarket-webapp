const vision = require('@google-cloud/vision');
const OpenAI = require('openai');

async function testFullPipeline() {
  const visionClient = new vision.ImageAnnotatorClient();
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });

  console.log('Testing full extraction pipeline...');

  // Step 1: OCR with Google Vision
  console.log('Step 1: Extracting text with Google Cloud Vision...');
  const [result] = await visionClient.textDetection('test-assets/license.png');
  const detections = result.textAnnotations;

  if (!detections || detections.length === 0) {
    console.log('No text detected');
    return;
  }

  const ocrText = detections[0].description;
  console.log('OCR Text extracted successfully');

  // Step 2: Structure with OpenAI
  console.log('Step 2: Parsing structured data with OpenAI...');

  const template = {
    extractionFields: {
      licenseNumber: {
        type: 'string',
        patterns: ['license', 'dl', 'number', '#'],
        required: true
      },
      expirationDate: {
        type: 'date',
        patterns: ['exp', 'expires', 'expiration', 'valid until'],
        required: true,
        format: ['MM/DD/YYYY', 'MM-DD-YYYY', 'YYYY-MM-DD']
      },
      firstName: {
        type: 'string',
        patterns: ['first name', 'given name'],
        required: false
      },
      lastName: {
        type: 'string',
        patterns: ['last name', 'surname', 'family name'],
        required: false
      },
      dateOfBirth: {
        type: 'date',
        patterns: ['dob', 'date of birth', 'born'],
        required: false
      }
    }
  };

  const prompt = `Extract structured data from this driver's license text. Return only valid JSON with the fields specified in the template.

OCR Text:
${ocrText}

Template:
${JSON.stringify(template, null, 2)}

Return JSON with extracted values for: licenseNumber, expirationDate, firstName, lastName, dateOfBirth`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are a document extraction expert. Extract data accurately and return only valid JSON.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0
  });

  console.log('Step 3: Structured Data Extracted:');
  console.log('=================================');
  console.log(completion.choices[0].message.content);
  console.log('=================================');
  console.log('Full pipeline completed successfully!');
}

testFullPipeline().catch(console.error);