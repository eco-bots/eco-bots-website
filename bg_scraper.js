//Libraries
const fs = require('fs');
const request = require('request');
require('dotenv').config();
const puppeteer = require("puppeteer-extra");
const stealthPlugin = require("puppeteer-extra-plugin-stealth")();
var userAgent = require('user-agents');
const WebSocket = require('ws');
const Captcha = require("2captcha");
const solver = new Captcha.Solver("bacb82f3e4caaf8f27995ea6ea94fa87");
const {executablePath} = require('puppeteer');
const { escape } = require('querystring');
const open_ai = require('openai');
const moment = require('moment');

const openai = new open_ai({
    apiKey: '',
  });
  
initiate();

async function initiate() {
    console.log("-----------------------------");
    console.log("Starting...");

    let url = 'https://eumis2020.government.bg/en/s/Procedure/Active';
    
    var browser = await puppeteer.launch({
        headless: false,
        userDataDir: "./user_data",
    });
    console.log("Opening Browser");
    const page = await browser.newPage();
    await page.setDefaultNavigationTimeout(0);

    console.log("Going to URL");
    await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 0,
    });
    
    start(page); 
}

async function start(page) {
    
    function escapeCSV(str) {
      let hasSpecialChar = /[",;\n]/.test(str);
      if (hasSpecialChar) {
        // Double up on quotes to escape them
        let escaped = str.replace(/"/g, '""');
        return '"' + escaped + '"';
      } else {
        return str;
      }
    }
    
    let header = ['name', 'status', 'description', 'start_date', 'end_date', 'url', 'application_url', 'document_urls']; 
    let csvContent = header.join(',') + '\n';

    fs.writeFile('output.csv', csvContent, (err) => {
        if (err) throw err;
        console.log('CSV saved');
    });

    const n_index = await page.evaluate(() => {
        return document.querySelectorAll('ul > li > ul ul a').length
    });

    console.log("n_index: " + n_index);

    for (var index = 0; index < n_index; index++) {
        console.log("index: "+index);
        var layout = 1;

        await page.evaluate((index) => {
            let link = document.querySelectorAll('ul > li > ul ul a')[index];
            link.removeAttribute("target");
            link.click();
        }, index);
        await page.waitForNavigation({ waitUntil: 'networkidle2' });

        try {
            if (layout == 1) {
                var text = await page.evaluate((index) => {
                    let text_ = document.querySelector('div.tab-content').innerText;
                    return text_
                }, index);
            } else {throw "layout2"}
        } catch(e){layout=2}

        try {
            var name = await page.evaluate(() => {
                let name = document.querySelector('div.procedure-info:nth-child(2) > strong:nth-child(1)').innerText;
                return name;
            });
            console.log('name: '+name);
        } catch(e){}

        try {
            var description = await page.evaluate(() => {
                let paragraphElements = document.querySelectorAll('div.col-xs-12 > div.procedure-info > p');
                const textArray = Array.from(paragraphElements).map(p => {
                    return p.innerText;
                });
                return textArray.join(' ');
            });
            console.log('description: '+description);
        } catch(e){}

        try {
            var start_date = await openai.chat.completions.create({
                messages: [{ role: 'user', content: text + 'Extract the start date of the project from the text and return it in the format "DD.MM.YYYY". Return the shortest response possible.'}],
                model: 'gpt-3.5-turbo',
            });
            start_date = moment(start_date.choices[0]['message']['content'], 'DD.MM.YYYY').format('DD MMMM YYYY');
            console.log('start_date: '+start_date);
        } catch(e){}

        try {
            var end_date = await openai.chat.completions.create({
                messages: [{ role: 'user', content: text + 'Extract the closing date of the project from the text and return it in the format "DD.MM.YYYY". Return the shortest response possible.'}],
                model: 'gpt-3.5-turbo',
            });
            end_date = moment(end_date.choices[0]['message']['content'], 'DD.MM.YYYY').format('DD MMMM YYYY');
            console.log('end_date: '+end_date);
        } catch(e){}

        try{
            if (layout == 1) {
                var url = await page.evaluate(() => {
                    let url_ = window.location.href;
                    return url_;
                });
            } else {throw "layout2"}
        } catch(e){layout=2}
        console.log('url: '+url);

        const application_url = 'https://eumis2020.government.bg/en/s/Account/Login';

        try {
            var document_urls = await page.evaluate(() => {
                let links = document.querySelectorAll('ul.file-list a');
                const linksTextArray = Array.from(links).map(link => {
                    const websiteRoot = 'https://eumis2020.government.bg';
                    const href = link.getAttribute('href');
                    const fileName = link.textContent
                    const completeUrl = new URL(href, websiteRoot).href;
                    return fileName.trim() + ': ' + completeUrl;
                });
                return linksTextArray.join('\n');
            });
            console.log('document_urls: '+document_urls);
        } catch(e){}

        //csv

        const status = 'open';
        let newLine = escapeCSV(name) + ',' +
                        status + ',' +
                        escapeCSV(description) + ',' + 
                        escapeCSV(start_date) + ',' + 
                        escapeCSV(end_date) + ',' + 
                        escapeCSV(url) + ',' + 
                        escapeCSV(application_url) + ',' + 
                        escapeCSV(document_urls) + ',' + '\n'; 
        fs.appendFile('output.csv', newLine, (err) => {
            if (err) throw err;
            console.log('CSV UPDATED');
        });
        await page.goBack();
    }
}

console.log("Finished");