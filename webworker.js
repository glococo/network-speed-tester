'use strict'
var fw
const pCache    = 2000  // Wait 'x' miliseconds for TCP/IP window size increase and get cruise Speed
const compFactor= 1.13  // Compensation for HTTP+TCP+IP+ETH overhead. 925000 is how much data is actually carried over 1048576 (1mb) bytes downloaded/uploaded.
                        // This default value assumes HTTP+TCP+IPv4+ETH with typical MTUs over the Internet.
                        // You may want to change this if you're going through your local network with a different MTU or if you're going over IPv6

class SpeedTestFramework {
    constructor (sharedMemoryBuffer, url) {
        this.url = url,
        this.pingsAndSeconds = 20,
        this.testRun    = new Uint8Array(sharedMemoryBuffer,0,1),   // TestRun [0]Stop [1]Run [2]Finish [3]Cancel   [4]Ping/Jitter [5]Download [6]Upload
        this.pingJitt   = new Uint8Array(sharedMemoryBuffer,1,1),   // Work percentage done of Ping-Jitter
        this.download   = new Uint8Array(sharedMemoryBuffer,2,1),   // Work percentage done of Download
        this.upload     = new Uint8Array(sharedMemoryBuffer,3,1),   // Work percentage done of Upload
        this.vPing      = new Float32Array(sharedMemoryBuffer,4,1), // Ping value (float)
        this.vJitter    = new Float32Array(sharedMemoryBuffer,8,1), // Jitter value (float)
        this.vDownload  = new Float32Array(sharedMemoryBuffer,12,1), // Download value (float)
        this.vDownloadCu= new Float32Array(sharedMemoryBuffer,16,1), // Download current value (float)
        this.vDownloadMB= new Float32Array(sharedMemoryBuffer,20,1), // Downloaded MB value (float)
        this.vUpload    = new Float32Array(sharedMemoryBuffer,24,1), // Upload value (float)
        this.vUploadCu  = new Float32Array(sharedMemoryBuffer,28,1), // Upload current value (float)
        this.vUploadMB  = new Float32Array(sharedMemoryBuffer,32,1) // Uploaded MB value (float)
    }
    urlPing     = _=> this.url + '?action=ping&rnd=' + Math.random()
    urlDownload = _=> this.url + '?action=download&rnd=' + Math.random()
    urlUpload   = _=> this.url + '?action=upload&rnd=' + Math.random()
}
this.addEventListener('message', post=> {
  if( post.data.action=='Start' ) {
    fw = new SpeedTestFramework( post.data.memory, post.data.url )
    ping()
  }
  if( post.data.action=='Stop' ) fw.testRun[0]=3
})

function ping() {
  fw.testRun[0]  = 4
  fw.pingJitt[0] = 0
  fw.vPing[0]    = 0
  fw.vJitter[0]  = 0
  let ping    = []
  let jitter  = []
  let missedPing = 0

  function doPing() {
    let start= performance.now()
    fetch( fw.urlPing() ).then( response => {
      if( fw.testRun==3 ) return
      if( response.ok ) {
        let roundtripMs= performance.now()-start
        ping.push( roundtripMs )
        if( ping.length > 2) jitter.push( Math.abs( ping[ping.length-2] - roundtripMs ) )
        fw.pingJitt[0] = (ping.length+missedPing) / fw.pingsAndSeconds * 100
        fw.vPing[0]    = ping[ ping.length-1 ]
        if( jitter.length ) fw.vJitter[0] = jitter.reduce( (ac,e)=> ac+=e ) / jitter.length
      } else {
        missedPing++
      }
      if( (ping.length + missedPing) == fw.pingsAndSeconds ) return download()
      return doPing()
    })
    .catch( err => {
      missedPing++
      if( ( ping.length + missedPing) == fw.pingsAndSeconds ) return download()
      return doPing()
    })
  }

  doPing()
}

function download() {
  fw.testRun[0]     = 5
  fw.download[0]    = 0
  fw.vDownload[0]   = 0
  fw.vDownloadCu[0] = 0
  fw.vDownloadMB[0] = 0

  let bytesReceived   = 0
  let bytesDiscarded  = 0
  let msDiscarded     = 0
  let start= performance.now()

  function doDownload() {
    fetch( fw.urlDownload() ).then( response => {
      let reader= response.body.getReader()

      reader.read().then( function keepDL(data) {
        if( data.done )     return doDownload()
        if( fw.testRun==3 ) return reader.cancel()
        let elapsed        = performance.now() - start
        fw.download[0]     = elapsed /10 /fw.pingsAndSeconds
        bytesReceived     += data.value.length
        fw.vDownloadMB[0]  = bytesReceived/1024/1024
        if( elapsed >= pCache ) {
          fw.vDownload[0]  = ((bytesReceived-bytesDiscarded)/131072) /((elapsed-msDiscarded)/1000)
          fw.vDownloadCu[0]= fw.vDownload/8
        } else {
          bytesDiscarded= bytesReceived
          msDiscarded   = elapsed
        }
        if( elapsed > fw.pingsAndSeconds*1000 ) { reader.cancel(); return upload() }
        return reader.read().then(keepDL)
      })

    }).catch( e=>console.log(e) )
  }
  doDownload()
}

