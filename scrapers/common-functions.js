const fs = require('fs');

const openAI = require("openai");
const puppeteer = require("puppeteer-extra");

module.exports = {
    initiate: async function (url, apiKey) {
        console.log("-----------------------------");
        console.log("Starting...");
        
        var browser = await puppeteer.launch({
            headless: false,
            userDataDir: "./user_data",
        });
        
        console.log("Opening Browser");
        var page = await browser.newPage();
        await page.setDefaultNavigationTimeout(0);
    
        console.log("Going to URL");
        await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: 0,
        });
        
        return page;
    },

    escapeCSV: function(str) {
        let hasSpecialChar = /[",;\n]/.test(str);
        if (hasSpecialChar) {
          // Double up on quotes to escape them
          let escaped = str.replace(/"/g, '""');
          return '"' + escaped + '"';
        } else {
          return str;
        }
    },

    prepareCSV: function(header, fileName) {
        let csvContent = header.join(',') + '\n';
    
        fs.writeFile(fileName, csvContent, (err) => {
            if (err) throw err;
            console.log('CSV saved');
        });
    },

};

