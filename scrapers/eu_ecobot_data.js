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


//const axios = require("axios");
//const Captcha = require("2captcha");

["chrome.runtime", "navigator.languages"].forEach(a =>
    stealthPlugin.enabledEvasions.delete(a)
);

//puppeteer.use(stealthPlugin);
//const solver = new Captcha.Solver("bacb82f3e4caaf8f27995ea6ea94fa87");



initiate();

async function initiate() {
    console.log("-----------------------------");
    console.log("Starting...");
//    let url = 'https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/opportunities/topic-search;callCode=null;freeTextSearchKeyword=;matchWholeText=false;typeCodes=1,0;statusCodes=31094502,31094501;programmePeriod=null;programCcm2Id=null;programDivisionCode=null;focusAreaCode=null;destinationGroup=null;missionGroup=null;geographicalZonesCode=null;programmeDivisionProspect=null;startDateLte=null;startDateGte=null;crossCuttingPriorityCode=null;cpvCode=null;performanceOfDelivery=null;sortQuery=sortStatus;orderBy=asc;onlyTenders=false;topicListKey=topicSearchTablePageState';
    
    let url = 'https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/opportunities/topic-search;callCode=null;freeTextSearchKeyword=;matchWholeText=false;typeCodes=1,2,8;statusCodes=31094502,31094501;programmePeriod=null;programCcm2Id=null;programDivisionCode=null;focusAreaCode=null;destinationGroup=null;missionGroup=null;geographicalZonesCode=null;programmeDivisionProspect=null;startDateLte=null;startDateGte=null;crossCuttingPriorityCode=null;cpvCode=null;performanceOfDelivery=null;sortQuery=sortStatus;orderBy=asc;onlyTenders=false;topicListKey=topicSearchTablePageState';
    
    var browser = await puppeteer.launch({
        headless: false,
        userDataDir: "./user_data",
    });
    console.log("Opening Browser");
    const page = await browser.newPage();
//    await page.setUserAgent(userAgent.toString())
    await page.setDefaultNavigationTimeout(0);

//    await page.setDefaultNavigationTimeout(120000); 
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
    
    let header = ['name', 'program', 'url', 'status', 'opening_date', 'deadline', 'description', 'destination', 'conditions']; 
    let csvContent = header.join(',') + '\n';

    fs.writeFile('output.csv', csvContent, (err) => {
        if (err) throw err;
        console.log('CSV saved');
    });
    
    await page.waitForSelector(".ui-g");
    await page.waitForTimeout(5000);
    
    var all_program_urls = [];
    
    for (var i = 0; i < 24; i++) {
        console.log("page: "+i);
        for (var index = 0; index < 50; index++) {
            console.log("index: "+index);
            var layout = 1;
            try {
                if (layout == 1) {
                    var name = await page.evaluate((index) => {
                        let name_ = document.querySelectorAll(".p-row")[index].querySelectorAll("a")[0].innerText;
                        return name_
                    }, index);
                    console.log("1: "+name);
                } else {throw "layout2"}
            } catch(e){layout=2}
            
            try{
                if (layout == 1) {
                    var funding_url = await page.evaluate((index) => {
                        let funding_url_ = "https://ec.europa.eu"+document.querySelectorAll(".p-row")[index].querySelectorAll("a")[0].getAttribute("href");
                        return funding_url_
                    }, index);
                    console.log("3: "+funding_url);
                } else {throw "layout2"}
            } catch(e){layout=2}

            try{
                if (layout == 1) {
                    var status = await page.evaluate((index) => {
                        let status_ = document.querySelectorAll(".p-row")[index].querySelectorAll(".status")[0].innerText;
                        return status_
                    }, index);
                    console.log("4: "+status);
                } else {throw "layout2"}
            } catch(e){
                layout=2;
            }

            try{
                if (layout == 1) {
                    var deadline = await page.evaluate((index) => {
                        let deadline_ = document.querySelectorAll(".p-row")[index].querySelectorAll("td")[11].innerText;
                        return deadline_
                    }, index);
                    console.log("6: "+deadline);
                } else {throw "layout2"}
            } catch(e){
                layout=2;
                var deadline = await page.evaluate((index) => {
                    let deadline_ = document.querySelectorAll(".p-row")[index].querySelectorAll("span")[5].innerText;
                    return deadline_
                }, index);
                console.log("6.2: "+deadline);
            }
            
            try{
                if (layout == 1) {
                    var opening_date = await page.evaluate((index) => {
                        let opening_date_ = document.querySelectorAll(".p-row")[index].querySelectorAll("td")[5].innerText;
                        return opening_date_
                    }, index);
                    console.log("5: "+opening_date);
                } else {throw "layout2"}
            } catch(e){
                layout=2;
                var opening_date = await page.evaluate((index) => {
                    let opening_date_ = document.querySelectorAll(".p-row")[index].querySelectorAll("span")[4].innerText;
                    return opening_date_
                }, index);
                console.log("5.2: "+opening_date);
            }
            
            try{
                if (layout == 1) {
                    var program = await page.evaluate((index) => {
                        let program_ = document.querySelectorAll(".p-row")[index].querySelectorAll("td")[1].innerText;
                        return program_
                    }, index);
                    console.log("2: "+program);
                } else {throw "layout2"}
            } catch(e){
                layout=2;
                var program = "";
            }
            
            try {
                if (layout == 1) {
                    var description = await page.evaluate((index) => {
                        let description_ = document.querySelector('[label="Topic description"]').innerText;
                        return description_
                    }, index);
                    console.log("1: "+description);
                } else {throw "layout2"}
            } catch(e){
                layout=2;
                var description = "";
            }
            
            try {
                if (layout == 1) {
                    var destination = await page.evaluate((index) => {
                        let destination_ = document.querySelector('[label="Destination"]').innerText;
                        return destination_
                    }, index);
                    console.log("1: "+destination);
                } else {throw "layout2"}
            } catch(e){
                layout=2;
                var destination = "";
            }
            
            try {
                if (layout == 1) {
                    var conditions = await page.evaluate((index) => {
                        let conditions_ = document.querySelector('[label="Topic conditions and documents"]').innerText;
                        return conditions_
                    }, index);
                    console.log("1: "+conditions);
                } else {throw "layout2"}
            } catch(e){
                layout=2;
                var conditions = "";
            }

            //csv+array append program
            all_program_urls.push(funding_url);

            //csv
            let newLine = escapeCSV(name) + ',' + escapeCSV(program) + ',' + escapeCSV(funding_url) + ',' + escapeCSV(status) + ',' + escapeCSV(opening_date) + ',' + escapeCSV(deadline) + '\n' + escapeCSV(description) + '\n' + escapeCSV(destination) + '\n' + escapeCSV(conditions) + '\n';
            fs.appendFile('output.csv', newLine, (err) => {
              if (err) throw err;
              console.log('CSV UPDATED');
            });

            await page.waitForTimeout(100);
        }

        //after end of loop click on next button
        await page.evaluate(() => {
            document.querySelectorAll(".ui-paginator-next")[0].click()
        });
        console.log("50 Added for Page "+(i+1));
        await page.waitForTimeout(5000);
    }
}

async function next(page) {
    
}

console.log("Finished");
