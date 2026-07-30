const pdfParse = require('pdf-parse');
const fs = require('fs');
const http = require('https');

async function test() {
  const file = fs.createWriteStream("test.pdf");
  http.get("https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", function(response) {
    response.pipe(file);
    file.on('finish', async function() {
      file.close();
      const buffer = fs.readFileSync("test.pdf");

      function render_page(pageData) {
        let render_options = {
          normalizeWhitespace: false,
          disableCombineTextItems: false
        }
        return pageData.getTextContent(render_options).then(function(textContent) {
          console.log("ITEMS ON PAGE: ", textContent.items.length);
          let text = '';
          for (let item of textContent.items) {
            text += item.str + '\n';
          }
          return text;
        });
      }

      let options = {
        pagerender: render_page
      }
      
      const data = await pdfParse(buffer, options);
      console.log("Parsed using pagerender:\n", data.text);
    });
  });
}
test();
