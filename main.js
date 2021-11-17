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

const path = require('path');
const os = require('os');
const fs = require('fs');
const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const slash = require('slash');
const log = require('electron-log');
const utl = require('./lib/utl');

const homedir = os.homedir();

let getData;
let baseDir = homedir;
let basePrefix = 'snapshot';
let cmdTimeout = 15000;
let dynDir;
let versions = [];
let mainWindow;
let aboutWindow;

// Set environment
//process.env.NODE_ENV = 'development';
process.env.NODE_ENV = 'production';

const isDev = process.env.NODE_ENV !== 'production' ? true : false;
const isMac = process.platform === 'darwin' ? true : false;

// need masOS path to find the command that will be used to get the k8s data
// assume it is /usr/local.bin'
if (isMac) {
  process.env.PATH = process.env.PATH + ':/usr/local/bin';
}

// display environment info
console.log('-------------------------------------------\nApplication enviroment information:');
console.log('-------------------------------------------');
for (const dependency of ['chrome', 'node', 'electron']) {
  versions.push({ 'process': dependency, 'version': process.versions[dependency] });
  console.log(' * ' + dependency + ' - Version: ' + process.versions[dependency]);
}
console.log(' * process.env.NODE_ENV: ' + process.env.NODE_ENV)
console.log(' * process.platform: ' + process.platform)
console.log('-------------------------------------------');


//--------------------------------
// window and dialog functions
//--------------------------------

// main window
function createMainWindow() {
  mainWindow = new BrowserWindow({
    title: 'Vpk Snapshot',
    show: false,
    width: isDev ? 1400 : 550,
    minWidth: 550,
    height: 875,
    minHeight: 875,
    icon: `${__dirname}/assets/icons/Icon_256x256.png`,
    resizable: isDev ? true : false,
    backgroundColor: '#f6f6f6',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: false,
      //preload: path.join(__dirname, "app/js/preload.js")
    },
  })

  if (isDev) {
    mainWindow.webContents.openDevTools()
  }

  mainWindow.on('ready-to-show', function () {
    mainWindow.show();
    mainWindow.focus();
  });

  // display html
  mainWindow.loadFile('./app/index.html')

  // show the output directory in UI
  mainWindow.webContents.send('directory:set', {
    'dir': baseDir
  })

}

// about window
function createAboutWindow() {
  aboutWindow = new BrowserWindow({
    title: 'About VpK Snapshot',
    width: 450,
    height: 600,
    icon: `${__dirname}/assets/icons/Icon_256x256.png`,
    resizable: false,
    backgroundColor: '#f6f6f6',
  })

  aboutWindow.loadFile('./app/about.html')
}

// help window
function createHelpWindow() {
  aboutWindow = new BrowserWindow({
    title: 'About VpK Snapshot',
    width: 450,
    height: 700,
    icon: `${__dirname}/assets/icons/Icon_256x256.png`,
    resizable: false,
    backgroundColor: '#f6f6f6',
  })

  aboutWindow.loadFile('./app/help.html')
}

// system dialog to get directory
function getDirectory() {
  let options = {
    // See place holder 1 in above image
    title: "Select output directory",

    buttonLabel: "Snapshot root directory",
    // See place holder 2 in above image
    defaultPath: homedir,

    properties: ['openDirectory']
  }

  //Synchronous
  let dir = dialog.showOpenDialogSync(mainWindow, options);
  console.log(dir)

  if (typeof dir !== 'undefined') {
    if (Array.isArray(dir)) {
      if (typeof dir[0] !== 'undefined') {
        baseDir = dir[0];
        console.log('sending dir change')
        mainWindow.webContents.send('directory:set', {
          'dir': baseDir
        });
      }
    }
  }
}


//--------------------------------
// app handlers
//--------------------------------

app.on('ready', () => {

  createMainWindow()

  const mainMenu = Menu.buildFromTemplate(menu)
  Menu.setApplicationMenu(mainMenu)

  mainWindow.on('ready', () => (mainWindow = null))
})

app.on('window-all-closed', () => {
  if (!isMac) {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow()
  }
})

app.allowRendererProcessReuse = true


//--------------------------------
// Custom menu configuration
//--------------------------------

const menu = [
  ...(isMac   // macOS
    ? [
      {
        label: app.name,
        submenu: [
          {
            label: 'About VpK Snapshot',
            click: createAboutWindow,
          },
          {
            label: 'Get Started',
            click: createHelpWindow,
          },
          {
            type: 'separator'
          },
          {
            label: 'Quit VpK Snapshot',
            accelerator: 'CmdOrCtrl+Q',
            click: () => app.quit(),
          },
        ],
      }
    ]
    : []),
  {
    role: 'fileMenu',
  },
  ...(!isMac    // Windows and Linux
    ? [
      {
        label: 'Help',
        submenu: [
          {
            label: 'Get Started',
            click: createHelpWindow,
          },
          {
            type: 'separator'
          },
          {
            label: 'About',
            click: createAboutWindow,
          },

        ],
      },
    ]
    : []),
  ...(isDev   // Development environment
    ? [
      {
        label: 'Developer',
        submenu: [
          { role: 'reload' },
          { role: 'forcereload' },
          { type: 'separator' },
          { role: 'toggledevtools' },
        ],
      },
    ]
    : []),
]


