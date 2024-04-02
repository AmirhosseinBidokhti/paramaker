#!/usr/bin/env node

const { program } = require('commander');
const fs = require('fs');
const xml2js = require('xml2js');

// Define command line options
program
    .requiredOption('-u, --url <url>', 'URL to modify') // Required option
    .option('-p, --params <params>', 'Params list separated by commas or path to file containing params')
    .option('-c, --count <count>', 'Count for params file (optional)')
    .requiredOption('-d, --data <data>', 'Data value') // Required option
    .requiredOption('-o, --output <output>', 'Output format (url, nice, json, bodyurl, xml)', 'url') // Required option
    .option('-e, --encode <encode>', 'Preprocess data value (url, 2url, html, 2html, htmlurl)', 'none')
    .parse(process.argv);

// Function to read params from file if provided
function readParamsFromFile(paramFilePath, count) {
    if (!paramFilePath) return [];

    try {
        const paramFileData = fs.readFileSync(paramFilePath, 'utf-8');
        const params = paramFileData.split('\n').slice(0, count || undefined);
        return params;
    } catch (error) {
        throw new Error('Error reading params file:', error.message);
    }
}

// Function to preprocess data value based on encoding option
function preprocessData(data, encode) {
    switch (encode) {
        case 'url':
            return encodeURIComponent(data);
        case '2url':
            return encodeURIComponent(encodeURIComponent(data));
        case 'html':
            return htmlEncode(data);
        case '2html':
            return htmlEncode(htmlEncode(data));
        case 'htmlurl':
            return encodeURIComponent(htmlEncode(data));
        default:
            return data;
    }
}

// Function to HTML encode special characters
function htmlEncode(str) {
    return str.replace(/[\u00A0-\u9999<>\&]/gim, function(i) {
        return '&#'+i.charCodeAt(0)+';';
    });
}

// Function to generate output based on output format option
// TODO: Handle existence of parameters in url
function generateUrl(url, params, data, output) {
    let generatedOutput = '';

    if (output === 'url' || output === 'bodyurl') {
        generatedOutput += params.map(param => `${param}=${data}`).join('&');
    } else if (output === 'nice') {
        params.forEach(param => {
            generatedOutput = url;
            generatedOutput += `/${param}/${data}`;
        });
    } else if (output === 'json') {
        const jsonBody = {};
        params.forEach(param => {
            jsonBody[param] = data;
        });
        generatedOutput = JSON.stringify(jsonBody, null, 4);
    } else if (output === 'xml') {
        const builder = new xml2js.Builder({ rootName: 'root', renderOpts: { pretty: true } });
        const xmlObj = {};
        params.forEach(param => {
            xmlObj[param] = data;
        });
        generatedOutput = builder.buildObject(xmlObj);
    }

    if (output === 'url' && url) {
        // Check if URL already contains parameters
        const separator = url.includes('?') ? '&' : '?';
        generatedOutput = `${url}${separator}${generatedOutput}`;
    }

    return generatedOutput;
}


// Main function
function main() {
    try {
        // Get options values
        const { url, params: paramInput, count, data, output, encode } = program.opts();

        // Check for missing required arguments
        if (!url) {
            throw new Error('Missing required argument: -u, --url <url>');
        }
        if (!data) {
            throw new Error('Missing required argument: -d, --data <data>');
        }
        if (!output) {
            throw new Error('Missing required argument: -o, --output <output>');
        }

        // Parse params either from input string or file
        let params = [];
        if (paramInput) {
            params = paramInput.includes('.txt') ? readParamsFromFile(paramInput, count) : paramInput.split(',');
        }

        // Preprocess data value if encoding option is provided
        dataValue = preprocessData(data, encode);

        // Generate output based on options
        const generatedOutput = generateUrl(url, params, dataValue, output);
        console.log(generatedOutput);
    } catch (error) {
        console.error('Error:', error.message);
    }
}

// Execute main function
main();
