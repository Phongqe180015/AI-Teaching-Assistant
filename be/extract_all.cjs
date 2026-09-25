const fs = require('fs');
const mammoth = require('mammoth');
async function run() {
  const buf = fs.readFileSync('D:/AITA/AITA/be/temp/submissions/4d207480-c730-416a-9571-a32d0db21968/huyttqse183533/PE_TEST_SE183533_TanTranQuocHuy/PE Test 6_SE183533_ThanTranQuocHuy.docx');
  const result = await mammoth.convertToHtml({ buffer: buf });
  const html = result.value;
  const images = [];
  const regex = /<img src="data:([^"]+)"/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
      images.push(match[1]);
  }
  images.forEach((imgData, idx) => {
      const base64Data = imgData.split(',')[1];
      if (base64Data) {
          fs.writeFileSync('D:/AITA/AITA/be/temp/img_all_' + idx + '.png', base64Data, 'base64');
      }
  });
  console.log('Saved ' + images.length + ' images.');
}
run();
