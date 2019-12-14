const axios = require('axios');
const http = require('http');

const coverageCeiling=process.env.COVERAGE_CEILING;
const coverageGateId=process.env.GATE_ID_COVERAGE;
const port = process.env.GUEST_PORT;
const sonarHost = process.env.SONAR_HOST;
const sonarPassword = process.env.SONAR_PASSWORD;
const sonarPort = process.env.SONAR_PORT;
const sonarUser = process.env.SONAR_USERNAME;

const updateCoverage = (value) => {
     const postData = "id=" + coverageGateId + "&metric=coverage&error="+ Math.floor(value) + "&op=LT"
     const postUrl = 'http://' + sonarHost + ':' + sonarPort + '/api/qualitygates/update_condition'
     axios({
        method: "POST",
        url: postUrl,
        data: postData,
        auth: {
            username: "admin",
            password: "admin"
        }
     })
         .then((res) => {
             console.log(`Status: ${res.status}`);
             console.log('Body: ', res.data);
         }).catch((err) => {
             console.error(err);
         });
}

const reviewMetric = (metric) => {
     if (metric.status == 'ERROR'){
         console.log ("------->FAILURE<------");
         console.log (metric);
     }
     if (metric.metric == 'coverage' && Number(metric.value) > metric.errorThreshold){
        updateCoverage(metric.value < coverageCeiling ? metric.value : coverageCeiling);
     }
}

const requestHandler = (request, response) => {
    const chunks = [];
    request.on('data', chunk => chunks.push(chunk));
    request.on('end', () => {
      const data = Buffer.concat(chunks);
      obj = JSON.parse(data);
      console.log("run:" + obj.analysedAt);

      for ( var i = 0; i < obj.qualityGate.conditions.length; i++) {
        reviewMetric(obj.qualityGate.conditions[i]);
      }
    })
  response.end('DONE')
}

const server = http.createServer(requestHandler)
server.listen(port, (err) => {
  if (err) {
    return console.log('something bad happened', err)
  }
  var os = require('os');
  var interfaces = os.networkInterfaces();
  var addresses = [];
  for (var k in interfaces) {
      for (var k2 in interfaces[k]) {
          var address = interfaces[k][k2];
          if (address.family === 'IPv4' && !address.internal) {
              addresses.push(address.address);
          }
      }
  }
  console.log(`server (${addresses}) is listening on ${port}`)
})