function upload() {   // using XHR instead of Fetch API because "Progress" in 2020 still can't be observed with Fetch API
  fw.testRun[0]    = 6
  fw.vUpload[0]     = 0
  fw.vUploadCu[0]   = 0
  fw.vUploadMB[0]   = 0
  let xhr, start
  let bytesSent = 0
  let bytesCurr = 0
  let msDiscarded = 0
  let bytesDiscarded = 0

  let size    = 1250   // 8*1250*1000 = 10MB  (Float64Array==8bytes, 1250 random float64 numbers, 1000 loops)
  let bigbig  = new Float64Array(size*1000)
  for( let i=0; i<size; ++i) bigbig[i]=Math.random()  // 1250*8 bytes of random garbage
  for( let i=0; i<1000; ++i) bigbig.copyWithin( size*i , 0, size)
  let gBlob = new Blob( bigbig )   // 10 MB upload file
  let fData = new FormData()
  fData.append("gfile", gBlob)

  start = performance.now()
  xhr   = new XMLHttpRequest()
  xhr.upload.onprogress = onProgress
  xhr.upload.onload     = onProgressEnd
  xhr.upload.onerror    = onErr
  xhr.open( 'POST', fw.urlUpload(), true )
  xhr.setRequestHeader('Content-Type','application/octet-stream')
  xhr.setRequestHeader('Content-Disposition','attachment; filename=random.dat')
  xhr.setRequestHeader('Content-Transfer-Encoding','binary')
  xhr.send( fData )

  function onErr (err) {
    console.log('Error', err)
    try { xhr.abort() } catch (e) { }
    if( fw.testRun==3 || fw.testRun==2 ) return
    xhr.open( 'POST', fw.urlUpload(), true )
    xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded")
    xhr.send( fData )
  }

  function onProgressEnd(progress){
    console.log('Complete', progress)
    onProgress(progress)
    bytesSent+= bytesCurr
    bytesCurr = 0
    xhr.open( 'POST', fw.urlUpload(), true )
    xhr.setRequestHeader('Content-Type','application/octet-stream')
    xhr.setRequestHeader('Content-Disposition','attachment; filename=random.dat')
    xhr.setRequestHeader('Content-Transfer-Encoding','binary')
    xhr.send( fData )
  }

  function onProgress(progress) {
    let elapsed     = performance.now() - start
    bytesCurr       = progress.loaded
    fw.upload[0]    = elapsed /10 /fw.pingsAndSeconds
    fw.vUploadMB[0] = ( bytesSent+bytesCurr ) /1024 /1024
    if( elapsed >= pCache ) {
      fw.vUpload[0]  = ( (bytesSent+bytesCurr-bytesDiscarded)/131072 ) / ( (elapsed-msDiscarded)/1000 )
      fw.vUploadCu[0]= fw.vUpload /8
    } else {
      bytesDiscarded = bytesCurr
      msDiscarded    = elapsed
    }
    if( fw.testRun==3 ) return xhr.abort()
    if( elapsed > fw.pingsAndSeconds*1000 ) { console.log('FINISH'); xhr.abort(); return fw.testRun[0]=2 }
  }

}

function uploadUsingFetchAPI_OnHold() {   // See comments on Fetch API status https://github.com/whatwg/fetch/issues/607
  rDat.status[0]= 6
  rDat.status[3]= 0

  var startUL = performance.now()
  var bytesSent = 0
  var bytesCurr = 0
  var msDiscarded = 0
  var bytesDiscarded = 0

  let size    = 1250   // 8*1250*1000 = 10MB  (Float64Array==8bytes, 1250 random float64 numbers, 1000 loops)
  let bigbig  = new Float64Array(size*1000)
  for( let i=0; i<size; ++i) bigbig[i]=Math.random()  // 1250*8 bytes of random garbage
  for( let i=0; i<1000; ++i) bigbig.copyWithin( size*i , 0, size)
  let gBlob = new Blob( bigbig )   // 10 MB upload file
  let fData = new FormData()
  fData.append( "gfile", gBlob )

  var controller = new FetchController();
  var signal = controller.signal;

  function doUpload() {
    fetch( fw.urlUpload(), { method:'POST',headers:{"Content-Type":"multipart/form-data" }, body:fData, signal, observer(o) {
        o.onrequestprogress=e=> {
          let elapsed= performance.now() - startUL
          bytesCurr= e.total
          rDat.status[5]= elapsed /10 /settings.tUpDown
          rDat.floats[7]= (bytesSent+e.total)/1024/1024
          if( elapsed >= settings.pCache ) {
            rDat.floats[5]= ((bytesSent+e.total-bytesDiscarded)/131072) /((elapsed-msDiscarded)/1000)
            rDat.floats[6]= rDat.floats[5]/8
          } else {
            bytesDiscarded= e.total
            msDiscarded= elapsed
          }
          if( rDat.status[0] == 2 ) controller.abort()
          if( elapsed > settings.tUpDown*1000 ) { controller.abort(); rDat.status[0]=1 }
        }
        o.onstatechange=e=> {
          if( o.state=='complete' ) {
            bytesSent+= bytesCurr
            if( elapsed > settings.tUpDown*1000 ) {
              rDat.status[0]=1
            } else {
              doUpload()
            }
          }
        }
      }
    }).catch( e=>console.log("Error uploading: "+e.err) )
  }
  doUpload()
}
