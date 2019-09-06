const express = require('express')
const app = express()
const http = require('http')
const server = http.createServer(app)
const router = express.Router();
const io = require('socket.io').listen(server);

router.get('/',function(req,res){
  res.send('Hello World! Master');
});

var publicDir = require('path').join(__dirname,'/public');
app.use(express.static(publicDir));
//add the router
app.use('/', router);
server.listen(3000);

const axios = require('axios');
var formidable = require('formidable');

const winston = require('winston');
require('winston-daily-rotate-file');
const { createLogger, format, transports } = require('winston');
const fs = require('fs');
const path = require('path');
const logDir = 'logs';

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const loggerAgent = createLogger({
  // change level if in dev environment versus production
  level: 'info',
  format: format.combine(
    format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
  ),
  transports: [
    new transports.Console({
      level: 'info',
      format: format.combine(
        format.colorize(),
        format.printf(
          info => `${info.timestamp} ${info.level}: ${info.message}`
        )
      )
    }),
    new (winston.transports.DailyRotateFile)({
	    filename: 'logs/%DATE%-new_agents.log',
	    datePattern: 'YYYY-MM-DD',
	    zippedArchive: true,
	    maxSize: '20m',
	    maxFiles: '14d'
	})
  ]
});

const loggerReguest = createLogger({
  // change level if in dev environment versus production
  level: 'info',
  format: format.combine(
    format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
  ),
  transports: [
    new transports.Console({
      level: 'info',
      format: format.combine(
        format.colorize(),
        format.printf(
          info => `${info.timestamp} ${info.level}: ${info.message}`
        )
      )
    }),
    new (winston.transports.DailyRotateFile)({
	    filename: 'logs/%DATE%-info_reguests.log',
	    datePattern: 'YYYY-MM-DD',
	    zippedArchive: true,
	    maxSize: '20m',
	    maxFiles: '14d'
	})
  ]
});

io.sockets.on('connection', function (socket) {
  socket.on('new agent', function (data) {
    // console.log(data);
    loggerAgent.info(data.userAgent + ' - New connection')
  });
  socket.on('info reguests', function (data) {

    loggerReguest.info(data.userAgent + ' - New RAW: '+data.raw);

    console.log(data.json, data.json.query);

    axios.get('https://www.googleapis.com/customsearch/v1', {
      params: {
        key: 'AIzaSyBw1C4UJ6Suyrvb2Y-FQWT8C1kzEsWum4c',
        cx:'017576662512468239146:omuauf_lfve',
        q: data.json.query
      }
    })
    .then(function (response) {
      console.log(response.data.searchInformation);

      let infoSerch = response.data.searchInformation;

      loggerReguest.info(data.userAgent + ' - New JSON: '+JSON.stringify(data.json)+', About '+infoSerch.formattedTotalResults+' results.')
      
       socket.emit('info search', infoSerch);

    })
    .catch(function (error) {
      console.log(error);
    })

  });


  socket.on('slice upload', function (msg) {
    console.log('UPLOAD')
    console.log(msg)
        var base64Data = decodeBase64Image(msg.imageData);
        fs.writeFile(__dirname + "/public/images/" + msg.imageName, base64Data.data, function (err) {
            if (err) {
                console.log('ERROR:: ' + err);
                throw err;
            }else{
              loggerReguest.info(msg.userAgent + ' - New Image: http://localhost:3000/images/' + msg.imageName +' (public link)');
              socket.emit('end upload', "http://localhost:3000/images/" + msg.imageName);
            }
        });
    });

  socket.on('disconnect', function () {
    console.log('Agent disconnected');
  });
});


//TODO: function to decode base64 to binary
function decodeBase64Image(dataString) {
    var matches = dataString.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/),
        response = {};
    if (matches.length !== 3) {
        return new Error('Invalid input string');
    }
    response.type = matches[1];
    response.data = new Buffer(matches[2], 'base64');
    return response;
}