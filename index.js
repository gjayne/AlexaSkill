var http = require('http')

exports.handler = function (event, context) {

  try {

    if (event.session.new) {
      // New Session
      console.log("NEW SESSION")
    }

    switch (event.request.type) {

      case "LaunchRequest":
        // Launch Request
        console.log(`LAUNCH REQUEST`)
        context.succeed(
          generateResponse(
            buildSpeechletResponse("Welcome. To begin, say where is the bus", false),
            {}
          )
        )
        break;
        
    case "HelpIntent":
        console.log(`HELP REQUEST`)
        context.succeed(
          generateResponse(
            buildSpeechletResponse("You can ask for bus predictions in two ways. You can either ask when a particular bus arrives at a specific stop or you can ask for all of the buses that will arrive at a particular stop.", false),
            {}
          )
        )
        break;

      case "IntentRequest":
        // Intent Request
        console.log(`INTENT REQUEST`)

        switch(event.request.intent.name) {
            
        case "HelpIntent":
                console.log(`HELP REQUEST`)
                context.succeed(
                  generateResponse(
                    buildSpeechletResponse("You can ask for bus predictions in two ways. You can either ask when a particular bus arrives at a specific stop or you can ask for all of the buses that will arrive at a particular stop.", false),
                    {}
                  )
                )
        break;

        //**********************************************************
        //GetPrediction
        //Input: Two slot values, Buses and stopID
        //Output: Time of the specified bus at the specified stop
        //
        //**********************************************************
          case "GetPrediction":
        
            console.log("Slots: "+event.request.intent.slots.buses.value+", "+event.request.intent.slots.stopID.value)
              
            var endpoint = "http://webservices.nextbus.com/service/publicJSONFeed?";
            var path = "command=predictions&a=chapel-hill&stopId=3029&routeTag=U";
            var busSlot = event.request.intent.slots.buses.value.toString().toUpperCase()
            var stopSlot = event.request.intent.slots.stopID.value.toString()
            var url = "";
            var body = "";
            var alexaResponse = "There was an error while getting the current prediction, please check back later.";

            if(busSlot == 'NU'){
                  url = endpoint+"command=predictions&a=chapel-hill&stopID="+stopSlot+"&routeTag=NU";
            }
            else if(busSlot == 'U' || event.request.intent.slots.buses.value == 'YOU'){
                  url = endpoint+"command=predictions&a=chapel-hill&stopId="+stopSlot+"&routeTag=U";
            }
            else if(busSlot == 'RU'){
                //connor stop = 3381
                url = endpoint+"command=predictions&a=chapel-hill&stopId="+stopSlot+"&routeTag=RU";

            }
            else {
                context.succeed(
                  generateResponse(
                    buildSpeechletResponse("There was an error while getting the current prediction, please check back later." , true),
                    {}
                  )
                ) 
            }
                
            http.get(url, function(response)  {
              response.on('data', function(chunk) { body += chunk })
              response.on('end', function() {
                console.log("on end");
                var data = JSON.parse(body);
                console.log("Body: "+body);
                console.log("Data: "+data);
                if(data.hasOwnProperty('angencyTitle')){
                    console.log('has agency title')
                    var agency = data.predictions.agencyTitle;
                    console.log("Agency: "+agency);
                }
                else{
                    console.log('does not have agency title')
                }
                
                var routeTag = data.predictions.routeTag;
                var busTag = routeTag.split('',2);
                var busName = "";
                for(var i = 0; i < busTag.length;i++){
                    console.log("i = "+i+" busTag: "+busTag[i]);
                    if(i == busTag.length-1){
                        busName += busTag[i];
                    }
                    else {
                         busName += busTag[i]+" ";
                    }
                }
                console.log("RouteTag: "+routeTag);
                if(data.predictions.direction.prediction.length >= 1){
                     var firstTime = data.predictions.direction.prediction[0].minutes;
                     alexaResponse = "The "+busName+" will be at Mangum Hall on Raleigh Street in "+firstTime+" minutes"
                }
                else {
                    alexaResponse = "There is no current prediction"
                }
                if(data.predictions.direction.prediction.length >= 2){
                    var secondTime = data.predictions.direction.prediction[1].minutes;
                    alexaResponse += "and then "+secondTime+" minutes."
                }
               context.succeed(
                  generateResponse(
                    buildSpeechletResponse(alexaResponse , true),
                    {}
                  )
                )  
              })
            })
              
            break;
            
            
        //*****************************************************
        //GetPredictoinByStop
        //Input: Bus Stop ID
        //Output: List of buses arriving at the specified bus stop and thier predictions
        //
        //******************************************************
        
        case 'GetPredictionByStop':
            console.log("GetPredictionByStop")
            var stopID = event.request.intent.slots.stopID.value.toString()
            var stopURL = 'http://webservices.nextbus.com/service/publicJSONFeed?command=predictions&a=chapel-hill&stopId='+stopID
            var responseByStop = 'Buses arriving at '
            var index = 0;
            
            
             http.get(stopURL, function(response)  {
              response.on('data', function(chunk)  { body += chunk })
              response.on('end', function()  {
                console.log("on end");

                var stopData = JSON.parse(body.substr(9));
                console.log("Body: "+body.substr(9));

                console.log("Data: "+stopData);
                
                console.log("Num of Buses on Route: "+stopData.predictions.length)
                console.log('direction' in stopData.predictions[0])
                console.log('direction' in stopData.predictions[1])
                console.log('direction' in stopData.predictions[2])
                console.log("Mintes: "+stopData.predictions[1].direction.prediction[0].minutes)
                
                responseByStop += stopData.predictions[0].stopTitle+": the "
                
                for(var i = 0; i < stopData.predictions.length; i++){
                    if('direction' in stopData.predictions[i]) {
                        responseByStop += stopData.predictions[i].routeTitle+' will arrive in '+stopData.predictions[i].direction.prediction[0].minutes+' minutes'
                    
                        if(i < stopData.predictions.length-2){
                            responseByStop += ", the "
                        }
                        if(i == stopData.predictions.length-2){
                            responseByStop += " and the "
                        }
                    }
                }
                
               context.succeed(
                  generateResponse(
                    buildSpeechletResponse(responseByStop , true),
                    {}
                  )
                )  
              })
            })
            break;

          default:
            throw "Invalid intent"
        }
        break;
        
      case "SessionEndedRequest":
        // Session Ended Request
        console.log(`SESSION ENDED REQUEST`)
        break;

      default:
        context.fail(`INVALID REQUEST TYPE: ${event.request.type}`)

    }

  } catch(error) { context.fail(`Exception: ${error}`) }

}

