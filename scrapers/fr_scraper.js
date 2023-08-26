const fs = require('fs');


const openai = require("openai");
const moment = require('moment');
const puppeteer = require("puppeteer-extra");
const {initiate, escapeCSV, prepareCSV} = require('./common-functions.js');
// const request = require('request');
// require('dotenv').config();
// const stealthPlugin = require("puppeteer-extra-plugin-stealth")();
// var userAgent = require('user-agents');
// const WebSocket = require('ws');
// const Captcha = require("2captcha");
// const solver = new Captcha.Solver("bacb82f3e4caaf8f27995ea6ea94fa87");
// const {executablePath} = require('puppeteer');
// const { escape } = require('querystring');

const url = "https://fse.gouv.fr/les-appels-a-projets";
const apiKey = fs.readFileSync('./api_key', 'utf-8').trim();
const fileName = 'output.csv';
const header = ['name',
                'status',
                'description',
                'start_date',
                'end_date',
                'requirements',
                'funding',
                'contact',
                'url',
                'application_url',
                'document_urls'];

const openAI = new openai({
    apiKey: apiKey,
    });
start();

async function start() {
    prepareCSV(header, fileName);
    const page = await initiate(url, apiKey);

    await page.evaluate(() => {
        document.querySelector("#filterModal > form > fieldset > div.projects-filters > div:nth-child(1) > div > div.col.col-status > div > div > button").click();
        document.querySelector("#bs-select-3-2").click();
    });

    const totalCalls = await page.evaluate(() => {
        return document
            .querySelector("#projects-all h3")
            .textContent
            .match(/\d+/g);
    });
    console.log("totalCalls: " + totalCalls);

    let numOpenCalls = 0;

    while (numOpenCalls < totalCalls) {
        await page.evaluate(() => {
            document.querySelector('#load-more-published-projects').click();
        });

        numOpenCalls = await page.evaluate(() => {
            return document
                .querySelectorAll("#projects-all .project-status.green-status")
                .length
        });
    };
    console.log("numOpenCalls: " + numOpenCalls);

    for (var index = 0; index < numOpenCalls; index++) {
        await page.evaluate((index) => {
            let currentNode = document.querySelectorAll('#projects-all .project-status.green-status')[index];
            let parentWithClass = null;

            while (currentNode.parentNode) {
                if (currentNode.parentNode.classList.contains('project-item')) {
                  parentWithClass = currentNode.parentNode;
                  break;
                }
                currentNode = currentNode.parentNode;
            };

            parentWithClass.querySelector('.project-actions > a').click();
        }, index);
        await page.waitForNavigation({ waitUntil: 'networkidle2' });

        var text = await page.evaluate(() => {
            return document.querySelector('#main-content').innerText;
        });

        var name = await openAI.chat.completions.create({
            messages: [{ role: 'user', content: text + 'Extract the name of the project from the text. Return the shortest response possible.' }],
            model: 'gpt-3.5-turbo',
        });
        name = name.choices[0]['message']['content'];
        console.log('name: '+name);

        var description = await openAI.chat.completions.create({
            messages: [{ role: 'user', content: text + 'Extract the description of the project from the text. Return the shortest response possible.' }],
            model: 'gpt-3.5-turbo',
        });
        description = description.choices[0]['message']['content'];
        console.log('description: '+description);

        var start_date = await openAI.chat.completions.create({
            messages: [{ role: 'user', content: text + 'Extract the start date of the project from the text and return it in the format "DD.MM.YYYY". Return the shortest response possible.'}],
            model: 'gpt-3.5-turbo',
        });
        start_date = moment(start_date.choices[0]['message']['content'], 'DD.MM.YYYY').format('DD MMMM YYYY');
        console.log('start_date: '+start_date);

        var end_date = await openAI.chat.completions.create({
            messages: [{ role: 'user', content: text + 'Extract the closing date of the project from the text and return it in the format "DD.MM.YYYY". Return the shortest response possible.'}],
            model: 'gpt-3.5-turbo',
        });
        end_date = moment(end_date.choices[0]['message']['content'], 'DD.MM.YYYY').format('DD MMMM YYYY');
        console.log('end_date: '+end_date);

        var funding = await openAI.chat.completions.create({
            messages: [{ role: 'user', content: text + 'Extract the total funding or budget amount of the project from the text without currency. Exclude any additional text. If the funding is not given say NA.' }],
            model: 'gpt-3.5-turbo',
        });
        funding = funding.choices[0]['message']['content'];
        console.log('funding: '+funding);

        var requirements = await openAI.chat.completions.create({
            messages: [{ role: 'user', content: text + 'Extract the requirements of the project from the text. Return only the requirements themselves.' }],
            model: 'gpt-3.5-turbo',
        });
        requirements = requirements.choices[0]['message']['content'];
        console.log('requirements: '+requirements);

        var contact = await openAI.chat.completions.create({
            messages: [{ role: 'user', content: text + 'Extract the contact information of the project from the text. Return only the contact information itself. If the contact information is not given say NA.' }],
            model: 'gpt-3.5-turbo',
        });
        contact = contact.choices[0]['message']['content'];
        console.log('contact: '+contact);

        const url = await page.url();
        console.log('url: '+url);

        var documentUrls = await page.evaluate(() => {
            return document.querySelector('#main-content > div > div.main-inner-content > section > div.project-detail-info-section > div > div.project-detail-action > a.btn.btn-primary-default')
                .getAttribute('href');
        });
        console.log('documentUrls: '+documentUrls)

        const applicationUrl = '';
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
                escapeCSV(applicationUrl) + ',' + 
                escapeCSV(documentUrls) + ',' + '\n'; 
        fs.appendFile(fileName, newLine, (err) => {
            if (err) throw err;
            console.log('CSV UPDATED');
        });
        await page.goBack();
        await page.waitForTimeout(2000);

        await page.evaluate(() => {
            document.querySelector("#filterModal > form > fieldset > div.projects-filters > div:nth-child(1) > div > div.col.col-status > div > div > button").click();
            document.querySelector("#bs-select-3-2").click();
        });

        let openCalls = 0

        while (openCalls < totalCalls) {
            await page.evaluate(() => {
                document.querySelector('#load-more-published-projects').click();
            });
    
            openCalls = await page.evaluate(() => {
                return document
                    .querySelectorAll("#projects-all .project-status.green-status")
                    .length
            });
        };
    };
}

console.log("Finished");