//------------------------------------
// Handle ipc messages sent to main.js
//------------------------------------

ipcMain.on('getdir', () => {
  getDirectory();
})

ipcMain.on('snapshot:create', (e, options) => {

  if (options.prefix !== '') {
    basePrefix = options.prefix;
  }

  if (options.timeout !== '') {
    let tmp = parseInt(options.timeout);
    let check = Number.isInteger(tmp);
    if (check) {
      cmdTimeout = tmp * 1000;
      console.log('Custom CLI timeout: ' + cmdTimeout + ' milliseconds');
    }
    tmp = null;
    check = null;
  }

  getSnapShot(options.k8sCmd, basePrefix)

})

//--------------------------------
// kubernetes related functions
//--------------------------------

// Obtain information from k8s by:
// 1) get list of all api resources and parse for resources that allow get
// 2) loop through resourcess that support get obtaining all defined along with resource explain
function getSnapShot(k8sCmd) {
  getData = { 'items': [] };;  // clear any existing data from variable
  const execSync = require('child_process').execSync;
  let cmd;
  let apiOut;
  let apiKeys;
  let apiTypes;

  // get list of api resources and parse
  try {
    cmd = k8sCmd + ' api-resources -o wide';
    apiOut = execSync(cmd, { timeout: cmdTimeout }).toString();
    apiTypes = parseAPIs(apiOut);
    apiKeys = Object.keys(apiTypes);
  } catch (err) {

    let eMsg = 'Get api-resource error: ' + err.message;

    // invalid or missing command
    if (err.message.indexOf('command not found') > -1) {
      eMsg = 'Provided k8s CLI command: ' + k8sCmd + ' - was not found';
    }

    // command timeout
    if (err.message.indexOf('ETIMEDOUT') > -1) {
      let tMsg = cmdTimeout / 1000;
      eMsg = 'Waited ' + tMsg + ' second(s) for command, timeout occurred';
    }

    mainWindow.webContents.send('status', {
      'msg': eMsg,
      'status': 'fail'
    })

    console.log('Get api-resource error: ' + err.message);
    console.log(err.stack);
    return;
  }

  let key;
  let kind;
  let ns;
  let rtnData;

  try {
    for (let k = 0; k < apiKeys.length; k++) {
      key = apiKeys[k];
      kind = apiTypes[key].kind;
      kind = kind.toLowerCase();
      ns = apiTypes[key].namespaced;
      rtnData = getK8sInfo(k8sCmd, kind, ns);
      saveData(rtnData);
    }

  } catch (err) {
    mainWindow.webContents.send('status', {
      'msg': 'GetSnapShot error: ' + err.message,
      'status': 'fail'
    })
    console.log('GetSnapShot error: ' + err.message)
    console.log(err.stack)
  }

  try {
    let writeCnt = writeData(baseDir, basePrefix);

    if (writeCnt > 0) {
      mainWindow.webContents.send('status', {
        'msg': '----------------------------------',
        'status': 'where'
      })

      mainWindow.webContents.send('status', {
        'msg': 'Snapshot resource files created',
        'status': 'count'
      })

      mainWindow.webContents.send('status', {
        'msg': 'Directory: ' + dynDir,
        'status': 'where'
      })
    } else {
      mainWindow.webContents.send('status', {
        'msg': 'No resource files created',
        'status': 'fail'
      })
    }
  } catch (err) {
    mainWindow.webContents.send('status', {
      'msg': 'Write file error: ' + err.message,
      'status': 'fail'
    })
    console.log('Write file error: ' + err.message)
    console.log(err.stack)
  }

};

function saveData(data) {
  try {
    if (typeof data === 'undefined') {
      return;
    }
    if (data.length === 0) {
      return;
    }
    if (data.startsWith('{')) {
      let yf = JSON.parse(data);
      let it;
      for (it = 0; it < yf.items.length; it++) {
        item = yf.items[it];
        getData.items.push(item);
      }
    } else {
      console.log('WARNING: Returned get data not JSON structure');
    }
  } catch (err) {
    mainWindow.webContents.send('status', {
      'msg': 'Save data error: ' + err.message,
      'status': 'fail'
    })
    console.log(err.message)
    console.log(err.stack)
  }
}


