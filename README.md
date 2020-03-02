# Network Speed Tester Progressive Web App
![ES8 Network-Speed-Tester](/screenshot.png?raw=true)

Test it -> [https://network-speed-tester.now.sh/](https://network-speed-tester.now.sh/)

This is a PWA playground for testing browser APIs capabilities.
Beside the fancy and user friendly look, this app is build with some advanced features
of ES8 Javascript and CSS, like this:

- SharedArrayBuffer
- Performance.now
- Fetch
- ServiceWorker
- Manifest
- Grid responsive layout 

This is just an up-to-date version from 2017 ( https://github.com/glococo/onefile-speedtester )

There is still room to be improved, like:
- make more than one down/upload request to use the maximum
- use the latest OpenStreetMap API

## Compatibility
Some newest Web Browsers had support for SharedArrayBuffer till January 2018. It was disabled
later due to Spectre & Meltdown vulnerabilities. This was intended as a temporary measure until other mitigations were in place.
Some of them, re-enabled it.

- Desktop: Chrome 68 or newer
- Desktop: Edge 79 or newer
- Desktop: Opera 64 or newer
- Desktop: Firefox +57 with "about:config" -> "javascript.options.shared_memory" flag enabled

- Android: Chrome +64 with "chrome://flags" -> "WebAssembly threads support" flag enabled
- Android: Firefox +57 with "about:config" -> "javascript.options.shared_memory" flag enabled
- Android: Opera not supported
- Android: Edge not supported

## Features
* Customizable test duration
* Individual and total Percentage 
* Download speed in Mbps and MB, and total downloaded
* Upload speed in Mbps and MB, and total uploaded
* Ping
* Jitter
* IP Address
* OpenStreetMap background with GeoLocation 
* Server log file loging
* Responsive

## Requirements
* Node JS

## How to use in your site
git clone https://github.com/glococo/network-speed-tester.git
node api/index.js

## License
Copyright (C) 2020 Guillermo Lo Coco

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Lesser General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU Lesser General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/lgpl>.
