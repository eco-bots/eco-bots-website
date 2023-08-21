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
const moment = require('moment');

initiate();

async function initiate() {
    console.log("-----------------------------");
    console.log("Starting...");

    let url = 'https://www.efre.gv.at/calls';
    
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
    
    let header = ['name', 'description', 'area', 'start_date', 'end_date', 'requirements', 'funding', 'contact', 'url', 'application_url']; 
    let csvContent = header.join(',') + '\n';

    fs.writeFile('output.csv', csvContent, (err) => {
        if (err) throw err;
        console.log('CSV saved');
    });

    const n_categories = await page.evaluate((i) => {
        return document.querySelectorAll(".calls.container > .call.flex").length;
    }, i);
    console.log('n_categories: ' + n_categories);
    
    for (var i = 0; i < n_categories; i++) {
        console.log("page: "+i);

        await page.waitForSelector(".calls.container a.more");
        await page.evaluate((i) => {
            document.querySelectorAll(".calls.container a.more")[i].click();
        }, i);
        await page.waitForNavigation({ waitUntil: 'networkidle2' });

        var layout = 1;

        try {
            if (layout == 1) {
                var name = await page.evaluate(() => {
                    let name_ = document.querySelector("h1").innerText;
                    return name_
                });
                console.log("1: "+name);
            } else {throw "layout2"}
        } catch(e){layout=2}

        try{
            if (layout == 1) {
                var description = await page.evaluate(() => {
                    let description_ = document.querySelector(".short-description").innerText;
                    return description_;
                });
                console.log("2: "+description);
            } else {throw "layout2"}
        } catch(e){layout=2;}
        
        try{
            if (layout == 1) {
                var area = await page.evaluate(() => {
                    let area_ = document.querySelector('.property-value.areas').innerText;
                    return area_;
                });
                console.log("3: "+area);
            } else {throw "layout2"}
        } catch(e){layout=2}

        try{
            if (layout == 1) {
                var terms = await page.evaluate(() => {
                    let terms_ = document.querySelector('.call-properties > .call-property:nth-child(3) > .property-value').innerText;
                    terms_ = terms_.split('-');
                    return terms_;
                });
                var start_date = moment(terms[0].trim(), 'DD.MM.YYYY').format('YYYY.MMM.DD');
                var end_date = moment(terms[1].trim(), 'DD.MM.YYYY').format('YYYY.MMM.DD');
    
                console.log("4: "+start_date);
                console.log("5: "+end_date);
            } else {throw "layout2"}
        } catch(e){layout=2}

        try{
            if (layout == 1) {
                var requirements = await page.evaluate(() => {
                    let requirements_ = document.querySelector('.call-properties > .call-property:nth-child(4)').innerText;
                    return requirements_;
                });
                console.log("6: "+requirements);
            } else {throw "layout2"}
        } catch(e){layout=2}

        try{
            if (layout == 1) {
                var funding = await page.evaluate(() => {
                    let funding_ = document.querySelector('.call-properties > .call-property:nth-child(5) > .property-value').innerText;
                    return funding_;
                });
                console.log("7: "+funding);
            } else {throw "layout2"}
        } catch(e){layout=2}

        try{
            if (layout == 1) {
                var contact = await page.evaluate(() => {
                    let contact_ = document.querySelector(".call-properties > .call-property:nth-child(8)").innerText;
                    return contact_;
                });
                console.log("8: "+contact);
            } else {throw "layout2"}
        } catch(e){layout=2}

        try{
            if (layout == 1) {
                var url = await page.evaluate(() => {
                    let url_ = window.location.href;
                    return url_;
                });
                console.log("9: "+url);
            } else {throw "layout2"}
        } catch(e){layout=2}

        try{
            if (layout == 1) {
                var application_url = await page.evaluate(() => {
                    let application_url_ = document.querySelector(".call-properties > .call-property:nth-child(9) > .property-value a").getAttribute('href');
                    return application_url_;
                });
                console.log("10: "+application_url);
            } else {throw "layout2"}
        } catch(e){layout=2}

        //csv
        let newLine = escapeCSV(name) + ',' +
                    escapeCSV(description) + ',' +
                    escapeCSV(area) + ',' +
                    escapeCSV(start_date) + ',' +
                    escapeCSV(end_date) + ',' +
                    escapeCSV(requirements) + ',' +
                    escapeCSV(funding) + ',' +
                    escapeCSV(contact) + ',' +
                    escapeCSV(url) + ',' +
                    escapeCSV(application_url) + ',' + '\n';

        fs.appendFile('output.csv', newLine, (err) => {
            if (err) throw err;
            console.log('CSV UPDATED');
        });

        await page.goBack();
    }
}

console.log("Finished");