// get the resources and explains from kubernetes
function getK8sInfo(k8sCmd, kind, ns) {
  let execOut;
  let cmd;
  let explainOut;

  try {
    const execSync = require('child_process').execSync;

    // build get command to execute, if resource is namespace defined add parameter
    if (ns === true) {
      cmd = k8sCmd + ' get ' + kind + ' --all-namespaces -o json';
    } else {
      cmd = k8sCmd + ' get ' + kind + ' -o json';
    }

    // send cmd to UI
    mainWindow.webContents.send('status', {
      'msg': cmd,
      'status': 'pass'
    })

    // get resource information from k8s
    execOut = execSync(cmd, { maxBuffer: 50 * 1024 * 1024, timeout: cmdTimeout }).toString();

    // build explain command to execute, obtain the resource definition 
    cmd = k8sCmd + ' explain ' + kind;

    // get resource explain
    explainOut = execSync(cmd).toString();

    // split and save needed information
    explainOut = explainOut.split('FIELDS:')
    explainOut = explainOut[0];

  } catch (err) {
    let eMsg = err.message;
    // these errors are ignored
    if (eMsg.indexOf("the server doesn't have a resource type") > -1) {
      eMsg = '';
    }
    if (eMsg.indexOf("the server does not allow this method on the requested resource") > -1) {
      eMsg = '';
    }
    if (eMsg.indexOf("the server could not find the requested resource") > -1) {
      eMsg = '';
    }

    if (eMsg !== '') {
      mainWindow.webContents.send('status', {
        'msg': 'Get K8s error: ' + eMsg,
        'status': 'fail'
      })
      console.log(err.message);
      console.log(err.stack);
    }
  }
  return execOut;
};

// Parse the data and build object with resources that support verb 'get'
function parseAPIs(data) {
  let apitypes = [];
  if (typeof data === 'undefined') {
    return apitypes;
  }
  let i;
  try {
    let tmp = data.split('\n');
    let hl = tmp.length;
    if (hl < 1) {
      return []
    }

    // Get starting positions of data from heading of report
    let nPos = tmp[0].indexOf('NAMESPACED');
    let vPos = tmp[0].indexOf('VERBS');
    let ePos = tmp[0].indexOf('SHORT');
    let gPos = tmp[0].indexOf('APIGROUP');
    let kPos = tmp[0].indexOf('KIND');

    ePos = ePos - 1;
    let item;
    let entry;
    let wrk;
    let found = ':';
    let kind;
    let fp;
    let nsd;
    let kindCap;
    let key;

    // skip first line of report as it was the headings
    for (i = 1; i < hl; i++) {
      item = tmp[i];
      fp = item.indexOf(' ');
      kind = item.substring(0, fp);
      //console.log('kind: ' + kind)
      if (found.indexOf(':' + kind + ':') > -1) {
        // already found this kind so skip this instance
        continue;
      } else {
        found = found + kind + ':';
      }

      if (item.length > vPos) {
        wrk = item.substring(vPos);
        // if verb get is found create entry
        if (wrk.indexOf('get') > -1) {
          entry = item.substring(0, ePos);
          entry = entry.trim() + ':' + item.substring(nPos, nPos + 1);

          // build apikeys
          let apiG = item.substring(gPos, nPos - 1);
          apiG = apiG.trim();
          if (apiG.length === 0) {
            apiG = '-none-'
          }
          kindCap = item.substring(kPos, vPos - 1);
          kindCap = kindCap.trim();
          nsd = item.substring(nPos, kPos - 1);
          nsd = nsd.trim();
          key = apiG + ':' + kindCap;
          if (typeof apitypes[key] === 'undefined') {
            let atype = {};
            atype.group = apiG;
            atype.kind = kindCap;
            atype.namespaced = nsd;
            apitypes[key] = atype;
          }
        } else {
          //console.log('Skipped api-resource does not support get verb: ' + kind);
        }
      }
    }
  } catch (err) {
    mainWindow.webContents.send('status', {
      'msg': 'Parse APIs error: ' + err.message,
      'status': 'fail'
    })
    console.log(err.message)
    console.log(err.stack)
  }

  console.log(i + ' api resources found')
  return apitypes;
};


// Save extracted JSON data to a seperate file for each resource.  
//
// Saved file names are:    config####.yaml
// #### starts at 1000 and increments by one for each resource.
//
// Note: 
// The file contents are JSON but the file is named with .yaml
//
function writeData(dir, prefix) {

  dynDir = utl.bldDirname(baseDir, prefix);
  let cnt = 0;

  try {
    let mkresult = utl.makedir(dynDir);
    if (mkresult === 'PASS') {
      let fnum = 1000;
      let fn;
      let oldKind = '@startUp';
      let input;
      let dispFnum = 0;

      for (var i = 0; i < getData.items.length; i++) {
        input = getData.items[i];
        if (typeof input.kind !== 'undefined') {
          if (oldKind !== input.kind) {
            if (oldKind === '@startUp') {
              dispFnum = fnum;
            } else {
              dispFnum = fnum + 1;
            }
            console.log('Resource type: ' + input.kind + ' starts at file : config' + dispFnum + '.yaml')
            oldKind = input.kind;
          }
        }
        input = JSON.stringify(input, null, 4);
        fnum++;
        fn = dynDir + '/' + 'config' + fnum + '.yaml';
        fs.writeFileSync(fn, input);
        cnt++
      }
      console.log('Created ' + cnt + ' resource files');
    } else {
      mainWindow.webContents.send('status', {
        'msg': 'Unable to create directory: ' + dynDir,
        'status': 'fail'
      })
      console.log('Unable to create directory: ' + dynDir);
    }
  } catch (err) {
    mainWindow.webContents.send('status', {
      'msg': 'WriteData error: ' + err.message,
      'status': 'fail'
    })
    console.log(err.message)
    console.log(err.stack)
  }

  return cnt;
}
