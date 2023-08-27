const fs = require('fs');

const openai = require("openai");
const moment = require('moment');
const {initiate, escapeCSV, prepareCSV} = require('./common-functions.js');

const url = 'https://fonds-europeens.public.lu/fr/comment-participer/appels-en-cours.html';
    // 'https://fonds-europeens.public.lu/fr/comment-participer/appels-futurs.html'
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
    // prepareCSV(header, fileName);

    const page = await initiate(url, apiKey);

    const numOpenCalls = await page.evaluate(() => {
        return document.querySelectorAll('.search-results a').length
    });
    
    console.log("numOpenCalls: " + numOpenCalls);

    for (var index = 0; index < numOpenCalls; index++) {
        await page.evaluate((index) => {
            document.querySelectorAll('.search-results a')[index].click();
        }, index);
        await page.waitForNavigation({ waitUntil: 'networkidle2' });

        var text = await page.evaluate(() => {
            return document.querySelector('#main').innerText;
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
            messages: [{ role: 'user', content: text + 'Extract the total funding or budget amount of the project from the text without currency. Exclude any additional text. If the information about funding is not given say NA.' }],
            model: 'gpt-3.5-turbo',
        });
        funding = funding.choices[0]['message']['content'].replace(/[!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~]/g, ' ');;
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
            let links = document.querySelectorAll('div.cmp-contentbox a');
            const linksTextArray = Array.from(links).map(link => {
                const fileName = link.textContent
                const href = link.getAttribute('href');
                const websiteRoot = 'https://fonds-europeens.public.lu';
                const completeUrl = new URL(href, websiteRoot).href;
                return fileName.trim() + ': ' + completeUrl;
            });
            return linksTextArray.join('\n');
        });
        console.log('documentUrls: '+documentUrls);

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
    };
}

console.log("Finished");