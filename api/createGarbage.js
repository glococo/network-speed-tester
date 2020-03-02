#!/usr/bin/env node
'use strict'
const fs= require('fs')

let size    = 430  // Max payload size from Zeit on AWS
let bigbig  = new Float64Array(size*1000)

for( let i=0; i<size; ++i) bigbig[i]=Math.random()                // Random data
for( let i=0; i<1000; ++i) bigbig.copyWithin( size*i , 0, size)   // Duplicate random data is much faster than dev/random

fs.writeFileSync( 'trash.bin',  new Buffer.from(bigbig.buffer) )
