var map;

function init() {
    
    // create map and set center and zoom level
    var map = L.map('mapid', {
        center: [38,-96],
        minZoom: 5,
        maxZoom: 10,
        zoom: 5
    });
    
    // Iowa Mesonet WMS - Channel 2 Visible Satellite (GOES-19)
    var satelliteCh02 = L.tileLayer.wms('https://mesonet.agron.iastate.edu/cgi-bin/wms/goes_east.cgi', {
        layers: 'conus_ch02',
        format: 'image/png',
        transparent: true
    }).addTo(map);
    
    var satelliteCh07 = L.tileLayer.wms('https://mesonet.agron.iastate.edu/cgi-bin/wms/goes_east.cgi', {
        layers: 'conus_ch07',
        format: 'image/png',
        transparent: true
   });

    // define basemaps, empty overlays, and add layer switcher control
    var basemaps = {
        "GOES-19 Channel 2: Visible (red)": satelliteCh02,
        "GOES-19 Channel 7: Shortwave IR": satelliteCh07
    };

    var overlays = {};
    var layerControl = L.control.layers(basemaps,overlays).addTo(map);

    // NWS Alerts
    // Currently does not show countywide alerts, only polygons
    var nwsAlertsAPI = 'https://api.weather.gov/alerts/active';
    var nwsAlerts;
    $.getJSON(nwsAlertsAPI, function(data) {
       nwsAlerts =  L.geoJSON(data, {
           style: function(feature) {
                var alertColor = 'purple';
                var alertWeight = 1;
                switch (feature.properties.event) {
                    case 'Severe Thunderstorm Warning': return {color: "#FFA500", weight: 3};
                    case 'Tornado Warning': return {color: "#FF0000", weight: 3};
                    case 'Extreme Wind Warning': return {color: "#FF8C00", weight: 3};
                    case 'Special Marine Warning': return  {color: "#FFA500", weight: 2};
                    case 'Flash Flood Warning': return {color: "#8B0000", weight: 2};
                    case 'Flood Warning': return {color: "#00FF00"};
                    case 'Flood Advisory': return {color: "#00FF7F"};
                    case 'Snow Squall Warning': return {color: "#C71585"};
                    case 'Dust Storm Warning': return {color: "#FFE4C4"};
                    case 'Dust Advisory': return {color: "#BDB76B"};
                    case 'Marine Weather Statement': return {color: "#FFDAB9"};
                }
                return {color: alertColor, weight: alertWeight};
            },
            // Popup for each feature. Alert name and headline
            onEachFeature: function(feature,layer) {
                var props = feature.properties;
                layer.bindPopup(`<strong>${props.event}</strong><br>${props.headline}`);
            }
        }).addTo(map);
        layerControl.addOverlay(nwsAlerts, "NWS Alerts");
    });

    // Storm Prediction Center Day 1 Categorical Outlook
    var spcCategorical = L.esri.featureLayer({
        url: 'https://mapservices.weather.noaa.gov/vector/rest/services/outlooks/SPC_wx_outlks/FeatureServer/1',
        style: function(feature) {
            var outlookColor = 'gray'; // if unknown
            switch (feature.properties.dn) {
                case 2: return {color: "#c0e8c0"};
                case 3:  return {color: "#7fc57f"};
                case 4: return {color: "#f6f67f"};
                case 5: return {color: "#e6c27f"};
                case 6: return {color: "#e67f7f"};
                case 8: return {color: "#ff7fff"};
            }
            return {color: outlookColor};
        },
        onEachFeature: function(feature,layer) {
            var content = '';
            switch (feature.properties.dn) {
                case 2: 
                    content = '<strong>General Thunderstorm Risk</strong>';
                    break;
                case 3:
                    content = '<strong>Marginal Risk</strong>';
                    break;
                case 4:
                    content = '<strong>Slight Risk</strong>';
                    break;
                case 5:
                    content = '<strong>Enhanced Risk</strong>';
                    break;
                case 6:
                    content = '<strong>Moderate Risk</strong>';
                    break;
                case 8:
                    content = '<strong>High Risk</strong>';
            }
            layer.bindPopup(`Risk Level: ${content}`);
        }
    });
    layerControl.addOverlay(spcCategorical, "SPC Day 1 Categorical Outlook");
    
    // Nexrad radar from Iowa State Mesonet
    var nwsRadar = L.tileLayer.wms('https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0r.cgi', {
        layers: 'nexrad-n0r',
        format: 'image/png',
        transparent: true
    }).addTo(map);
    layerControl.addOverlay(nwsRadar, "National Weather Service Radar");
    
    // United States basemap from AWS S3    
    //var usBasemap = L.tileLayer('https://geog585-a29bg72.s3.us-east-2.amazonaws.com/USBasemap3/{z}/{x}/{y}.png'); 
    //layerControl.addOverlay(usBasemap, "Custom US Basemap");

    // Styles for the US States and US Counties geoJSON
    function usStatesStyle(feature) {
        return {
            color: "#1f78b4",
            weight: 3.25,
            fill: false
        };
    }

    function usCountiesStyle(feature) {
        return {
            color: "#232323",
            weight: 0.98,
            fill: false
        };
    }

    // US Counties geoJSON
    var usCounties = new L.geoJSON(usCountiesJson, {
        style: usCountiesStyle
    }).addTo(map);
    layerControl.addOverlay(usCounties, "US Counties");

    // US States geoJSON
    var usStates = new L.geoJSON(usStatesJson, {
        style: usStatesStyle
    }).addTo(map);
    layerControl.addOverlay(usStates, "US States");

    // variables for airports features for selection
    var airportsLayer;
    var selection;
    var selectedLayer;
    
    // create icons for airports (selected and unselected)
    var airportsIcon = L.icon({
        iconUrl: '/images/airport.svg',
        iconSize: [20,20]
    });
    
    // handle click events on airport features
    function airportsOnEachFeature(feature, layer) {
        layer.on({
            click: function(e) {
                if (selection) {
                    resetStyles();
                }
                
                e.target.setIcon(selectedAirportsIcon);
                selection = e.target;
                selectedLayer = airportsLayer;
                
                // Insert some HTML with the feature name
                buildSummaryLabel(feature);
                
                L.DomEvent.stopPropagation(e); // stop click event from being propogated further
            }
        });
    }
    
    // add the airports GeoJSON layer using the airportsData variable from us_airports.js
    airportsLayer = new L.geoJSON(airportsData, {
        pointToLayer: function (feature, latlng) {
            return L.marker(latlng, {icon: airportsIcon});
        },
        onEachFeature: airportsOnEachFeature
    }).addTo(map);
    layerControl.addOverlay(airportsLayer, "US Airports");
    
    var selectedAirportsIcon = L.icon({
        iconUrl: '/images/airport_selected.svg',
        iconSize: [40,40]
    });

    // Labels for towns and cities
    var townCityLabels = L.tileLayer('https://geog585-a29bg72.s3.us-east-2.amazonaws.com/townscitieslabels/{z}/{x}/{y}.png').addTo(map);
    layerControl.addOverlay(townCityLabels, "Place Names");
    
    // handle clicks on the map that don't hit a feature
    map.addEventListener('click', function(e) {
        if (selection) {
            resetStyles();
            selection = null; 
            document.getElementById('summaryLabel').innerHTML = '<p>Click an airport on the map to get more information.</p>';
        }
    });
    
    // function to set the old selected feature back to its original symbol. Used when the map or a feature is clicked.
    function resetStyles() {
        selection.setIcon(airportsIcon);
    }
    
    // function to build the HTML summary for the summary label using the selected feature's "name" property
    function buildSummaryLabel(currentFeature) {
        var featureName = currentFeature.properties.name_en || "Unnamed feature";
        var ident = currentFeature.properties.gps_code;
        var wiki = currentFeature.properties.wikipedia;
        var type = currentFeature.properties.type;
        var keys = Object.keys(currentFeature);
        type = type.charAt(0).toUpperCase() + type.slice(1);
        document.getElementById('summaryLabel').innerHTML = '<table cellpadding:"0" cellspacing:"0"><tr><th>Name</th><th>Identification</th><th>Type</th><th>Wikipedia</th></tr><tr><td>'+featureName+'</td><td>'+ident+'</td><td>'+type+'</td><td><a href="' + wiki +'" target="_blank">'+wiki+'</a></td></tr></table>';
    }

    // add a scale to the map
    L.control.scale().addTo(map);

    // define event handler function for click events and register it
    function Identify(e)
    {
        // set parameters needed for GetFeatureInfo WMS request
        var sw = map.options.crs.project(map.getBounds().getSouthWest());
        var ne = map.options.crs.project(map.getBounds().getNorthEast());
        var BBOX = sw.x + "," + sw.y + "," + ne.x + "," + ne.y;
        var WIDTH = map.getSize().x;
        var HEIGHT = map.getSize().y;

        var X = Math.trunc(map.layerPointToContainerPoint(e.layerPoint).x);
        var Y = Math.trunc(map.layerPointToContainerPoint(e.layerPoint).y);

        // compose the URL for the request for the NWS Alerts
        var URL = 'http://localhost:8080/geoserver/GEOG585/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetFeatureInfo&Layers=GEOG585:NWSAlerts&QUERY_LAYERS=GEOG585:NWSAlerts&BBOX='+BBOX+'&FEATURE_COUNT=1&HEIGHT='+HEIGHT+'&WIDTH='+WIDTH+'&INFO_FORMAT=application%2Fjson&TILED=false&CRS=EPSG%3A3857&I='+X+'&J='+Y;

        //send GetFeatureInfo as asynchronous HTTP request using jQuery $.ajax
        $.ajax({
            url: URL,
            dataType: "json",
            type: "GET",
            success: function(data)
            {
                if(data.features.length !== 0) {  // at least one feature returned in response
                    var returnedFeature = data.features[0]; // first feature from response
                    var alertName = returnedFeature.properties.PROD_TYPE;
                    var alertStart = returnedFeature.properties.ONSET;
                    var alertEnd = returnedFeature.properties.EXPIRATION;

                   // Set up popup for clicked feature and open it
                   var popup = new L.Popup({
                     maxWidth: 300
                   });

                   popup.setContent("<b>" + alertName + "</b><br />" + "Valid: " + alertStart + "<br> Expires: " + alertEnd);
                   popup.setLatLng(e.latlng);
                   map.openPopup(popup);                            
                }
            }
        });
    }
    map.addEventListener('click', Identify);
}
