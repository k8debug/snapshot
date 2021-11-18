# VpK Snapshot

A desktop app built using Electron.  The applicaiton creates a snapshot of a kubernetes cluster that is used by VpK (Visual parsed Kubernetes).  VpK Snapshot
is only needed when VpK is launched via a container.  When VpK is launched as a container the snapshot directory is located on the machine running the container
and not in the container.  Refer to VpK documentation for additional information regarding running VpK in a container.

## Usage

### Install Dependencies

```
npm install
```

### Run

```
npm start
npm run dev (with Nodemon)
```

### Package

```
npm run package-mac
npm run package-win
npm run package-linux
```


## LICENSE

Copyright (c) 2018-2021 K8Debug

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
