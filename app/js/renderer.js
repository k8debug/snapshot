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

console.log('loading renderer.js');

//const path = require('path')
const os = require('os')
const { ipcRenderer } = require('electron')

const form = document.getElementById('snapshot-form')
const getcmd = document.getElementById('getcmd')
const prefix = document.getElementById('snap_prefix')

const homedir = os.homedir();

let logWindow;

document.getElementById('out-dir').value = homedir;

let textarea = document.getElementById('command-output');
textarea.value = 'Press GET SNAPSHOT button to start';

let logarea = document.getElementById('log-output');


//   Onsubmit sent values to main and create snapshot
form.addEventListener('submit', (e) => {
    e.preventDefault()

    // clear textarea
    let textarea = document.getElementById('command-output');
    textarea.value = '';

    // alert user the process is started
    M.toast({
        html: 'Collecting snapshot data',
        displayLength: 3000,
        classes: 'blue',
    })

    // get parms and send request to main
    let k8sCmdValue = 'kubectl';
    let prefixValue = 'snapshot';
    if (getcmd.value !== '') {
        k8sCmdValue = getcmd.value;
    }
    if (prefix.value !== '') {
        prefixValue = prefix.value;
    }

    ipcRenderer.send('snapshot:create', {
        'k8sCmd': k8sCmdValue,
        'prefix': prefixValue,
        'timeout': timeout.value
    })
})

// handle status information
ipcRenderer.on('status', (e, args) => {
    let color;
    if (args.status === 'fail') {
        color = 'red';
        M.toast({
            html: args.msg,
            classes: color,
        })
    } else if (args.status === 'done') {
        color = 'blue';
        M.toast({
            html: args.msg,
            classes: color,
        })
    } else if (args.status === 'count') {
        color = 'green';
        M.toast({
            html: args.msg,
            classes: color,
        })
    } else if (args.status === 'where') {
        //nothing
    }
    appendOutput(args.msg)
})

// update the output directory information
ipcRenderer.on('directory:set', (e, args) => {
    document.getElementById('out-dir').disabled = false;
    document.getElementById("out-dir").value = args.dir;
    document.getElementById('out-dir').disabled = true;
})


// build html element with log data and append to page
ipcRenderer.on('logmsg', (e, args) => {
    let msgs = args.messages
    let logData = '';
    for (let i = 0; i < msgs.length; i++) {
        //appendLogMsg().value += (msgs[i] + '\n');
        logData += (msgs[i] + '\n');
    }

    let logTextarea = document.createElement("textarea");
    logTextarea.name = "log-output";
    logTextarea.maxLength = "10000";
    logTextarea.cols = "120";
    logTextarea.rows = "80";
    logTextarea.style.height = "500px";
    logTextarea.style.width = "770px";
    logTextarea.style.marginLeft = "15px";
    logTextarea.style.marginRight = "15px";
    logTextarea.value = logData;

    logWindow = window.open(
        './logfile.html',
        'popup',
        'width=800,height=650'
    );

    logWindow.onload = () => {
        //now we have access to popup window dom   
        logWindow.document.body.appendChild(logTextarea);
    };
})

// update the output directory information
ipcRenderer.on('clearlog', () => {
    console.log('got clear message')
})

// send request to main for directory change
function getDirectory() {
    ipcRenderer.send('getdir');
}

// append msg to text area and scroll to the bottom
function appendOutput(msg) {
    getCommandOutput().value += (msg + '\n');
    textarea.scrollTop = textarea.scrollHeight;
};

// return textarea
function getCommandOutput() {
    return document.getElementById("command-output");
};
