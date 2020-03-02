#!/usr/bin/env node
'use strict'
const log  = (...v) => console.log( ...v )
const now  =      _ => `[ ${new Date().toISOString().slice(0,19)} ] : `
const fs            = require('fs')
const http          = require('http')
const path          = require('path')

var   fileLog       = true   // do not work with Now.sh (read only FS)
var   nowHost       = false

if ( require.main === module ) {
  http.createServer( networkSpeedTestService ).listen(80)    // In linux you need root privileges to use port 80
  log( `${now()} ServerStarted` )
} else {
  if( process.env.NOW_REGION ) {   // running on Now.sh
    fileLog = false
    nowHost = true
  }
  log( process.env )
  module.exports = networkSpeedTestService
}

// In memory garbage buffer == best performance/fast response
// trash.bin size is max HTTP payload at AWS Zeit platform
const file = fs.readFileSync( path.join(__dirname, 'trash.bin') )
if( fileLog ) fs.appendFileSync('speedtester.log', `${now()} ServerStarted \n`)

async function networkSpeedTestService (req, res) {
  var url={}
  req.url.split("?").length<2?url="":req.url.split("?")[1].split("&").forEach(e=> url[e.split("=")[0]]=e.split("=")[1])
  switch( url["action"] ) {
    case "upload":
      res.writeHead(200, {'Content-Type': 'text/html', 'Cache-Control': 'no-cache' })
      res.end('upload')
    case "ping":
      res.writeHead(200, {'Content-Type': 'text/html', 'Cache-Control': 'no-cache' })
      res.end('ping')
      break
    case "download":
      if( fileLog) fs.appendFileSync('speedtester.log', `${now()} Request from -> ${getIP(req)}\n`)
      if( !nowHost) log( `${now()} Request from -> ${getIP(req)}` )
      res.writeHead(200, {'Content-Type':'application/octet-stream','Content-Disposition':'attachment; filename=random.dat','Content-Transfer-Encoding':'binary'})
      if( !nowHost ) for( let i=0; i<20; i++) await res.write( file )
      res.end( file )

      // Read file Sync on every request ( bad idea )
      // let file = fs.readFileSync( path.join(__dirname, 'trash.bin') )

      // Read async trash.bin takes the same amount of time to read the file than readFileSync
      // fs.readFile( path.join(__dirname, 'trash.bin'), (err,data)=> res.end(data) )

      // Read chunks of trash.bin and send those small packets as soon as it is been reading, better idea
      // let readStream = fs.createReadStream( path.join(__dirname, 'trash.bin') )
      // readStream.on('data', data => res.write(data) )
      // readStream.on( 'end', data => res.end() )

      break
    default:
      res.writeHead(200, {'Content-Type': 'text/html', 'Cache-Control': 'no-cache' })
      res.end('..')
  }
}

function getIP (eq){
  var reg=/^(?!0)(?!.*\.$)((1?\d?\d|25[0-5]|2[0-4]\d)(\.|$)){4}$/
  var arr= ['x-client-ip','x-forwarded-for','cf-connecting-ip','true-client-ip','x-real-ip','x-cluster-client-ip','x-forwarded','forwarded-for']
  var head_id=arr.find(e=>(eq.headers[e]!=undefined && eq.headers[e].match(reg)) )
  if (head_id) { return eq.headers[head_id] } else { return '127.0.0.1' }
}