// Helpers

stopLookUp = function (route, stop){
    if(route == 'Ru'){
        switch (stop){
            case "connor hall":
                return '3381'
                break;
            case 'hinton james':
                return '3227'
                break;
            case 'ehringhaus':
                return '3161'
            case 'lewis':
                return '3028';
            case 'craige':
                return '3160';
            default:
            
        }  
    }
    else if(route == 'u' || route == 'Nu'){
        
    }
    else return null;
    
}

stopRequest = function (route, stop){
    
    if(route != 'U' || route != 'RU' || route != 'NU'){
        return 'invalid bus'
    }
    
    var routeConfigURL = 'http://webservices.nextbus.com/service/publicJSONFeed?command=routeConfig&a=chapel-hill&r='+route.toUpperCase()
    
    http.get(routeConfigURL, function(response)  {
              response.on('data', function(chunk)  { body += chunk })
              response.on('end', function()  {
                
                var data = JSON.parse(body);
                console.log("Body: "+body);
                console.log("Data: "+data);
                //var agency = data.predictions.agencyTitle;
               console.log("Route.stop - "+data.route.stop)
              })
            })
}

buildSpeechletResponse = (outputText, shouldEndSession) => {

  return {
    outputSpeech: {
      type: "PlainText",
      text: outputText
    },
    shouldEndSession: shouldEndSession
  }

}

generateResponse = (speechletResponse, sessionAttributes) => {

  return {
    version: "1.0",
    sessionAttributes: sessionAttributes,
    response: speechletResponse
  }

}