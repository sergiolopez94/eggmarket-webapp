const fs = require('fs');

// Create a simple, modern PDF with extractable text
const textPDFContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/Resources <<
  /Font <<
    /F1 4 0 R
  >>
>>
/MediaBox [0 0 612 792]
/Contents 5 0 R
>>
endobj

4 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj

5 0 obj
<<
/Length 350
>>
stream
BT
/F1 16 Tf
50 750 Td
(CARTER CERTIFICATE) Tj
0 -30 Td
(Certificate Number: CC-2024-001) Tj
0 -25 Td
(Name: John Smith) Tj
0 -25 Td
(License: CDL-123456789) Tj
0 -25 Td
(Issue Date: January 1, 2024) Tj
0 -25 Td
(Expiration Date: December 31, 2025) Tj
0 -25 Td
(Authority: Department of Transportation) Tj
0 -25 Td
(Status: Active) Tj
0 -40 Td
(This document certifies that the named individual) Tj
0 -20 Td
(is authorized to operate commercial motor vehicles.) Tj
ET
endstream
endobj

xref
0 6
0000000000 65535 f
0000000015 00000 n
0000000066 00000 n
0000000123 00000 n
0000000284 00000 n
0000000363 00000 n
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
765
%%EOF`;

fs.writeFileSync('test-assets/text-based.pdf', textPDFContent);
console.log('✅ Created text-based.pdf with extractable text');
console.log('This PDF should work perfectly with text extraction!');