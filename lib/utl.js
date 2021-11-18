/*
Copyright (c) 2018-2021 K8Debug

Permission is hereby granted, free of charge, to any person obtaining a copy of this software 
and associated documentation files (the "Software"), to deal in the Software without restriction, 
including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, 
and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, 
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial 
portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT 
LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. 
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, 
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE 
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

/*----------------------------------------------------------
Common utility functions
*/

'use strict';

const fs = require('fs');
const fse = require('fs-extra');
const fsPath = require('path');

// local routine to output message to console.
const logIt = function (msg) {
    //var output = new Date().toLocaleString() + ' :: ' + msg;
    console.log(msg);
};

//------------------------------------------------------------------------------
// build date and time string 
//------------------------------------------------------------------------------
function dirDate() {
    let dStr = new Date().toISOString();
    let fp;
    fp = dStr.indexOf('T');
    if (fp > -1) {
        dStr = dStr.substring(0, fp) + '-' + dStr.substring(fp + 1);
    }
    fp = dStr.indexOf(':');
    if (fp > -1) {
        dStr = dStr.substring(0, fp) + 'h-' + dStr.substring(fp + 1);
    }
    fp = dStr.indexOf(':');
    if (fp > -1) {
        dStr = dStr.substring(0, fp) + 'm-' + dStr.substring(fp + 1);
    }

    fp = dStr.indexOf('.');
    if (fp > -1) {
        dStr = dStr.substring(0, fp) + 's';
    }
    return dStr;
}


//------------------------------------------------------------------------------
// exported common routines
//------------------------------------------------------------------------------
module.exports = {

    //------------------------------------------------------------------------------
    // create directory name with base, prefix, and date time 
    //------------------------------------------------------------------------------

    bldDirname: function (dir, prefix) {
        if (typeof dir === 'undefined') {
            dir = process.cwd();
        }

        let tmpDir = '';
        let dTmp;
        let fsps;
        let slp;
        // set the new directory name
        if (typeof prefix !== 'undefined') {
            dTmp = prefix;
            dTmp.trim();
            // check for spaces and only use what is before the first space
            fsps = dTmp.indexOf(' ');
            if (fsps > -1) {
                dTmp = dTmp.substring(0, fsps);
            }
            tmpDir = dTmp;
        } else {
            tmpDir = 'snapshot';
        }
        tmpDir = tmpDir + '-' + dirDate();

        slp = tmpDir.lastIndexOf('/');

        if (slp > -1) {
            slp++;
            tmpDir = tmpDir.substring(slp);
        }

        dir = dir + '/' + tmpDir;
        return dir;
    },


    //------------------------------------------------------------------------------
    // create a directory 
    //------------------------------------------------------------------------------
    makedir: function (dir) {
        try {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir);
                logIt('Created directory: ' + dir);
            }
            return 'PASS';
        } catch (err) {
            logIt('Failed to create directory: ' + dir + ' error message: ' + err.message);
            logIt(err.stack);
            return 'FAIL';
        }
    },

    //------------------------------------------------------------------------------
    // write the explains file
    //------------------------------------------------------------------------------
    writeExplains: function (dir, explains) {
        let fn = dir + '/explains.json';
        try {
            let keys = Object.keys(explains);
            let doc = '';
            if (keys.length > 0) {
                doc = JSON.stringify(explains)
                fs.writeFileSync(fn, doc);
                logIt('Created explains file: ' + fn);
            }
        } catch (err) {
            logIt('Error saving file: ' + fn + ' message: ' + err.message);
            logIt(err.stack);
        }

    },


    //end of export    
};
