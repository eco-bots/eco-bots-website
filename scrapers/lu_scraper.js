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

    let url= 'https://fonds-europeens.public.lu/fr/comment-participer/appels-en-cours.html';
    
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
    
    let header = ['name', 'status', 'description', 'start_date', 'end_date', 'requirements', 'funding', 'contact', 'url', 'application_url', 'document_urls']; 
    let csvContent = header.join(',') + '\n';

    fs.writeFile('output.csv', csvContent, (err) => {
        if (err) throw err;
        console.log('CSV saved');
    });

    const n_index = await page.evaluate(() => {
        return document.querySelectorAll('.search-results a').length
    });
    

    console.log("n_index: " + n_index);

    for (var index = 0; index < n_index; index++) {
        console.log("index: "+index);
        var layout = 1;

        await page.evaluate((index) => {
            let link = document.querySelectorAll('.search-results a')[index];
            link.removeAttribute("target");
            link.click();
        }, index);
        await page.waitForNavigation({ waitUntil: 'networkidle2' });



        try {
            if (layout == 1) {
                var text = await page.evaluate((index) => {
                    let text_ = document.querySelector('div.cmp-text:nth-child(1)').innerText;
                    return text_
                }, index);
            } else {throw "layout2"}
        } catch(e){layout=2}

        try {
            var name = await page.evaluate(() => {
                let name = document.querySelector('div.cmp-text:nth-child(2)').innerText;
                return name;
            });
            console.log('name: '+name);
        } catch(e){}

        try {
            var description = await openai.chat.completions.create({
                messages: [{ role: 'user', content: text + 'Extract the description of the project from the text. Return the shortest response possible.' }],
                model: 'gpt-3.5-turbo',
            });
            description = description.choices[0]['message']['content'];
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


        try {
            var funding = await openai.chat.completions.create({
                messages: [{ role: 'user', content: text + 'Extract the total funding or budget amount of the project from the text without currency. Exclude any additional text. If the funding is not given say NA.' }],
                model: 'gpt-3.5-turbo',
            });
            funding = funding.choices[0]['message']['content'];
            console.log('funding: '+funding);
        } catch(e){}

        try {
            var requirements = await openai.chat.completions.create({
                messages: [{ role: 'user', content: text + 'Extract the requirements of the project from the text. Return only the requirements themselves.' }],
                model: 'gpt-3.5-turbo',
            });
            requirements = requirements.choices[0]['message']['content'];
            console.log('requirements: '+requirements);
        } catch(e){}

        try {
            var contact = await openai.chat.completions.create({
                messages: [{ role: 'user', content: text + 'Extract the contact information of the project from the text. Return only the contact information itself.' }],
                model: 'gpt-3.5-turbo',
            });
            contact = contact.choices[0]['message']['content'];
            console.log('contact: '+contact);
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

        try{
            if (layout == 1) {
                var application_url = await page.evaluate(() => {
                    let application_url_ = document.querySelector('li.cmp-list__item:nth-child(4) > a:nth-child(1)').getAttribute('href');
                    return 'https://fonds-europeens.public.lu' + application_url_;
                });
            } else {throw "layout2"}
        } catch(e){layout=2}
        console.log('url: '+url);

        try {
            var document_urls = await page.evaluate(() => {
                let links = document.querySelectorAll('div.cmp-contentbox a');
                const linksTextArray = Array.from(links).map(link => {
                    const fileName = link.textContent
                    const href = link.getAttribute('href');
                    // if (link.startsWith('https')){
                    //     return fileName.trim() + ': ' + href;
                    // };

                    const websiteRoot = 'https://fonds-europeens.public.lu';
                    const completeUrl = new URL(href, websiteRoot).href;
                    return fileName.trim() + ': ' + completeUrl;
                });
                return linksTextArray.join('\n');
            });
            console.log('document_urls: '+document_urls);
        } catch(e){}

        //csv

        let header = ['name', 'status', 'description', 'start_date', 'end_date', 'requirements', 'funding', 'contact', 'url', 'application_url', 'document_urls'];
        const status = 'open';
        let newLine = escapeCSV(name) + ',' +
                        status + ',' +
                        escapeCSV(description) + ',' + 
                        escapeCSV(start_date) + ',' + 
                        escapeCSV(end_date) + ',' + 
                        escapeCSV(requirements) + ',' +
                        escapeCSV(funding) + ',' +
                        escapeCSV(contact) + ',' +
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